-- Add bounded retry scheduling for Web Push delivery failures.
-- The existing message notification row remains the durable source event.
-- Push failure must never affect message persistence or in-app unread state.

alter table public.push_deliveries
  add column if not exists next_attempt_at timestamptz;

alter table public.push_deliveries
  alter column attempts set default 0;

alter table public.push_deliveries
  drop constraint if exists push_deliveries_status_check;

alter table public.push_deliveries
  add constraint push_deliveries_status_check
  check (status = any (array['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text]));

create index if not exists push_deliveries_retry_due_idx
  on public.push_deliveries (next_attempt_at)
  where status = 'failed' and next_attempt_at is not null;

-- Replace any prior copy of the named job without touching other cron jobs.
do $migration$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'avelixa-push-retry'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'avelixa-push-retry',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://uhbyruktnhktjeuqsqut.supabase.co/functions/v1/avelixa-push-worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-avelixa-push-secret',
          (select decrypted_secret from vault.decrypted_secrets where name = 'avelixa_push_webhook_secret' limit 1)
        ),
        body := jsonb_build_object('notification_id', n.id)
      )
      from public.notifications n
      where exists (
        select 1
        from public.push_deliveries d
        where d.notification_id = n.id
          and d.status = 'failed'
          and d.attempts < 5
          and d.next_attempt_at is not null
          and d.next_attempt_at <= now()
      )
      and exists (
        select 1
        from vault.decrypted_secrets s
        where s.name = 'avelixa_push_webhook_secret'
          and s.decrypted_secret is not null
      );
    $job$
  );
end;
$migration$;
