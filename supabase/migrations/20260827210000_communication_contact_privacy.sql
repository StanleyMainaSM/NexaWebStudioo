-- Communication privacy: users may only discover users they explicitly search for;
-- this migration documents the policy boundary used by the communication RPCs.
-- No directory/count endpoint is introduced here.

create index if not exists direct_messages_conversation_created_idx
  on public.direct_messages (conversation_id, created_at desc);

create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, is_read, created_at desc);
