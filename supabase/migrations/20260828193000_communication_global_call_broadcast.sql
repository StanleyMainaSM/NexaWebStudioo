create or replace function public.broadcast_incoming_call()
returns trigger
security definer
set search_path = ''
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' and NEW.callee_id is not null and NEW.status = 'ringing' then
    perform realtime.send(
      jsonb_build_object(
        'call_id', NEW.id,
        'callee_id', NEW.callee_id,
        'caller_id', NEW.caller_id,
        'call_type', NEW.call_type,
        'status', NEW.status,
        'direct_conversation_id', NEW.direct_conversation_id,
        'admin_conversation_id', NEW.admin_conversation_id
      ),
      'incoming_call',
      'user_calls:' || NEW.callee_id::text,
      true
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists call_sessions_broadcast_incoming_call on public.call_sessions;
create trigger call_sessions_broadcast_incoming_call
after insert on public.call_sessions
for each row execute function public.broadcast_incoming_call();

revoke execute on function public.broadcast_incoming_call() from public, anon, authenticated;
