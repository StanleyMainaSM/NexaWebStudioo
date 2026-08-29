do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'avelixa-connector-provisioning';

  if v_job_id is null then
    perform cron.schedule(
      'avelixa-connector-provisioning',
      '* * * * *',
      $job$
      select net.http_post(
        url := 'https://uhbyruktnhktjeuqsqut.supabase.co/functions/v1/avelixa-connector-provisioner-prod',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'avelixa_automation_secret'
            limit 1
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
      );
      $job$
    );
  else
    perform cron.alter_job(
      job_id := v_job_id,
      schedule := '* * * * *',
      command := $job$
      select net.http_post(
        url := 'https://uhbyruktnhktjeuqsqut.supabase.co/functions/v1/avelixa-connector-provisioner-prod',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'avelixa_automation_secret'
            limit 1
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
      );
      $job$,
      active := true
    );
  end if;
end $$;

revoke execute on function private.queue_connector_provisioning() from public, anon, authenticated;
revoke execute on function private.mark_connector_provisioning_completed(uuid, uuid) from public, anon, authenticated;

create or replace function public.submit_connector_application(
  p_full_name text,
  p_phone text,
  p_email text,
  p_national_id text,
  p_county text,
  p_town text,
  p_referring_connector text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_referrer uuid;
  v_email text := lower(trim(p_email));
begin
  if nullif(trim(p_full_name), '') is null
     or nullif(trim(p_phone), '') is null
     or nullif(v_email, '') is null
     or nullif(trim(p_national_id), '') is null
     or nullif(trim(p_county), '') is null
     or nullif(trim(p_town), '') is null then
    raise exception 'Please complete all required application fields.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 847291));

  if exists (
    select 1
    from public.connector_applications ca
    where lower(trim(ca.email)) = v_email
      and ca.status in ('pending', 'approved')
  ) then
    raise exception using
      errcode = '23505',
      message = 'An active Connector application already exists for this email address.';
  end if;

  if p_referring_connector is not null
     and nullif(trim(p_referring_connector), '') is not null then
    select cp.user_id into v_referrer
    from public.connector_profiles cp
    join public.user_roles ur
      on ur.user_id = cp.user_id
     and ur.role = 'connector'
    where upper(cp.avl_id) = upper(trim(p_referring_connector))
      and cp.is_active = true
    limit 1;

    if v_referrer is null then
      raise exception 'The referring Connector ID was not found or is inactive.';
    end if;
  end if;

  insert into public.connector_applications (
    full_name,
    email,
    phone,
    national_id_secure,
    county,
    town,
    referring_connector_id,
    status
  )
  values (
    trim(p_full_name),
    v_email,
    trim(p_phone),
    trim(p_national_id),
    trim(p_county),
    trim(p_town),
    v_referrer,
    'pending'
  )
  returning id into v_id;

  return v_id;
end;
$function$;
