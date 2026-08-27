create or replace function public.search_communication_users(p_query text)
returns table (user_id uuid, full_name text, email text, role_context text, connector_id text, is_online boolean, last_seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.email, private.communication_primary_role(p.id), cp.avl_id,
         coalesce(up.is_online,false), up.last_seen_at
  from public.profiles p
  left join public.connector_profiles cp on cp.user_id=p.id
  left join public.user_presence up on up.user_id=p.id
  where p.id <> (select auth.uid())
    and (coalesce(trim(p_query),'')='' or p.full_name ilike '%'||trim(p_query)||'%' or p.email ilike '%'||trim(p_query)||'%' or cp.avl_id ilike '%'||trim(p_query)||'%')
    and exists (select 1 from public.user_roles ur where ur.user_id=p.id and ur.role in ('owner','admin','connector','operator','developer','client'))
  order by coalesce(up.is_online,false) desc, coalesce(nullif(trim(p.full_name),''),p.email) asc
  limit 30;
$$;
revoke all on function public.search_communication_users(text) from public;
grant execute on function public.search_communication_users(text) to authenticated;

create or replace function public.list_communication_contacts()
returns table (user_id uuid, full_name text, email text, role_context text, connector_id text, is_online boolean, last_seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.email, private.communication_primary_role(p.id), cp.avl_id,
         coalesce(up.is_online,false), up.last_seen_at
  from public.user_contacts uc
  join public.profiles p on p.id=uc.contact_user_id
  left join public.connector_profiles cp on cp.user_id=p.id
  left join public.user_presence up on up.user_id=p.id
  where uc.user_id=(select auth.uid())
  order by coalesce(up.is_online,false) desc, coalesce(nullif(trim(p.full_name),''),p.email) asc;
$$;
revoke all on function public.list_communication_contacts() from public;
grant execute on function public.list_communication_contacts() to authenticated;

create or replace function public.communication_can_message(p_other_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.communication_can_contact(p_other_user_id);
$$;
revoke all on function public.communication_can_message(uuid) from public;
grant execute on function public.communication_can_message(uuid) to authenticated;

drop policy if exists direct_messages_delete_own on public.direct_messages;
create policy direct_messages_delete_own on public.direct_messages for delete to authenticated using (sender_id=(select auth.uid()));

create index if not exists user_presence_online_idx on public.user_presence(is_online, updated_at desc);
