create table if not exists public.user_contacts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, contact_user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id, contact_user_id), check (user_id <> contact_user_id)
);
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(), blocker_id uuid not null references public.profiles(id) on delete cascade, blocked_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique(blocker_id, blocked_id), check (blocker_id <> blocked_id)
);
create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade, is_online boolean not null default false, last_seen_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.conversation_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade, conversation_id uuid not null references public.direct_conversations(id) on delete cascade, muted boolean not null default false, cleared_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(user_id, conversation_id)
);
create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade, message_notifications boolean not null default true, call_notifications boolean not null default true, sound_enabled boolean not null default true, vibration_enabled boolean not null default true, message_sound_url text, voice_ringtone_url text, video_ringtone_url text, updated_at timestamptz not null default now()
);

alter table public.user_contacts enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_presence enable row level security;
alter table public.conversation_preferences enable row level security;
alter table public.user_notification_preferences enable row level security;

drop policy if exists user_contacts_select_own on public.user_contacts;
drop policy if exists user_contacts_insert_own on public.user_contacts;
drop policy if exists user_contacts_delete_own on public.user_contacts;
create policy user_contacts_select_own on public.user_contacts for select using (user_id = (select auth.uid()));
create policy user_contacts_insert_own on public.user_contacts for insert with check (user_id = (select auth.uid()) and contact_user_id <> (select auth.uid()));
create policy user_contacts_delete_own on public.user_contacts for delete using (user_id = (select auth.uid()));

drop policy if exists user_blocks_select_own on public.user_blocks;
drop policy if exists user_blocks_insert_own on public.user_blocks;
drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks for select using (blocker_id = (select auth.uid()));
create policy user_blocks_insert_own on public.user_blocks for insert with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));
create policy user_blocks_delete_own on public.user_blocks for delete using (blocker_id = (select auth.uid()));

drop policy if exists user_presence_select_authenticated on public.user_presence;
drop policy if exists user_presence_upsert_own on public.user_presence;
drop policy if exists user_presence_update_own on public.user_presence;
create policy user_presence_select_authenticated on public.user_presence for select to authenticated using (true);
create policy user_presence_upsert_own on public.user_presence for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_presence_update_own on public.user_presence for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists conversation_preferences_select_own on public.conversation_preferences;
drop policy if exists conversation_preferences_insert_own on public.conversation_preferences;
drop policy if exists conversation_preferences_update_own on public.conversation_preferences;
create policy conversation_preferences_select_own on public.conversation_preferences for select using (user_id = (select auth.uid()));
create policy conversation_preferences_insert_own on public.conversation_preferences for insert with check (user_id = (select auth.uid()));
create policy conversation_preferences_update_own on public.conversation_preferences for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists user_notification_preferences_select_own on public.user_notification_preferences;
drop policy if exists user_notification_preferences_insert_own on public.user_notification_preferences;
drop policy if exists user_notification_preferences_update_own on public.user_notification_preferences;
create policy user_notification_preferences_select_own on public.user_notification_preferences for select using (user_id = (select auth.uid()));
create policy user_notification_preferences_insert_own on public.user_notification_preferences for insert with check (user_id = (select auth.uid()));
create policy user_notification_preferences_update_own on public.user_notification_preferences for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.communication_can_contact(p_other_user_id uuid) returns boolean language sql stable security definer set search_path = '' as $$ select auth.uid() is not null and p_other_user_id is not null and p_other_user_id <> auth.uid() and not exists (select 1 from public.user_blocks b where b.blocker_id=auth.uid() and b.blocked_id=p_other_user_id) and not exists (select 1 from public.user_blocks b where b.blocker_id=p_other_user_id and b.blocked_id=auth.uid()); $$;
grant execute on function public.communication_can_contact(uuid) to authenticated;
create or replace function public.communication_set_presence(p_online boolean) returns void language plpgsql security definer set search_path = '' as $$ begin if auth.uid() is null then raise exception 'Authentication is required'; end if; insert into public.user_presence(user_id,is_online,last_seen_at,updated_at) values(auth.uid(),p_online,now(),now()) on conflict(user_id) do update set is_online=excluded.is_online,last_seen_at=now(),updated_at=now(); end; $$;
grant execute on function public.communication_set_presence(boolean) to authenticated;
create or replace function public.communication_add_contact(p_contact_user_id uuid) returns void language plpgsql security definer set search_path = '' as $$ begin if not public.communication_can_contact(p_contact_user_id) then raise exception 'This user is unavailable for communication'; end if; insert into public.user_contacts(user_id,contact_user_id) values(auth.uid(),p_contact_user_id) on conflict do nothing; end; $$;
grant execute on function public.communication_add_contact(uuid) to authenticated;
create or replace function public.communication_block_user(p_blocked_id uuid) returns void language plpgsql security definer set search_path = '' as $$ begin if p_blocked_id is null or p_blocked_id=auth.uid() then raise exception 'A valid user is required'; end if; insert into public.user_blocks(blocker_id,blocked_id) values(auth.uid(),p_blocked_id) on conflict do nothing; delete from public.user_contacts where user_id=auth.uid() and contact_user_id=p_blocked_id; end; $$;
grant execute on function public.communication_block_user(uuid) to authenticated;
create or replace function public.communication_unblock_user(p_blocked_id uuid) returns void language sql security definer set search_path = '' as $$ delete from public.user_blocks where blocker_id=auth.uid() and blocked_id=p_blocked_id; $$;
grant execute on function public.communication_unblock_user(uuid) to authenticated;
create or replace function public.communication_notify_message() returns trigger language plpgsql security definer set search_path = '' as $$ declare recipient uuid; sender_name text; begin select dcp.user_id into recipient from public.direct_conversation_participants dcp where dcp.conversation_id=NEW.conversation_id and dcp.user_id<>NEW.sender_id limit 1; if recipient is null then return NEW; end if; if exists(select 1 from public.user_blocks b where (b.blocker_id=recipient and b.blocked_id=NEW.sender_id) or (b.blocker_id=NEW.sender_id and b.blocked_id=recipient)) then return NEW; end if; select coalesce(nullif(trim(full_name),''),email,'Avelixa User') into sender_name from public.profiles where id=NEW.sender_id; insert into public.notifications(user_id,title,content,link,is_read,notification_type,entity_type,entity_id,metadata,dedupe_key) values(recipient,'New message from '||sender_name,left(NEW.content,160),'/portal/messages',false,'message','direct_message',NEW.id,jsonb_build_object('conversation_id',NEW.conversation_id,'sender_id',NEW.sender_id),'direct-message:'||NEW.id::text) on conflict(dedupe_key) do nothing; return NEW; end; $$;
drop trigger if exists direct_message_notification_trigger on public.direct_messages;
create trigger direct_message_notification_trigger after insert on public.direct_messages for each row execute function public.communication_notify_message();
create or replace function public.communication_notify_call() returns trigger language plpgsql security definer set search_path = '' as $$ declare caller_name text; begin if NEW.callee_id is null or NEW.caller_id is null then return NEW; end if; select coalesce(nullif(trim(full_name),''),email,'Avelixa User') into caller_name from public.profiles where id=NEW.caller_id; insert into public.notifications(user_id,title,content,link,is_read,notification_type,entity_type,entity_id,metadata,dedupe_key) values(NEW.callee_id,'Incoming '||case when NEW.call_type='video' then 'video' else 'voice' end||' call from '||caller_name,'A call is waiting for you in Avelixa.','/portal/messages',false,'call','call_session',NEW.id,jsonb_build_object('call_type',NEW.call_type,'caller_id',NEW.caller_id,'conversation_id',coalesce(NEW.direct_conversation_id,NEW.admin_conversation_id)),'call-ring:'||NEW.id::text) on conflict(dedupe_key) do nothing; return NEW; end; $$;
drop trigger if exists call_session_notification_trigger on public.call_sessions;
create trigger call_session_notification_trigger after insert on public.call_sessions for each row execute function public.communication_notify_call();
insert into public.user_notification_preferences(user_id) select id from public.profiles on conflict do nothing;
