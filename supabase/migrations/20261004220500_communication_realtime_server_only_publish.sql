-- Client browsers never publish communication broadcasts directly.
-- The database trigger functions use SECURITY DEFINER + realtime.send() as the
-- authoritative server-side transport. Remove client-side INSERT privileges on
-- the private communication topics so authenticated users cannot spoof another
-- user's inbox or inject fake call events/signals.
drop policy if exists communication_realtime_user_messages_insert on realtime.messages;
drop policy if exists communication_realtime_user_calls_insert on realtime.messages;
drop policy if exists communication_realtime_call_insert on realtime.messages;
