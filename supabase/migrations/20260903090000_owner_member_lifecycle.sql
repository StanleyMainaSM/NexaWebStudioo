-- Reversible member activation state.
-- This does not alter or remove existing roles. Application authorization
-- consults get_my_roles(), which now returns roles only for active profiles.
alter table public.profiles
  add column if not exists is_active boolean;

update public.profiles
set is_active = true
where is_active is null;

alter table public.profiles
  alter column is_active set default true,
  alter column is_active set not null;

create or replace function public.get_my_roles()
returns table(role text)
language sql
security definer
set search_path to 'public'
as $function$
  select ur.role::text
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = auth.uid()
    and p.is_active = true;
$function$;

revoke execute on function public.get_my_roles() from public, anon;
grant execute on function public.get_my_roles() to authenticated;

comment on column public.profiles.is_active is
  'Reversible account activation state controlled by authorized Owner member management.';
