-- Avelixa: enforce the conflict target used by existing role upserts.
-- Existing duplicate rows are removed conservatively before the unique index.
-- No Owner role is created, removed, or reassigned by this migration.

with duplicate_roles as (
  select
    id,
    row_number() over (
      partition by user_id, role
      order by id
    ) as rn
  from public.user_roles
)
delete from public.user_roles ur
using duplicate_roles d
where ur.id = d.id
  and d.rn > 1;

create unique index if not exists user_roles_user_id_role_unique
  on public.user_roles (user_id, role);

-- Activation URLs are bearer credentials. They are needed only while the
-- notification email is being queued. The provisioning queue must not retain
-- a completed or failed activation URL.
create or replace function private.redact_connector_activation_queue_url()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.status in ('completed', 'failed')
     and new.activation_url is not null then
    new.activation_url := null;
  end if;
  return new;
end;
$$;

drop trigger if exists connector_provisioning_queue_redact_activation_url
  on public.connector_provisioning_queue;

create trigger connector_provisioning_queue_redact_activation_url
before insert or update of status, activation_url
on public.connector_provisioning_queue
for each row
execute function private.redact_connector_activation_queue_url();

update public.connector_provisioning_queue
set activation_url = null
where status in ('completed', 'failed')
  and activation_url is not null;
