-- Communication now uses Postgres Changes directly for message/call delivery.
-- Remove the old database Broadcast transport so it cannot create a second,
-- independently authorized delivery path.
drop trigger if exists direct_messages_broadcast_recipient on public.direct_messages;
drop trigger if exists call_sessions_broadcast_incoming_call on public.call_sessions;
drop function if exists public.broadcast_direct_message();
drop function if exists public.broadcast_incoming_call();
