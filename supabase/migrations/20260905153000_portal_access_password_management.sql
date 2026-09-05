-- AVELIXA STAGE 3 — OWNER/ADMIN PORTAL PASSWORD MANAGEMENT
--
-- Reuses Stage 2 private password storage. Management RPCs never return
-- password hashes or plaintext passwords and remain restricted to Owner/Admin.

create or replace function private.portal_access_password_status()
returns table (
  portal text,
  configured boolean,
  configured_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and lower(ur.role::text) in ('owner', 'admin')
  ) then
    return;
  end if;

  return query
    select p.portal,
           (pap.password_hash is not null) as configured,
           pap.configured_at,
           pap.updated_at
    from unnest(array['client','operator','connector','admin','owner']::text[]) as p(portal)
    left join private.portal_access_passwords pap on pap.portal = p.portal
    order by case p.portal
      when 'client' then 1
      when 'operator' then 2
      when 'connector' then 3
      when 'admin' then 4
      when 'owner' then 5
    end;
end;
$$;

create or replace function private.change_portal_access_password(
  p_portal text,
  p_current_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  v_portal text := lower(trim(p_portal));
  v_current text := coalesce(p_current_password, '');
  v_new text := coalesce(p_new_password, '');
  v_hash text;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return false;
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_user_id
      and lower(ur.role::text) in ('owner', 'admin')
  ) then
    return false;
  end if;

  if v_portal not in ('client','operator','connector','admin','owner') then
    return false;
  end if;

  if length(v_new) < 12 then
    raise exception 'Portal access passwords must contain at least 12 characters.' using errcode = '22023';
  end if;

  select pap.password_hash
    into v_hash
    from private.portal_access_passwords pap
   where pap.portal = v_portal;

  if v_hash is null or crypt(v_current, v_hash) <> v_hash then
    return false;
  end if;

  update private.portal_access_passwords
     set password_hash = crypt(v_new, gen_salt('bf')),
         updated_at = now(),
         updated_by = v_user_id
   where portal = v_portal;

  delete from private.portal_access_unlocks where portal = v_portal;
  return true;
end;
$$;

create or replace function private.reset_portal_access_password(
  p_portal text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  v_portal text := lower(trim(p_portal));
  v_new text := coalesce(p_new_password, '');
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return false;
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_user_id
      and lower(ur.role::text) in ('owner', 'admin')
  ) then
    return false;
  end if;

  if v_portal not in ('client','operator','connector','admin','owner') then
    return false;
  end if;

  if length(v_new) < 12 then
    raise exception 'Portal access passwords must contain at least 12 characters.' using errcode = '22023';
  end if;

  insert into private.portal_access_passwords(portal, password_hash, configured_at, updated_at, updated_by)
  values (v_portal, crypt(v_new, gen_salt('bf')), now(), now(), v_user_id)
  on conflict (portal) do update
    set password_hash = excluded.password_hash,
        updated_at = now(),
        updated_by = v_user_id;

  delete from private.portal_access_unlocks where portal = v_portal;
  return true;
end;
$$;

create or replace function public.portal_access_password_status()
returns table (
  portal text,
  configured boolean,
  configured_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
  select * from private.portal_access_password_status();
$$;

create or replace function public.change_portal_access_password(
  p_portal text,
  p_current_password text,
  p_new_password text
)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
  select private.change_portal_access_password(p_portal, p_current_password, p_new_password);
$$;

create or replace function public.reset_portal_access_password(
  p_portal text,
  p_new_password text
)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
  select private.reset_portal_access_password(p_portal, p_new_password);
$$;

revoke all on function private.portal_access_password_status() from public, anon, authenticated;
revoke all on function private.change_portal_access_password(text,text,text) from public, anon, authenticated;
revoke all on function private.reset_portal_access_password(text,text) from public, anon, authenticated;

grant execute on function public.portal_access_password_status() to authenticated;
grant execute on function public.change_portal_access_password(text,text,text) to authenticated;
grant execute on function public.reset_portal_access_password(text,text) to authenticated;

comment on function public.portal_access_password_status() is 'Returns only configured state and timestamps for portal passwords to Owner/Admin callers.';
comment on function public.change_portal_access_password(text,text,text) is 'Owner/Admin portal password change; never returns or exposes password hashes.';
comment on function public.reset_portal_access_password(text,text) is 'Owner/Admin portal password reset/reconfiguration; never returns or exposes password hashes.';
