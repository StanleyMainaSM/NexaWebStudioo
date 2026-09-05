-- Restore the Connector application provisioning state columns that are
-- required by the existing provisioning helpers and later reconciliation.
-- This mirrors the authoritative live schema without changing existing data.

alter table public.connector_applications
  add column if not exists provisioning_status text not null default 'pending',
  add column if not exists provisioned_user_id uuid,
  add column if not exists provisioned_at timestamptz,
  add column if not exists provisioning_error text;

alter table public.connector_applications
  drop constraint if exists connector_applications_provisioning_status_check;

alter table public.connector_applications
  add constraint connector_applications_provisioning_status_check
  check (provisioning_status = any (array['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]));

do $$
begin
  alter table public.connector_applications
    add constraint connector_applications_provisioned_user_id_fkey
    foreign key (provisioned_user_id)
    references public.profiles(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;
