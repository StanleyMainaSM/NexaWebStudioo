create table if not exists public.chat_contact_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  contact_name text not null,
  status text not null default 'sent' check (status in ('sent','accepted','expired','cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index if not exists chat_contact_invitations_inviter_email_active_idx on public.chat_contact_invitations(inviter_id, lower(email)) where status='sent';
alter table public.chat_contact_invitations enable row level security;
drop policy if exists chat_contact_invitations_select_own on public.chat_contact_invitations;
create policy chat_contact_invitations_select_own on public.chat_contact_invitations for select to authenticated using ((select auth.uid())=inviter_id);
drop policy if exists chat_contact_invitations_insert_own on public.chat_contact_invitations;
create policy chat_contact_invitations_insert_own on public.chat_contact_invitations for insert to authenticated with check ((select auth.uid())=inviter_id);
grant select,insert on public.chat_contact_invitations to authenticated;
