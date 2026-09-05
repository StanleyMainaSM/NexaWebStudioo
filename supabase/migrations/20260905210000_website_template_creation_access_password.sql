-- AVELIXA — WEBSITE/TEMPLATE CREATION ACCESS PASSWORD
--
-- Reuses the existing server-only portal password infrastructure. Creation access
-- is a separate gate from Supabase authentication and from normal portal entry.
-- Owner/Admin can configure/change/reset the shared creation password; authorized
-- Client/Connector/Operator/Admin/Owner users may unlock creation with it.

DO $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'private.portal_access_passwords'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%portal%';
  if v_constraint is not null then
    execute format('alter table private.portal_access_passwords drop constraint %I', v_constraint);
  end if;

  select conname into v_constraint
  from pg_constraint
  where conrelid = 'private.portal_access_unlocks'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%portal%';
  if v_constraint is not null then
    execute format('alter table private.portal_access_unlocks drop constraint %I', v_constraint);
  end if;
end $$;

alter table private.portal_access_passwords
  add constraint portal_access_passwords_portal_check
  check (portal in ('client','operator','connector','admin','owner','creation'));

alter table private.portal_access_unlocks
  add constraint portal_access_unlocks_portal_check
  check (portal in ('client','operator','connector','admin','owner','creation'));

create or replace function private.portal_access_role_allowed(p_user_id uuid, p_portal text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_user_id
      and lower(ur.role::text) = lower(p_portal)
  )
  or (
    lower(p_portal) = 'creation'
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = p_user_id
        and lower(ur.role::text) in ('client','operator','connector','admin','owner')
    )
  );
$$;

create or replace function private.portal_access_password_configured(p_portal text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  v_portal text := lower(trim(p_portal));
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or v_portal not in ('client','operator','connector','admin','owner','creation') then
    return false;
  end if;
  if not private.portal_access_role_allowed(v_user_id, v_portal) then
    return false;
  end if;
  return exists (select 1 from private.portal_access_passwords where portal = v_portal);
end;
$$;

create or replace function private.set_portal_access_password(p_portal text, p_password text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare v_portal text := lower(trim(p_portal)); v_password text := coalesce(p_password, ''); v_user_id uuid := auth.uid();
begin
  if v_user_id is null then return false; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_user_id and lower(ur.role::text) in ('owner', 'admin')) then return false; end if;
  if v_portal not in ('client','operator','connector','admin','owner','creation') then return false; end if;
  if length(v_password) < 12 then raise exception 'Portal access passwords must contain at least 12 characters.' using errcode = '22023'; end if;
  insert into private.portal_access_passwords(portal, password_hash, configured_at, updated_at, updated_by)
  values (v_portal, crypt(v_password, gen_salt('bf')), now(), now(), v_user_id)
  on conflict (portal) do update set password_hash = excluded.password_hash, updated_at = now(), updated_by = v_user_id;
  delete from private.portal_access_unlocks where portal = v_portal;
  return true;
end;
$$;

create or replace function private.change_portal_access_password(p_portal text, p_current_password text, p_new_password text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare v_portal text := lower(trim(p_portal)); v_current text := coalesce(p_current_password, ''); v_new text := coalesce(p_new_password, ''); v_hash text; v_user_id uuid := auth.uid();
begin
  if v_user_id is null then return false; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_user_id and lower(ur.role::text) in ('owner', 'admin')) then return false; end if;
  if v_portal not in ('client','operator','connector','admin','owner','creation') then return false; end if;
  if length(v_new) < 12 then raise exception 'Portal access passwords must contain at least 12 characters.' using errcode = '22023'; end if;
  select pap.password_hash into v_hash from private.portal_access_passwords pap where pap.portal = v_portal;
  if v_hash is null or crypt(v_current, v_hash) <> v_hash then return false; end if;
  update private.portal_access_passwords set password_hash = crypt(v_new, gen_salt('bf')), updated_at = now(), updated_by = v_user_id where portal = v_portal;
  delete from private.portal_access_unlocks where portal = v_portal;
  return true;
end;
$$;

create or replace function private.reset_portal_access_password(p_portal text, p_new_password text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare v_portal text := lower(trim(p_portal)); v_new text := coalesce(p_new_password, ''); v_user_id uuid := auth.uid();
begin
  if v_user_id is null then return false; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = v_user_id and lower(ur.role::text) in ('owner', 'admin')) then return false; end if;
  if v_portal not in ('client','operator','connector','admin','owner','creation') then return false; end if;
  if length(v_new) < 12 then raise exception 'Portal access passwords must contain at least 12 characters.' using errcode = '22023'; end if;
  insert into private.portal_access_passwords(portal, password_hash, configured_at, updated_at, updated_by)
  values (v_portal, crypt(v_new, gen_salt('bf')), now(), now(), v_user_id)
  on conflict (portal) do update set password_hash = excluded.password_hash, updated_at = now(), updated_by = v_user_id;
  delete from private.portal_access_unlocks where portal = v_portal;
  return true;
end;
$$;

create or replace function public.portal_access_password_configured(p_portal text)
returns boolean language sql security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$ select private.portal_access_password_configured(p_portal); $$;

grant execute on function public.portal_access_password_configured(text) to authenticated;
revoke all on function private.portal_access_password_configured(text) from public, anon, authenticated;

create or replace function private.portal_access_password_status()
returns table (portal text, configured boolean, configured_at timestamptz, updated_at timestamptz)
language plpgsql security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and lower(ur.role::text) in ('owner', 'admin')) then return; end if;
  return query
    select p.portal, (pap.password_hash is not null), pap.configured_at, pap.updated_at
    from unnest(array['client','operator','connector','admin','owner','creation']::text[]) as p(portal)
    left join private.portal_access_passwords pap on pap.portal = p.portal
    order by case p.portal when 'client' then 1 when 'operator' then 2 when 'connector' then 3 when 'admin' then 4 when 'owner' then 5 when 'creation' then 6 end;
end;
$$;

revoke all on function private.portal_access_role_allowed(uuid,text) from public, anon, authenticated;
revoke all on function private.portal_access_password_configured(text) from public, anon, authenticated;
revoke all on function private.set_portal_access_password(text,text) from public, anon, authenticated;
revoke all on function private.change_portal_access_password(text,text,text) from public, anon, authenticated;
revoke all on function private.reset_portal_access_password(text,text) from public, anon, authenticated;
revoke all on function private.portal_access_password_status() from public, anon, authenticated;

grant execute on function public.set_portal_access_password(text,text) to authenticated;
grant execute on function public.change_portal_access_password(text,text,text) to authenticated;
grant execute on function public.reset_portal_access_password(text,text) to authenticated;
grant execute on function public.portal_access_password_status() to authenticated;

comment on function public.portal_access_password_configured(text) is 'Returns only whether a role-authorized portal or website/template creation password is configured; never exposes hashes.';
comment on table private.portal_access_passwords is 'Server-only bcrypt hashes for Avelixa portal and website/template creation access passwords. Never expose through the Data API.';
