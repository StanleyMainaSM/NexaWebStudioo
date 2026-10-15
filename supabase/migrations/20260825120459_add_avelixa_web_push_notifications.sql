-- Reconcile the repository migration history with the already-deployed
-- Avelixa Web Push schema. Production already has these objects; IF NOT EXISTS
-- and DROP/CREATE trigger patterns make this migration safe to replay there.
create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_id_endpoint_key unique (user_id, endpoint)
);

create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending'
    check (status = any (array['pending'::text, 'sent'::text, 'failed'::text])),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_deliveries_notification_id_subscription_id_key
    unique (notification_id, subscription_id)
);

create table if not exists public.push_dispatch_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  status text not null default 'pending'
    check (status = any (array['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text])),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_dispatch_queue_due_idx
  on public.push_dispatch_queue(next_attempt_at)
  where status = 'pending';

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);
create index if not exists push_deliveries_notification_id_idx
  on public.push_deliveries(notification_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
alter table public.push_dispatch_queue enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own
  on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
revoke all on table public.push_deliveries, public.push_dispatch_queue from anon, authenticated;
grant all on table public.push_subscriptions, public.push_deliveries, public.push_dispatch_queue to service_role;

create or replace function public.get_push_worker_secret()
returns text
language sql
security definer
set search_path to ''
as $function$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'avelixa_push_webhook_secret'
  limit 1;
$function$;

create or replace function public.get_push_worker_config(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  expected_secret text;
  vapid_config jsonb;
begin
  select decrypted_secret into expected_secret
  from vault.decrypted_secrets
  where name = 'avelixa_push_webhook_secret'
  limit 1;

  if expected_secret is null or p_secret is distinct from expected_secret then
    raise exception 'Unauthorized';
  end if;

  select decrypted_secret::jsonb into vapid_config
  from vault.decrypted_secrets
  where name = 'avelixa_vapid_keys'
  limit 1;

  return jsonb_build_object('vapid', vapid_config, 'contact', 'mailto:admin@avelixa.co.ke');
end;
$function$;

create or replace function public.save_push_vapid_keys(p_secret text, p_vapid jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  expected_secret text;
begin
  select decrypted_secret into expected_secret
  from vault.decrypted_secrets
  where name = 'avelixa_push_webhook_secret'
  limit 1;

  if expected_secret is null or p_secret is distinct from expected_secret then
    raise exception 'Unauthorized';
  end if;
  if p_vapid is null or not (p_vapid ? 'publicKey') or not (p_vapid ? 'privateKey') then
    raise exception 'Invalid VAPID configuration';
  end if;
  if exists (select 1 from vault.decrypted_secrets where name = 'avelixa_vapid_keys') then
    return;
  end if;

  perform vault.create_secret(
    p_vapid::text,
    'avelixa_vapid_keys',
    'Encrypted Web Push VAPID JWK key pair for Avelixa.'
  );
end;
$function$;

revoke all on function public.get_push_worker_secret() from public, anon, authenticated;
grant execute on function public.get_push_worker_secret() to service_role;
revoke all on function public.get_push_worker_config(text) from public, anon, authenticated;
grant execute on function public.get_push_worker_config(text) to service_role;
revoke all on function public.save_push_vapid_keys(text, jsonb) from public, anon, authenticated;
grant execute on function public.save_push_vapid_keys(text, jsonb) to service_role;

create or replace function public.trigger_avelixa_push_worker()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  webhook_secret text;
begin
  insert into public.push_dispatch_queue(notification_id, status, attempts, next_attempt_at)
  values (new.id, 'pending', 0, now())
  on conflict (notification_id) do nothing;

  if new.user_id is null then
    update public.push_dispatch_queue
      set status = 'processed', next_attempt_at = null, updated_at = now()
      where notification_id = new.id;
    return new;
  end if;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'avelixa_push_webhook_secret'
  limit 1;

  -- A local/test environment without the production secret still stores the
  -- notification normally; push is simply not dispatched there.
  if webhook_secret is null then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://uhbyruktnhktjeuqsqut.supabase.co/functions/v1/avelixa-push-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-avelixa-push-secret', webhook_secret
      ),
      body := jsonb_build_object('notification_id', new.id)
    );
  exception when others then
    -- The durable queue row remains pending for the scheduled retry worker.
    null;
  end;

  return new;
end;
$function$;

revoke all on function public.trigger_avelixa_push_worker() from public, anon, authenticated;

drop trigger if exists avelixa_push_worker_on_notification on public.notifications;
create trigger avelixa_push_worker_on_notification
  after insert on public.notifications
  for each row execute function public.trigger_avelixa_push_worker();
