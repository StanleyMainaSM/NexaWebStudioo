-- Keep conversation reads efficient and deterministic.
create index if not exists direct_conversations_updated_idx
  on public.direct_conversations (updated_at desc);

-- Calls and messages share one chronological timeline in the client.
create index if not exists call_sessions_conversation_created_idx
  on public.call_sessions (direct_conversation_id, created_at asc);
