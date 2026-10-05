do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'call_signals'
  ) then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;

create or replace function public.broadcast_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
begin
  select dcp.user_id
    into recipient_id
  from public.direct_conversation_participants dcp
  where dcp.conversation_id = new.conversation_id
    and dcp.user_id <> new.sender_id
  order by dcp.created_at asc
  limit 1;

  if recipient_id is not null then
    perform realtime.send(
      jsonb_build_object(
        'message', jsonb_build_object(
          'id', new.id,
          'conversation_id', new.conversation_id,
          'sender_id', new.sender_id,
          'content', new.content,
          'read_at', new.read_at,
          'created_at', new.created_at
        )
      ),
      'direct_message',
      'user_messages:' || recipient_id::text,
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists direct_messages_broadcast_recipient on public.direct_messages;
create trigger direct_messages_broadcast_recipient
after insert on public.direct_messages
for each row execute function public.broadcast_direct_message();

revoke execute on function public.broadcast_direct_message() from public, anon, authenticated;

drop policy if exists communication_realtime_user_messages_select on realtime.messages;
create policy communication_realtime_user_messages_select
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'user_messages:' || (select auth.uid())::text
);

create policy communication_realtime_user_messages_insert
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) = 'user_messages:' || (select auth.uid())::text
  and extension = 'broadcast'
);
