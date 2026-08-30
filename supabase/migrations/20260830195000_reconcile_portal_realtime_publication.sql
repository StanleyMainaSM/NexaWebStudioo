-- Final realtime/schema reconciliation after the complete Avelixa schema has been built.
-- This preserves the intended publication membership without requiring every
-- table to have existed when the historical realtime migrations ran.

do $$
begin
  if to_regclass('public.call_sessions') is null
    and to_regclass('public.direct_conversations') is not null
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
  end if;
end $$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'public.projects',
    'public.project_tasks',
    'public.invoices',
    'public.payments',
    'public.finance_transactions',
    'public.payouts',
    'public.expenses',
    'public.project_files',
    'public.reviews',
    'public.connector_applications',
    'public.leads',
    'public.commissions',
    'public.notifications',
    'public.messages',
    'public.profiles',
    'public.user_roles',
    'public.audit_logs',
    'public.automation_events',
    'public.maintenance_subscriptions',
    'public.portfolio_items',
    'public.settings',
    'public.notification_email_queue',
    'public.push_deliveries',
    'public.support_conversations',
    'public.support_messages',
    'public.conversations',
    'public.admin_conversations',
    'public.connector_provisioning_events',
    'public.connector_provisioning_queue',
    'public.call_sessions'
  ] loop
    if to_regclass(v_table) is not null then
      begin
        execute format('alter publication supabase_realtime add table %s', v_table);
      exception
        when duplicate_object then null;
      end;
    end if;
  end loop;

  if to_regclass('public.call_sessions') is not null then
    alter table public.call_sessions replica identity full;
  end if;
end $$;
