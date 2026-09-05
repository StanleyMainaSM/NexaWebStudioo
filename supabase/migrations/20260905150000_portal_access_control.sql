-- AVELIXA STAGE 2 — CENTRALIZED FIVE-PORTAL ACCESS CONTROL
--
-- Supabase Auth and existing application roles remain authoritative.
-- Portal passwords are a second, session-bound gate after role authorization.
-- Password hashes and unlock state live outside the exposed public schema.

create schema if not exists private;

create table if not exists private.portal_access_passwords (
  portal text primary key check (portal in ('client','operator','connector','admin','owner')),
  password_hash text not null,
  configured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists private.portal_access_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  portal text not null check (portal in ('client','operator','connector','admin','owner')),
  session_id uuid not null,
  unlocked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, portal, session_id)
);

create index if not exists portal_access_unlocks_session_idx
  on private.portal_access_unlocks(session_id, portal, expires_at);

revoke all on schema private from public, anon, authenticated;
revoke all on private.portal_access_passwords from public, anon, authenticated;
revoke all on private.portal_access_unlocks from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'portal_access_passwords_portal_key') then
    alter table private.portal_access_passwords add constraint portal_access_passwords_portal_key unique (portal);
  end if;
end $$;

create or replace function private.portal_access_role_allowed(p_user_id uuid, p_portal text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_user_id
      and lower(ur.role::text) = lower(p_portal)
  );
$$;

create or replace function private.set_portal_access_password(p_portal text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_portal text := lower(trim(p_portal));
  v_password text := coalesce(p_password, '');
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_user_id
      and ur.role in ('owner', 'admin')
  ) then
    return false;
  end if;

  if v_portal not in ('client','operator','connector','admin','owner') then
    return false;
  end if;

  if length(v_password) < 12 then
    raise exception 'Portal access passwords must contain at least 12 characters.' using errcode = '22023';
  end if;

  insert into private.portal_access_passwords(portal, password_hash, configured_at, updated_at, updated_by)
  values (v_portal, crypt(v_password, gen_salt('bf')), now(), now(), v_user_id)
  on conflict (portal) do update
    set password_hash = excluded.password_hash,
        updated_at = now(),
        updated_by = v_user_id;

  delete from private.portal_access_unlocks
  where portal = v_portal;

  return true;
end;
$$;

create or replace function private.verify_portal_access_password(p_portal text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_portal text := lower(trim(p_portal));
  v_password text := coalesce(p_password, '');
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_password_hash text;
begin
  if v_user_id is null or v_portal not in ('client','operator','connector','admin','owner') then
    return false;
  end if;

  if not private.portal_access_role_allowed(v_user_id, v_portal) then
    return false;
  end if;

  begin
    v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  exception when others then
    return false;
  end;

  if v_session_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from auth.sessions s
    where s.id = v_session_id
      and s.user_id = v_user_id
      and coalesce(s.not_after, 'infinity'::timestamptz) > now()
  ) then
    return false;
  end if;

  select pap.password_hash
    into v_password_hash
  from private.portal_access_passwords pap
  where pap.portal = v_portal;

  if v_password_hash is null or crypt(v_password, v_password_hash) <> v_password_hash then
    return false;
  end if;

  insert into private.portal_access_unlocks(user_id, portal, session_id, unlocked_at, expires_at)
  values (v_user_id, v_portal, v_session_id, now(), now() + interval '8 hours')
  on conflict (user_id, portal, session_id) do update
    set unlocked_at = now(),
        expires_at = now() + interval '8 hours';

  return true;
end;
$$;

create or replace function private.has_portal_access(p_portal text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_portal text := lower(trim(p_portal));
  v_user_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_user_id is null or v_portal not in ('client','operator','connector','admin','owner') then
    return false;
  end if;

  if not private.portal_access_role_allowed(v_user_id, v_portal) then
    return false;
  end if;

  begin
    v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  exception when others then
    return false;
  end;

  if v_session_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from auth.sessions s
    where s.id = v_session_id
      and s.user_id = v_user_id
      and coalesce(s.not_after, 'infinity'::timestamptz) > now()
  ) then
    return false;
  end if;

  delete from private.portal_access_unlocks
  where expires_at <= now();

  return exists (
    select 1
    from private.portal_access_unlocks u
    where u.user_id = v_user_id
      and u.portal = v_portal
      and u.session_id = v_session_id
      and u.expires_at > now()
  );
end;
$$;

create or replace function private.clear_portal_access(p_portal text default null)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_portal text := nullif(lower(trim(p_portal)), '');
begin
  if v_user_id is null then
    return false;
  end if;

  begin
    v_session_id := (auth.jwt() ->> 'session_id')::uuid;
  exception when others then
    return false;
  end;

  if v_session_id is null then
    return false;
  end if;

  delete from private.portal_access_unlocks
  where user_id = v_user_id
    and session_id = v_session_id
    and (v_portal is null or portal = v_portal);

  return true;
end;
$$;

-- Public RPC wrappers are deliberately result-only: no hash, password, or unlock
-- record is ever returned to the browser. The sensitive implementation remains
-- in the private schema.
create or replace function public.verify_portal_access_password(p_portal text, p_password text)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.verify_portal_access_password(p_portal, p_password);
$$;

create or replace function public.has_portal_access(p_portal text)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.has_portal_access(p_portal);
$$;

create or replace function public.clear_portal_access(p_portal text default null)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.clear_portal_access(p_portal);
$$;

create or replace function public.set_portal_access_password(p_portal text, p_password text)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  select private.set_portal_access_password(p_portal, p_password);
$$;

revoke all on function private.portal_access_role_allowed(uuid,text) from public, anon, authenticated;
revoke all on function private.verify_portal_access_password(text,text) from public, anon, authenticated;
revoke all on function private.has_portal_access(text) from public, anon, authenticated;
revoke all on function private.clear_portal_access(text) from public, anon, authenticated;
revoke all on function private.set_portal_access_password(text,text) from public, anon, authenticated;

grant execute on function public.verify_portal_access_password(text,text) to authenticated;
grant execute on function public.has_portal_access(text) to authenticated;
grant execute on function public.clear_portal_access(text) to authenticated;
grant execute on function public.set_portal_access_password(text,text) to authenticated;

comment on table private.portal_access_passwords is 'Server-only bcrypt hashes for Avelixa portal access passwords. Never expose through the Data API.';
comment on table private.portal_access_unlocks is 'Server-only, Supabase-session-bound portal unlock state.';
