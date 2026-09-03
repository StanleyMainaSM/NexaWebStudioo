-- Avelixa: correct and complete historical Connector reconciliation.
-- This follows the classification migration and is intentionally conservative:
-- no Auth users are created, no roles are assigned, and no application is deleted.

with candidates as (
  select
    ca.id,
    ca.email,
    ca.created_at,
    row_number() over (
      partition by lower(ca.email)
      order by ca.created_at asc, ca.id asc
    ) as email_rank,
    u.id as auth_user_id,
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = u.id and ur.role = 'connector'
    ) as has_connector_role,
    exists (
      select 1 from public.connector_profiles cp
      where cp.user_id = u.id
    ) as has_connector_profile,
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = u.id
        and ur.role in ('owner', 'admin', 'operator', 'client')
    ) as has_incompatible_role
  from public.connector_applications ca
  left join auth.users u
    on lower(u.email) = lower(ca.email)
  where ca.status = 'approved'
    and ca.provisioning_status = 'pending'
), classified as (
  select
    *,
    case
      when email_rank > 1 then 'duplicate_historical_application'
      when auth_user_id is not null and has_connector_role and has_connector_profile
        then 'already_correctly_provisioned'
      when auth_user_id is null then 'provisionable_safely'
      else 'requires_manual_review'
    end as final_reconciliation_status
  from candidates
)
update public.connector_applications ca
set
  reconciliation_status = classified.final_reconciliation_status,
  reconciliation_note = case
    when classified.final_reconciliation_status = 'duplicate_historical_application'
      then 'Historical duplicate for an email with an earlier approved application. No Auth account or Connector role was created or reassigned.'
    when classified.final_reconciliation_status = 'already_correctly_provisioned'
      then 'Existing Connector Auth user and Connector profile match this canonical application email. The existing Connector identity was linked without creating a duplicate account.'
    when classified.final_reconciliation_status = 'provisionable_safely'
      then 'No Auth account matched this application email. It may proceed through the normal provisioning architecture after approval-state review.'
    when classified.has_incompatible_role
      then 'Existing Auth account has an incompatible role. Automatic Connector assignment is prohibited; manual review is required.'
    else 'Existing Auth account was found but a safe Connector identity could not be established. Manual review is required.'
  end,
  provisioning_status = case
    when classified.final_reconciliation_status = 'already_correctly_provisioned' then 'completed'
    else ca.provisioning_status
  end,
  provisioned_user_id = case
    when classified.final_reconciliation_status = 'already_correctly_provisioned' then classified.auth_user_id
    else ca.provisioned_user_id
  end,
  provisioned_at = case
    when classified.final_reconciliation_status = 'already_correctly_provisioned' then coalesce(ca.provisioned_at, now())
    else ca.provisioned_at
  end,
  provisioning_error = case
    when classified.final_reconciliation_status = 'already_correctly_provisioned' then null
    else ca.provisioning_error
  end,
  updated_at = now()
from classified
where ca.id = classified.id;
