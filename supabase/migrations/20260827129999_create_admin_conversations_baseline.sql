-- The communication-system migration references admin_conversations before its
-- later historical creation point. Create the baseline relation first; the later
-- migration can safely continue with CREATE TABLE IF NOT EXISTS.
create table if not exists public.admin_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  subject text,
  status text not null default 'open' check (status in ('open','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_conversations_pair_unique unique (user_id, admin_id)
);
