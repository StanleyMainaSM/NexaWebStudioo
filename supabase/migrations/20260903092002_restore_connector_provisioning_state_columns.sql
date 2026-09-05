-- Restore the Connector application provisioning state columns that are part of
-- the existing onboarding workflow and required by the later reconciliation migration.
-- This migration only restores the existing schema contract; it does not change
-- provisioning behavior or historical application ownership.

alter table public.connector_applications
  add column if not exists provisioning_status text not null default 'pending',
  add column if not exists provisioned_user_id uuid,
  add column if not exists provisioned_at timestamptz,
  add column if not exists provisioning_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connector_applications'::regclass
      and conname = 'connector_applications_provisioning_status_check'
  ) then
    alter table public.connector_applications
      add constraint connector_applications_provisioning_status_check
      check (provisioning_status = any (array['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connector_applications'::regclass
      and conname = 'connector_applications_provisioned_user_id_fkey'
  ) then
    alter table public.connector_applications
      add constraint connector_applications_provisioned_user_id_fkey
      foreign key (provisioned_user_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;
