-- Enforce server-only publication for private communication Broadcast channels.
-- Database triggers are the authoritative publishers; clients must not be able to
-- spoof communication Broadcast events directly.

drop policy if exists communication_realtime_user_messages_insert on realtime.messages;
drop policy if exists communication_realtime_user_calls_insert on realtime.messages;
drop policy if exists communication_realtime_call_insert on realtime.messages;
