-- Add bounded retry scheduling for Web Push delivery failures.
-- The original production baseline predates the durable outbox. Create it
-- here as well because that baseline version is already recorded remotely.
create table if not exists public.push_dispatch_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  status text not null default 'pending'
    check (status = any (array['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text])),
  attempts integer not null default 0,
  next_attempt_at timestamptz default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_dispatch_queue_due_idx
  on public.push_dispatch_queue(next_attempt_at)
  where status = 'pending';

alter table public.push_dispatch_queue enable row level security;
revoke all on table public.push_dispatch_queue from anon, authenticated;
grant all on table public.push_dispatch_queue to service_role;

-- The existing message notification row remains the durable source event.
-- Push failure must never affect message persistence or in-app unread state.

alter table public.push_deliveries
  add column if not exists next_attempt_at timestamptz;

alter table public.push_deliveries
  add column if not exists provider_accepted_at timestamptz;

alter table public.push_deliveries
  alter column attempts set default 0;

alter table public.push_deliveries
  alter column subscription_id drop not null;

alter table public.push_deliveries
  drop constraint if exists push_deliveries_subscription_id_fkey;

alter table public.push_deliveries
  add constraint push_deliveries_subscription_id_fkey
  foreign key (subscription_id) references public.push_subscriptions(id) on delete set null;

alter table public.push_deliveries
  drop constraint if exists push_deliveries_status_check;

update public.push_deliveries
  set provider_accepted_at = sent_at
  where status = 'sent' and sent_at is not null and provider_accepted_at is null;

-- Keep the legacy 'sent' value valid during the short schema/Edge Function
-- rollout window; it means the provider accepted the request, not that a
-- device displayed it. The new worker writes the clearer 'accepted' status.
alter table public.push_deliveries
  add constraint push_deliveries_status_check
  check (status = any (array['pending'::text, 'processing'::text, 'accepted'::text, 'sent'::text, 'failed'::text]));

create index if not exists push_deliveries_retry_due_idx
  on public.push_deliveries (next_attempt_at)
  where status = 'failed' and next_attempt_at is not null;

-- Persist every notification as a durable outbox event before attempting
-- the asynchronous HTTP request. A temporary pg_net enqueue error must not
-- abort the message transaction; the scheduled worker will retry the row.
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
    null;
  end;

  return new;
end;
$function$;

revoke all on function public.trigger_avelixa_push_worker() from public, anon, authenticated;

-- The Edge Function uses the service-role client to read these secrets; browser
-- roles must never be able to call a secret-returning SECURITY DEFINER function.
revoke all on function public.get_push_worker_secret() from public, anon, authenticated;
grant execute on function public.get_push_worker_secret() to service_role;
revoke all on function public.get_push_worker_config(text) from public, anon, authenticated;
grant execute on function public.get_push_worker_config(text) to service_role;
revoke all on function public.save_push_vapid_keys(text, jsonb) from public, anon, authenticated;
grant execute on function public.save_push_vapid_keys(text, jsonb) to service_role;

-- Bind each browser endpoint to the currently authenticated user only.
-- If the same browser signs into another Avelixa account, transfer its own
-- browser-generated endpoint instead of leaving the old account subscribed.
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_expiration_time timestamptz default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_endpoint is null or length(p_endpoint) > 4096
     or p_endpoint !~ '^https://'
     or p_p256dh is null or length(p_p256dh) > 512
     or p_auth is null or length(p_auth) > 512 then
    raise exception 'Invalid push subscription';
  end if;

  delete from public.push_subscriptions
  where endpoint = p_endpoint
    and user_id <> current_user_id;

  insert into public.push_subscriptions (
    user_id, endpoint, p256dh, auth, expiration_time, user_agent, updated_at
  ) values (
    current_user_id, p_endpoint, p_p256dh, p_auth, p_expiration_time,
    left(coalesce(p_user_agent, ''), 512), now()
  )
  on conflict (user_id, endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    expiration_time = excluded.expiration_time,
    user_agent = excluded.user_agent,
    updated_at = now();
end;
$function$;

revoke all on function public.register_push_subscription(text, text, text, timestamptz, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, timestamptz, text) to authenticated;
