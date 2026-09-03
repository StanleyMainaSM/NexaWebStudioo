-- Restore the existing Admin messaging relation before the security RPC migration.
-- The production Avelixa architecture already uses public.admin_messages as the
-- child relation of public.admin_conversations. Keep this baseline immediately
-- before 20260829120000 so a clean migration replay establishes the dependency
-- before communication_send_admin_message is compiled.

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.admin_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_messages_content_check
    check (length(trim(content)) >= 1 and length(trim(content)) <= 5000)
);

alter table public.admin_messages enable row level security;

revoke all on table public.admin_messages from anon;
grant select, insert, update, delete on table public.admin_messages to authenticated;

drop policy if exists admin_messages_select_user_or_management on public.admin_messages;
create policy admin_messages_select_user_or_management
on public.admin_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_conversations c
    where c.id = admin_messages.conversation_id
      and (
        c.user_id = (select auth.uid())
        or private.is_admin_or_owner()
      )
  )
);

drop policy if exists admin_messages_insert_user_or_management on public.admin_messages;
create policy admin_messages_insert_user_or_management
on public.admin_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.admin_conversations c
    where c.id = admin_messages.conversation_id
      and (
        (c.user_id = (select auth.uid()) and admin_messages.recipient_id = c.admin_id)
        or (private.is_admin_or_owner() and admin_messages.recipient_id = c.user_id)
      )
  )
);

drop policy if exists admin_messages_update_read_status on public.admin_messages;
create policy admin_messages_update_read_status
on public.admin_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_conversations c
    where c.id = admin_messages.conversation_id
      and (
        c.user_id = (select auth.uid())
        or private.is_admin_or_owner()
      )
  )
)
with check (
  exists (
    select 1
    from public.admin_conversations c
    where c.id = admin_messages.conversation_id
      and (
        c.user_id = (select auth.uid())
        or private.is_admin_or_owner()
      )
  )
);
