-- Restore messaging contacts from saved contacts OR existing direct conversations.
-- This never exposes an Avelixa-wide directory: only the current user's saved
-- contacts and people already participating in a direct conversation are returned.
create or replace function public.list_communication_contacts()
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
  with contact_ids as (
    select uc.contact_user_id as user_id
    from public.user_contacts uc
    where uc.user_id = (select auth.uid())
    union
    select other.user_id
    from public.direct_conversation_participants mine
    join public.direct_conversation_participants other
      on other.conversation_id = mine.conversation_id
     and other.user_id <> mine.user_id
    join public.direct_conversations dc
      on dc.id = mine.conversation_id
    where mine.user_id = (select auth.uid())
      and dc.status = 'active'
  ),
  named_contacts as (
    select uc.contact_user_id as user_id,
           nullif(trim(uc.contact_name), '') as contact_name
    from public.user_contacts uc
    where uc.user_id = (select auth.uid())
  )
  select p.id,
         coalesce(nc.contact_name, p.full_name),
         p.email,
         private.communication_primary_role(p.id),
         cp.avl_id,
         coalesce(up.is_online, false),
         up.last_seen_at
  from contact_ids ci
  join public.profiles p on p.id = ci.user_id
  left join named_contacts nc on nc.user_id = p.id
  left join public.connector_profiles cp on cp.user_id = p.id
  left join public.user_presence up on up.user_id = p.id
  order by coalesce(up.is_online, false) desc,
           coalesce(nullif(trim(nc.contact_name), ''), nullif(trim(p.full_name), ''), p.email) asc;
$function$;

-- Presence must be realtime-enabled so the green/gray online indicator updates
-- without polling or rebuilding the Messages contact list.
alter table public.user_presence replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.user_presence;
exception
  when duplicate_object then null;
end $$;
