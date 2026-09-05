-- Strengthen the existing Creation Project reference guard at INSERT time.
-- This complements the existing RPC validation and prevents an unsafe
-- SECURITY DEFINER insert from attaching a Client to another Business/Project.

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

  if new.client_id is not null and new.business_id is not null then
    raise exception 'Business reference is owner-managed';
  end if;

  if new.client_id is not null
     and new.project_id is not null
     and not exists (
       select 1
       from public.projects p
       where p.id = new.project_id
         and p.client_id = new.client_id
     )
  then
    raise exception 'Project reference access denied';
  end if;

  if new.connector_id is not null
     and new.project_id is not null
     and not exists (
       select 1
       from public.projects p
       where p.id = new.project_id
         and p.connector_id = new.connector_id
     )
  then
    raise exception 'Project reference access denied';
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
before insert or update on public.creation_projects
for each row execute function public.protect_creation_project_relationships();
