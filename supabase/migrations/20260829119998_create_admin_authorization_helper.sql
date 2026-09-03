-- Restore the existing Admin/Owner authorization helper before the
-- admin_messages baseline and communication security RPCs use it.
-- The established authorization layer already provides private.user_has_any_role;
-- this helper preserves the existing higher-level Admin/Owner predicate without
-- introducing a second authorization model.

create schema if not exists private;

create or replace function private.is_admin_or_owner()
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select private.user_has_any_role(
    auth.uid(),
    array['owner', 'admin']::text[]
  );
$$;

revoke all on function private.is_admin_or_owner() from public;
grant execute on function private.is_admin_or_owner() to authenticated;
