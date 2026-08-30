-- Keep portal views synchronized with database changes while they are open.
-- Tables that did not yet exist in the historical migration baseline are added
-- by the final realtime reconciliation migration after the complete schema chain.
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
    'public.connector_provisioning_queue'
  ] loop
    if to_regclass(v_table) is not null then
      begin
        execute format('alter publication supabase_realtime add table %s', v_table);
      exception
        when duplicate_object then null;
      end;
    end if;
  end loop;
end $$;
