-- Add bounded retry scheduling for Web Push delivery failures.
-- The existing message notification row remains the durable source event.
-- Push failure must never affect message persistence or in-app unread state.

alter table public.push_deliveries
  add column if not exists next_attempt_at timestamptz;

alter table public.push_deliveries
  add column if not exists provider_accepted_at timestamptz;

alter table public.push_deliveries
  alter column attempts set default 0;

alter table public.push_deliveries
  drop constraint if exists push_deliveries_status_check;

update public.push_deliveries set status = 'accepted' where status = 'sent';

alter table public.push_deliveries
  add constraint push_deliveries_status_check
  check (status = any (array['pending'::text, 'processing'::text, 'accepted'::text, 'failed'::text]));

create index if not exists push_deliveries_retry_due_idx
  on public.push_deliveries (next_attempt_at)
  where status = 'failed' and next_attempt_at is not null;

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
