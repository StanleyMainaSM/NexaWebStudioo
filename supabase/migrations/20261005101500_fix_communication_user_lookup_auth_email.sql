-- Fix communication user lookup to resolve the canonical Auth email.
-- Some valid Avelixa profiles can have a profile email that is stale or
-- incomplete relative to auth.users. Communication search must still find them
-- by their signed-in Auth email without weakening RLS or exposing extra users.

create or replace function public.find_communication_user(p_identifier text)
returns table(
  user_id uuid,
  full_name text,
  email text,
  role_context text,
  connector_id text,
  is_online boolean,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $function$
  select
    p.id,
    p.full_name,
    coalesce(nullif(trim(p.email), ''), au.email),
    private.communication_primary_role(p.id),
    cp.avl_id,
    coalesce(up.is_online, false),
    up.last_seen_at
  from public.profiles p
  join auth.users au on au.id = p.id
  left join public.connector_profiles cp on cp.user_id = p.id
  left join public.user_presence up on up.user_id = p.id
  where p.id <> (select auth.uid())
    and (
      lower(trim(p_identifier)) = lower(trim(coalesce(p.email, au.email)))
      or lower(trim(p_identifier)) = lower(trim(p.full_name))
      or lower(trim(p_identifier)) = lower(trim(cp.avl_id))
      or regexp_replace(coalesce(au.phone, ''), '[^0-9+]', '', 'g')
         = regexp_replace(trim(p_identifier), '[^0-9+]', '', 'g')
    )
  order by case
    when lower(trim(p_identifier)) = lower(trim(coalesce(p.email, au.email))) then 1
    when lower(trim(p_identifier)) = lower(trim(p.full_name)) then 2
    when lower(trim(p_identifier)) = lower(trim(cp.avl_id)) then 3
    when regexp_replace(coalesce(au.phone, ''), '[^0-9+]', '', 'g')
         = regexp_replace(trim(p_identifier), '[^0-9+]', '', 'g') then 4
    else 99
  end,
  p.id
  limit 1;
$function$;
