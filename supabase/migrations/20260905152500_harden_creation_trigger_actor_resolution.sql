-- Resolve the authenticated actor explicitly inside the Creation Project
-- SECURITY DEFINER trigger and enforce Client-owned references by actor identity.

create or replace function public.protect_creation_project_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid;
  v_is_owner_admin boolean := false;
begin
  v_actor := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  if v_actor is null then
    v_actor := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
    if v_actor is not null then
      v_actor := v_actor::uuid;
    end if;
  end if;

  if v_actor is not null then
    v_is_owner_admin := private.user_has_any_role(v_actor, array['owner','admin']);
  end if;

  if v_is_owner_admin then
    return new;
  end if;

  if v_actor is not null and new.client_id = v_actor and new.business_id is not null then
    raise exception 'Business reference is owner-managed';
  end if;

  if v_actor is not null
     and new.client_id = v_actor
     and new.project_id is not null
     and not exists (
       select 1 from public.projects p
       where p.id = new.project_id and p.client_id = v_actor
     )
  then
    raise exception 'Project reference access denied';
  end if;

  if v_actor is not null
     and new.connector_id = v_actor
     and new.project_id is not null
     and not exists (
       select 1 from public.projects p
       where p.id = new.project_id and p.connector_id = v_actor
     )
  then
    raise exception 'Project reference access denied';
  end if;

  if tg_op = 'UPDATE' and (
       new.client_id is distinct from old.client_id
       or new.connector_id is distinct from old.connector_id
       or new.operator_id is distinct from old.operator_id
       or new.lead_id is distinct from old.lead_id
       or new.project_id is distinct from old.project_id
       or new.business_id is distinct from old.business_id
     )
  then
    raise exception 'Creation project ownership references are protected';
  end if;

  return new;
end;
$$;
