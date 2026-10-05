-- Restore the database-to-Realtime transport used by the active private communication channels.
-- Client channels remain private and authorization is enforced by existing realtime.messages policies.

create or replace function public.communication_broadcast_direct_message()
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

  if recipient_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = recipient_id and b.blocked_id = new.sender_id)
       or (b.blocker_id = new.sender_id and b.blocked_id = recipient_id)
  ) then
    return new;
  end if;

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

  return new;
end;
$$;

drop trigger if exists direct_messages_broadcast_recipient on public.direct_messages;
create trigger direct_messages_broadcast_recipient
after insert on public.direct_messages
for each row
execute function public.communication_broadcast_direct_message();

revoke execute on function public.communication_broadcast_direct_message() from public, anon, authenticated;


create or replace function public.communication_broadcast_call_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.callee_id is null or new.caller_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status = 'ringing' then
    perform realtime.send(
      jsonb_build_object(
        'call_session', jsonb_build_object(
          'id', new.id,
          'caller_id', new.caller_id,
          'callee_id', new.callee_id,
          'call_type', new.call_type,
          'status', new.status,
          'created_at', new.created_at,
          'direct_conversation_id', new.direct_conversation_id,
          'admin_conversation_id', new.admin_conversation_id
        )
      ),
      'incoming_call',
      'user_calls:' || new.callee_id::text,
      true
    );
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform realtime.send(
      jsonb_build_object(
        'call_session', jsonb_build_object(
          'id', new.id,
          'caller_id', new.caller_id,
          'callee_id', new.callee_id,
          'call_type', new.call_type,
          'status', new.status,
          'created_at', new.created_at,
          'answered_at', new.answered_at,
          'started_at', new.started_at,
          'ended_at', new.ended_at,
          'duration_seconds', new.duration_seconds,
          'direct_conversation_id', new.direct_conversation_id,
          'admin_conversation_id', new.admin_conversation_id
        )
      ),
      'call_session',
      'call:' || new.id::text,
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists call_sessions_realtime_broadcast on public.call_sessions;
create trigger call_sessions_realtime_broadcast
after insert or update of status on public.call_sessions
for each row
execute function public.communication_broadcast_call_session();

revoke execute on function public.communication_broadcast_call_session() from public, anon, authenticated;


create or replace function public.communication_broadcast_call_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'call_signal', jsonb_build_object(
        'id', new.id,
        'call_id', new.call_id,
        'sender_id', new.sender_id,
        'kind', new.kind,
        'payload', new.payload,
        'created_at', new.created_at
      )
    ),
    'call_signal',
    'call:' || new.call_id::text,
    true
  );

  return new;
end;
$$;

drop trigger if exists call_signals_realtime_broadcast on public.call_signals;
create trigger call_signals_realtime_broadcast
after insert on public.call_signals
for each row
execute function public.communication_broadcast_call_signal();

revoke execute on function public.communication_broadcast_call_signal() from public, anon, authenticated;
