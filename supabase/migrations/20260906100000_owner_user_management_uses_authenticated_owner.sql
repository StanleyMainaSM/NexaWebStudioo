-- Owner User Management uses the currently authenticated Supabase Owner account.
-- The legacy portal-access password system remains unchanged for other portal
-- access flows. This migration only allows the server-side Owner User
-- Management API to rely on Owner role + active session authorization.

create or replace function private.has_portal_access(p_portal text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  v_portal text := lower(trim(p_portal));
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_client_info text := coalesce(
    current_setting('request.headers', true)::json->>'x-client-info',
    ''
  );
begin
  if v_user_id is null or v_portal not in ('client','operator','connector','admin','owner') then
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

  -- The Owner User Management server API authenticates the user with the
  -- normal Supabase session and separately verifies the Owner role. Its
  -- server-side supabase-js client identifies itself as runtime=node.
  -- Do not change browser Owner portal access behavior: browser requests
  -- continue to require the existing legacy portal unlock when applicable.
  if v_portal = 'owner' and v_client_info like 'supabase-js/%; runtime=node%' then
    return exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.user_id = v_user_id
        and lower(ur.role::text) = 'owner'
        and coalesce(p.is_active, true) = true
    );
  end if;

  if not private.portal_access_role_allowed(v_user_id, v_portal) then
    return false;
  end if;

  delete from private.portal_access_unlocks where expires_at <= now();

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
