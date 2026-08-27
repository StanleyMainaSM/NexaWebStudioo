-- Communication integrity / presence support.
-- Keep all direct-message/call reads efficient without exposing a global directory.
create index if not exists direct_messages_conversation_sender_created_idx
  on public.direct_messages (conversation_id, sender_id, created_at desc);

create index if not exists user_presence_online_idx
  on public.user_presence (is_online, last_seen_at desc);

-- The notification trigger uses ON CONFLICT (dedupe_key).  The unique index
-- must be a plain unique index so PostgreSQL can infer the conflict target.
drop index if exists public.notifications_dedupe_key_unique_idx;
create unique index if not exists notifications_dedupe_key_uidx
  on public.notifications (dedupe_key);
