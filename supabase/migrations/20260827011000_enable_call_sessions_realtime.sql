-- call_sessions depends on conversation tables that are introduced later in the
-- historical migration chain. Create it here only when those dependencies already
-- exist; the final realtime/schema reconciliation creates it after the full chain.
do $$
begin
  if to_regclass('public.call_sessions') is not null then
    begin
      alter publication supabase_realtime add table public.call_sessions;
    exception
      when duplicate_object then null;
    end;

    alter table public.call_sessions replica identity full;
  elsif to_regclass('public.direct_conversations') is not null
    and to_regclass('public.admin_conversations') is not null
  then
    create table public.call_sessions (
      id uuid primary key default gen_random_uuid(),
      direct_conversation_id uuid references public.direct_conversations(id) on delete cascade,
      admin_conversation_id uuid references public.admin_conversations(id) on delete cascade,
      caller_id uuid not null references public.profiles(id) on delete cascade,
      callee_id uuid not null references public.profiles(id) on delete cascade,
      call_type text not null check (call_type in ('voice','video')),
      status text not null default 'ringing' check (status in ('ringing','accepted','declined','missed','ended','failed')),
      started_at timestamptz,
      answered_at timestamptz,
      ended_at timestamptz,
      duration_seconds integer,
      created_at timestamptz not null default now(),
      constraint call_sessions_one_context check (
        (direct_conversation_id is not null and admin_conversation_id is null)
        or (direct_conversation_id is null and admin_conversation_id is not null)
      ),
      constraint call_sessions_distinct_users check (caller_id <> callee_id)
    );

    alter publication supabase_realtime add table public.call_sessions;
    alter table public.call_sessions replica identity full;
  end if;
end $$;
