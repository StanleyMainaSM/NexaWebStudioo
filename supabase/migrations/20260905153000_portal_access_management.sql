-- AVELIXA STAGE 3 — OWNER/ADMIN PORTAL PASSWORD MANAGEMENT
-- Management exposes only configured/not-configured state. Existing hashes
-- remain private and are never returned to the client.

create or replace function private.get_portal_access_status()
returns table(portal text, configured boolean)
language sql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
  select p.portal,
         exists (
           select 1
           from private.portal_access_passwords pap
           where pap.portal = p.portal
         ) as configured
  from unnest(array['client','operator','connector','admin','owner']::text[]) as p(portal);
$$;

create or replace function public.get_portal_access_status()
returns table(portal text, configured boolean)
language sql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
  select * from private.get_portal_access_status();
$$;

revoke all on function private.get_portal_access_status() from public, anon, authenticated;
grant execute on function public.get_portal_access_status() to authenticated;

comment on function public.get_portal_access_status() is 'Returns only configured/not-configured state for the five portal access passwords; never returns password hashes.';
