-- Harden the Creation Project authorization boundary by resolving the caller
-- explicitly and evaluating roles against that caller id inside the SECURITY
-- DEFINER function. Direct role predicates avoid relying on auth-context helpers
-- whose execution context can change under SECURITY DEFINER.

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
  v_actor uuid := auth.uid();
  v_client uuid := p_client_id;
  v_connector uuid := p_connector_id;
  v_business_id uuid := p_business_id;
  v_is_owner_admin boolean;
  v_is_client boolean;
  v_is_connector boolean;
begin
  if v_actor is null then
    v_actor := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  end if;
  if v_actor is null then
    v_actor := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub';
    if v_actor is not null then
      v_actor := v_actor::uuid;
    end if;
  end if;

  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select
    exists(select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role in ('owner','admin')),
    exists(select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role = 'client'),
    exists(select 1 from public.user_roles ur where ur.user_id = v_actor and ur.role = 'connector')
  into v_is_owner_admin, v_is_client, v_is_connector;

  if p_type not in ('website','web_app','mobile_app','custom_software') then
    raise exception 'Invalid creation project type';
  end if;
  if nullif(btrim(p_title), '') is null then
    raise exception 'Creation project title is required';
  end if;

  if v_is_owner_admin then
    null;
  elsif v_is_client then
    v_client := v_actor;
    v_connector := null;
    if p_business_id is not null then
      raise exception 'Business reference is owner-managed';
    end if;
    if p_project_id is not null and not exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.client_id = v_actor
    ) then
      raise exception 'Project reference access denied';
    end if;
  elsif v_is_connector then
    v_connector := v_actor;
    v_client := null;
    if p_business_id is not null and p_lead_id is null then
      raise exception 'Business reference must come from an authorized lead';
    end if;
    if p_project_id is not null and not exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.connector_id = v_actor
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
        and (l.connector_id = v_actor or v_is_owner_admin)
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
