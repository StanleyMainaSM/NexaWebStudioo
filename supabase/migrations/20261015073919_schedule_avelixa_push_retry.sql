-- Install the scheduled retry job separately so the matching Edge Function
-- can be deployed between schema changes and recurring dispatch activation.
-- The job is idempotently replaced by name and sends only through the trusted
-- server-side worker; no secret is embedded in this migration.

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
      where (
        exists (
          select 1
          from public.push_dispatch_queue q
          where q.notification_id = n.id
            and q.attempts < 5
            and (
              (q.status = 'pending'
                and q.next_attempt_at is not null
                and q.next_attempt_at <= now())
              or (q.status = 'processing'
                and q.updated_at <= now() - interval '5 minutes')
            )
        )
        or exists (
          select 1
          from public.push_deliveries d
          where d.notification_id = n.id
            and d.attempts < 5
            and (
              (d.status = 'failed'
                and d.next_attempt_at is not null
                and d.next_attempt_at <= now())
              or (d.status = 'processing'
                and d.updated_at <= now() - interval '5 minutes')
            )
        )
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
