-- Avelixa: prevent automatic Connector provisioning from converting an
-- existing non-Connector account. New applicants with no Auth account remain
-- eligible for the normal provisioning worker. Existing Connector accounts
-- remain compatible with the existing sync/reconciliation trigger.

create or replace function private.guard_connector_provisioning_queue()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
declare
  v_email text;
  v_auth_user_id uuid;
  v_has_connector boolean;
  v_has_other_role boolean;
  v_has_connector_profile boolean;
begin
  if new.application_id is null then
    return new;
  end if;

  select ca.email
    into v_email
  from public.connector_applications ca
  where ca.id = new.application_id;

  if v_email is null then
    return new;
  end if;

  select u.id
    into v_auth_user_id
  from auth.users u
  where lower(u.email) = lower(v_email)
  order by u.created_at asc
  limit 1;

  if v_auth_user_id is null then
    return new;
  end if;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_auth_user_id and ur.role = 'connector'
  ) into v_has_connector;

  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_auth_user_id
      and ur.role in ('owner', 'admin', 'operator', 'client')
  ) into v_has_other_role;

  select exists (
    select 1 from public.connector_profiles cp
    where cp.user_id = v_auth_user_id
  ) into v_has_connector_profile;

  if v_has_connector and v_has_connector_profile then
    return new;
  end if;

  if v_has_other_role or not v_has_connector then
    update public.connector_applications
    set provisioning_status = 'failed',
        provisioning_error = 'Manual review required: an existing Auth account matches this email but is not an established Connector account. Automatic Connector assignment is prohibited.',
        updated_at = now()
    where id = new.application_id
      and provisioning_status <> 'completed';

    insert into public.connector_provisioning_events(application_id, event_type, user_id, payload)
    values (
      new.application_id,
      'provisioning_manual_review_required',
      v_auth_user_id,
      jsonb_build_object(
        'reason', 'existing_incompatible_auth_account',
        'automatic_connector_assignment', false
      )
    );

    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists connector_provisioning_queue_existing_account_guard
  on public.connector_provisioning_queue;

create trigger connector_provisioning_queue_existing_account_guard
before insert on public.connector_provisioning_queue
for each row
execute function private.guard_connector_provisioning_queue();

-- The newer approval queue trigger is the canonical queue creator. The older
-- duplicate queue trigger is removed; the separate sync trigger remains because
-- it has a distinct purpose: reconciling an already-established Connector.
drop trigger if exists trg_avelixa_connector_provisioning
  on public.connector_applications;
