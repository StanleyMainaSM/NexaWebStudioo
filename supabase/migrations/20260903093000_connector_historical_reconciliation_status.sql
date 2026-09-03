-- Avelixa: conservatively classify historical approved Connector applications
-- that never received a provisioning queue row.
-- This migration never creates Auth users, assigns roles, or deletes applications.

alter table public.connector_applications
  add column if not exists reconciliation_status text not null default 'unreviewed',
  add column if not exists reconciliation_note text;

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
      where ur.user_id = u.id and ur.role in ('owner', 'admin', 'operator', 'client')
    ) as has_incompatible_role
  from public.connector_applications ca
  left join auth.users u
    on lower(u.email) = lower(ca.email)
  where ca.status = 'approved'
    and ca.provisioning_status = 'pending'
), classified as (
  select
    id,
    case
      when email_rank > 1
        then 'duplicate_historical_application'
      when auth_user_id is null
        then 'provisionable_safely'
      when has_connector_role and has_connector_profile
        then 'already_correctly_provisioned'
      when has_incompatible_role
        then 'requires_manual_review'
      else 'requires_manual_review'
    end as reconciliation_status,
    case
      when email_rank > 1
        then 'A later approved application exists for the same email. This historical application was not reassigned or re-queued.'
      when auth_user_id is null
        then 'No Auth account matched the application email; eligible for normal provisioning after approval-state review.'
      when has_connector_role and has_connector_profile
        then 'Existing Connector Auth user, role, and Connector profile found; no new provisioning is required.'
      when has_incompatible_role
        then 'An existing Auth account with an incompatible application role matched this email; automatic Connector assignment is prohibited.'
      else 'An existing Auth account matched this email but its Connector identity could not be established safely; manual review is required.'
    end as reconciliation_note
  from candidates
)
update public.connector_applications ca
set
  reconciliation_status = classified.reconciliation_status,
  reconciliation_note = classified.reconciliation_note,
  updated_at = now()
from classified
where ca.id = classified.id;
