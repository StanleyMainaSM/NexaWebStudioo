-- Restore the existing call-signaling table in fresh database replays.
-- Production already uses this schema; this baseline makes the repository migration
-- history self-contained before later migrations publish call_signals to Realtime.
create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer', 'answer', 'ice')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists call_signals_call_id_created_at_idx
  on public.call_signals (call_id, created_at);

alter table public.call_signals enable row level security;

drop policy if exists call_signals_insert_participant on public.call_signals;
create policy call_signals_insert_participant
on public.call_signals
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.call_sessions cs
    where cs.id = call_signals.call_id
      and (
        cs.caller_id = (select auth.uid())
        or cs.callee_id = (select auth.uid())
      )
  )
);

drop policy if exists call_signals_select_remote_signals on public.call_signals;
create policy call_signals_select_remote_signals
on public.call_signals
for select
to authenticated
using (
  sender_id <> (select auth.uid())
  and exists (
    select 1
    from public.call_sessions cs
    where cs.id = call_signals.call_id
      and (
        cs.caller_id = (select auth.uid())
        or cs.callee_id = (select auth.uid())
      )
  )
);

grant select, insert on public.call_signals to authenticated;
