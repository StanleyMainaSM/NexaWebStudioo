-- Restore schema/security contracts required by the existing clean-database
-- regression suite and already present in the deployed Avelixa database.
-- This is a compatibility correction only; it does not introduce new product behavior.

-- Maintenance billing links used by the existing payment/commission workflow.
alter table public.invoices
  add column if not exists recurring_service_id uuid,
  add column if not exists billing_period_start date,
  add column if not exists billing_period_end date;

alter table public.maintenance_subscriptions
  add column if not exists recurring_service_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.invoices'::regclass
      and conname = 'invoices_recurring_service_id_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_recurring_service_id_fkey
      foreign key (recurring_service_id)
      references public.recurring_services(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.maintenance_subscriptions'::regclass
      and conname = 'maintenance_subscriptions_recurring_service_id_fkey'
  ) then
    alter table public.maintenance_subscriptions
      add constraint maintenance_subscriptions_recurring_service_id_fkey
      foreign key (recurring_service_id)
      references public.recurring_services(id);
  end if;
end $$;

-- Reassert the existing non-owner Creation Project reference contract.
create or replace function public.protect_creation_project_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if private.user_has_any_role(auth.uid(), array['owner','admin']) then
    return new;
  end if;

  if new.client_id is distinct from old.client_id
     or new.connector_id is distinct from old.connector_id
     or new.operator_id is distinct from old.operator_id
     or new.lead_id is distinct from old.lead_id
     or new.project_id is distinct from old.project_id
     or new.business_id is distinct from old.business_id
  then
    raise exception 'Creation project ownership references are protected';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_creation_project_relationships() from public;

drop trigger if exists protect_creation_project_relationships on public.creation_projects;
create trigger protect_creation_project_relationships
before update on public.creation_projects
for each row execute function public.protect_creation_project_relationships();

create or replace function public.create_creation_project(
  p_type text default 'website',
  p_title text default 'Website Preview',
  p_client_id uuid default null,
  p_connector_id uuid default null,
  p_lead_id uuid default null,
  p_business_id uuid default null,
  p_project_id uuid default null,
  p_business_info jsonb default '{}'::jsonb,
  p_requested_sections text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
  v_client uuid := p_client_id;
  v_connector uuid := p_connector_id;
  v_business_id uuid := p_business_id;
  v_is_owner_admin boolean := private.user_has_any_role(auth.uid(), array['owner','admin']);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_type not in ('website','web_app','mobile_app','custom_software') then raise exception 'Invalid creation project type'; end if;
  if nullif(btrim(p_title), '') is null then raise exception 'Creation project title is required'; end if;

  if v_is_owner_admin then
    null;
  elsif private.user_has_any_role(auth.uid(), array['client']) then
    v_client := auth.uid();
    v_connector := null;
    if p_business_id is not null then
      raise exception 'Business reference is owner-managed';
    end if;
    if p_project_id is not null and not exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.client_id = auth.uid()
    ) then
      raise exception 'Project reference access denied';
    end if;
  elsif private.user_has_any_role(auth.uid(), array['connector']) then
    v_connector := auth.uid();
    v_client := null;
    if p_business_id is not null and p_lead_id is null then
      raise exception 'Business reference must come from an authorized lead';
    end if;
    if p_project_id is not null and not exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.connector_id = auth.uid()
    ) then
      raise exception 'Project reference access denied';
    end if;
  else
    raise exception 'Creation project access denied';
  end if;

  if p_lead_id is not null then
    select business_id into v_business_id
    from public.leads
    where id = p_lead_id;

    if not exists (
      select 1 from public.leads l
      where l.id = p_lead_id
        and (l.connector_id = auth.uid() or v_is_owner_admin)
    ) then
      raise exception 'Lead access denied';
    end if;
  end if;

  if v_business_id is not null and not exists (
    select 1 from public.businesses where id = v_business_id
  ) then
    raise exception 'Business reference not found';
  end if;

  insert into public.creation_projects (
    type, title, client_id, connector_id, lead_id, business_id, project_id,
    business_info, requested_sections
  ) values (
    p_type, btrim(p_title), v_client, v_connector, p_lead_id, v_business_id,
    p_project_id, coalesce(p_business_info, '{}'::jsonb), coalesce(p_requested_sections, '{}')
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_creation_project(text,text,uuid,uuid,uuid,uuid,uuid,jsonb,text[]) from public;
grant execute on function public.create_creation_project(text,text,uuid,uuid,uuid,uuid,uuid,jsonb,text[]) to authenticated;
