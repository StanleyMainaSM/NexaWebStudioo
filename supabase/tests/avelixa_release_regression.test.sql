begin;

select no_plan();

-- The release test suite intentionally runs inside one transaction. Supabase's
-- pgTAP runner rolls the test transaction back, so all test data is disposable.

-- -----------------------------------------------------------------------------
-- Migration-chain and object checks
-- -----------------------------------------------------------------------------
select results_eq(
  $$
    select version::text
    from supabase_migrations.schema_migrations
    where version in (
      '20260830200000',
      '20260830210000',
      '20260830220000',
      '20260830223000'
    )
    order by version, name
  $$,
  $$values
    ('20260830200000'),
    ('20260830210000'),
    ('20260830210000'),
    ('20260830220000'),
    ('20260830220000'),
    ('20260830223000')$$,
  'All six post-production migration entries execute in deterministic timestamp/name order'
);

select has_trigger('public', 'invoices', 'trg_avelixa_invoice_workflow', 'Canonical invoice workflow trigger exists');
select hasnt_trigger('public', 'invoices', 'trg_notify_invoice_workflow_change', 'Legacy duplicate invoice workflow trigger is removed');
select has_trigger('public', 'profiles', 'trg_protect_client_referrer_attribution', 'Client referral attribution protection trigger exists after 30223000');
select has_trigger('public', 'leads', 'trg_avelixa_connector_lead_workflow', 'Connector lead workflow trigger exists');
select has_trigger('public', 'referral_bonuses', 'trg_avelixa_connector_referral_notification', 'Connector referral completion notification trigger exists');
select has_index('public', 'commissions', 'commissions_payment_id_uidx', 'Commission payment idempotency index remains');
select hasnt_index('public', 'commissions', 'commissions_payment_id_unique_idx', 'Redundant commission payment index is removed');

select ok(
  pg_get_functiondef('public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text)'::regprocedure)
    ilike '%is_active%'
    and pg_get_functiondef('public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text)'::regprocedure)
    ilike '%no longer active%',
  'Final client referral onboarding function retains active-Connector validation'
);

select ok(
  pg_get_functiondef('private.protect_client_referrer_attribution()'::regprocedure)
    ilike '%Client referral attribution cannot be changed%',
  'Final attribution protection function remains immutable for authenticated non-management callers'
);

-- -----------------------------------------------------------------------------
-- Local test users
-- -----------------------------------------------------------------------------
create temporary table test_ids (
  name text primary key,
  user_id uuid not null
) on commit drop;

create or replace function pg_temp.make_test_user(
  p_name text,
  p_email text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('avelixa-test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    coalesce(p_metadata, '{}'::jsonb),
    false,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into test_ids(name, user_id) values (p_name, v_id);
  return v_id;
end;
$$;

select pg_temp.make_test_user('owner', 'avelixa-test-owner@example.test');
select pg_temp.make_test_user('client_a', 'avelixa-client-a@example.test');
select pg_temp.make_test_user('client_b', 'avelixa-client-b@example.test');
select pg_temp.make_test_user('connector_a', 'avelixa-connector-a@example.test');
select pg_temp.make_test_user('connector_b', 'avelixa-connector-b@example.test');
select pg_temp.make_test_user('inactive_connector', 'avelixa-inactive-connector@example.test');

-- Convert the automatically-created client roles into the roles required by tests.
delete from public.user_roles where user_id in (
  select user_id from test_ids where name in ('owner','connector_a','connector_b','inactive_connector')
);

insert into public.user_roles(user_id, role)
select user_id, 'owner' from test_ids where name = 'owner'
union all
select user_id, 'connector' from test_ids where name = 'connector_a'
union all
select user_id, 'connector' from test_ids where name = 'connector_b'
union all
select user_id, 'connector' from test_ids where name = 'inactive_connector';

insert into public.connector_profiles(user_id, avl_id, commission_rate, is_active)
select user_id, avl_id, 20.00, active
from (
  values
    ('connector_a', 'AVL-TEST-A', true),
    ('connector_b', 'AVL-TEST-B', true),
    ('inactive_connector', 'AVL-TEST-INACTIVE', false)
) v(name, avl_id, active)
join test_ids t on t.name = v.name;

-- -----------------------------------------------------------------------------
-- Referral signup attribution and onboarding
-- -----------------------------------------------------------------------------
select lives_ok(
  $$
    select pg_temp.make_test_user(
      'referred_client',
      'avelixa-referred-client@example.test',
      jsonb_build_object('client_referral_avl_id', 'AVL-TEST-A', 'full_name', 'Referred Client')
    )
  $$,
  'Authenticated client signup with an active Connector referral succeeds'
);

select is(
  (select p.client_referrer_connector_id
   from public.profiles p
   where p.id = (select user_id from test_ids where name = 'referred_client')),
  (select user_id from test_ids where name = 'connector_a'),
  'Referral attribution is captured from the active Connector AVL ID'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text)',
    'EXECUTE'
  ),
  'Anonymous execution of client referral onboarding is revoked'
);

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'referred_client')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;

select lives_ok(
  $$
    select public.complete_client_referral_onboarding(
      'Test Business', 'Technology', 'Test Client', '+254700000001',
      'Build an Avelixa test website', 50000, '30 days'
    )
  $$,
  'Authenticated referred Client can complete self-onboarding'
);

select results_eq(
  $$select count(*)::bigint from public.leads where client_id = (select user_id from test_ids where name = 'referred_client')$$,
  $$values (1::bigint)$$,
  'Client referral onboarding creates exactly one client-owned lead'
);

select lives_ok(
  $$
    select public.complete_client_referral_onboarding(
      'Test Business Retry', 'Technology', 'Test Client', '+254700000001',
      'Retry should remain idempotent', 99999, 'Later'
    )
  $$,
  'Repeated referral onboarding remains idempotent'
);

select results_eq(
  $$select count(*)::bigint from public.leads where client_id = (select user_id from test_ids where name = 'referred_client')$$,
  $$values (1::bigint)$$,
  'Repeated onboarding does not create a second lead'
);

-- Inactive Connector must be rejected at onboarding time.
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'client_a')::text,
  'role', 'authenticated'
)::text, true);

reset role;
update public.profiles
set client_referrer_connector_id = (select user_id from test_ids where name = 'inactive_connector')
where id = (select user_id from test_ids where name = 'client_a');
set local role authenticated;

select throws_ok(
  $$select public.complete_client_referral_onboarding('Inactive Referral','Technology','Client A','+254700000002','Should fail',1000,'Now')$$,
  NULL,
  'The Connector who referred this account is no longer active',
  'Inactive Connector referral onboarding is rejected'
);

-- Referral attribution cannot be changed by an authenticated Client.
select throws_ok(
  $$update public.profiles
    set client_referrer_connector_id = (select user_id from test_ids where name = 'connector_b')
    where id = (select user_id from test_ids where name = 'client_a')$$,
  NULL,
  'Client referral attribution cannot be changed',
  'Authenticated Client cannot change immutable referral attribution'
);

reset role;

-- -----------------------------------------------------------------------------
-- Connector and Client notifications
-- -----------------------------------------------------------------------------
insert into public.businesses(name, industry, contact_name, email, phone)
values ('Notification Test Business', 'Technology', 'Client B', 'client-b@example.test', '+254700000003')
returning id into temporary table test_business_id;

insert into public.leads(
  business_id,
  client_id,
  connector_id,
  title,
  requirements,
  estimated_budget,
  status
)
select
  (select id from test_business_id),
  (select user_id from test_ids where name = 'client_b'),
  (select user_id from test_ids where name = 'connector_a'),
  'Notification Test Lead',
  'Verify connector and client notification workflow',
  25000,
  'pending';

select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = (select user_id from test_ids where name = 'connector_a')
      and title = 'Lead submitted'
      and content ilike '%Notification Test Lead%'
  $$,
  $$values (1::bigint)$$,
  'Connector receives lead workflow notification'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = (select user_id from test_ids where name = 'client_b')
      and title = 'Request submitted'
      and content ilike '%Notification Test Lead%'
  $$,
  $$values (1::bigint)$$,
  'Client receives corresponding lead workflow notification'
);

insert into public.referral_bonuses(referrer_id, referred_connector_id, amount, status)
select
  (select user_id from test_ids where name = 'connector_a'),
  (select user_id from test_ids where name = 'connector_b'),
  0,
  'approved';

select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = (select user_id from test_ids where name = 'connector_a')
      and title = 'Successful referral'
  $$,
  $$values (1::bigint)$$,
  'Connector referral completion notification is emitted'
);

-- -----------------------------------------------------------------------------
-- Project files and Client isolation
-- -----------------------------------------------------------------------------
reset role;
insert into public.projects(client_id, connector_id, title, description, status, price)
select
  (select user_id from test_ids where name = 'client_a'),
  (select user_id from test_ids where name = 'connector_a'),
  'Client A Security Project',
  'Security test project',
  'in_progress',
  100000;

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'client_a')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;

select lives_ok(
  $$
    insert into public.project_files(project_id, uploaded_by, file_name, storage_path, is_internal)
    select p.id, auth.uid(), 'client-visible.txt', 'test/client-visible.txt', false
    from public.projects p
    where p.title = 'Client A Security Project'
  $$,
  'Client can create a permitted non-internal project file'
);

select throws_ok(
  $$
    insert into public.project_files(project_id, uploaded_by, file_name, storage_path, is_internal)
    select p.id, auth.uid(), 'client-internal.txt', 'test/client-internal.txt', true
    from public.projects p
    where p.title = 'Client A Security Project'
  $$,
  '42501',
  'Client cannot mark a project file internal'
);

-- -----------------------------------------------------------------------------
-- Invoice workflow and email queue preservation
-- -----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);

create temporary table invoice_test_ids(id uuid);
insert into public.invoices(project_id, client_id, amount, status, due_date)
select p.id, (select user_id from test_ids where name = 'client_a'), 100000, 'unpaid', current_date + 30
from public.projects p
where p.title = 'Client A Security Project'
returning id into invoice_test_ids;

select results_eq(
  $$
    select count(*)::bigint
    from public.notifications
    where user_id = (select user_id from test_ids where name = 'client_a')
      and link = '/portal/invoices/' || (select id::text from invoice_test_ids)
      and title = 'New invoice available'
  $$,
  $$values (1::bigint)$$,
  'One invoice event produces one Client notification'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.notifications_queue_email
    where notification_id in (
      select id from public.notifications
      where user_id = (select user_id from test_ids where name = 'client_a')
        and link = '/portal/invoices/' || (select id::text from invoice_test_ids)
    )
  $$,
  $$values (1::bigint)$$,
  'Invoice notification remains connected to exactly one email-queue entry'
);

-- -----------------------------------------------------------------------------
-- Client payment submission, partial verification and commission handoff
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'client_a')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;

select lives_ok(
  $$select public.submit_invoice_payment((select id from invoice_test_ids), 30000, 'mpesa', 'AVL-TEST-30000')$$,
  'Client can submit a legitimate partial payment'
);

select results_eq(
  $$select count(*)::bigint from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 30000 and status = 'pending'$$,
  $$values (1::bigint)$$,
  'Submitted partial payment is pending'
);

select throws_ok(
  $$select public.submit_invoice_payment((select id from invoice_test_ids), 0, 'mpesa', 'AVL-TEST-ZERO')$$,
  NULL,
  'Zero payment amount is rejected'
);

select throws_ok(
  $$select public.submit_invoice_payment((select id from invoice_test_ids), 70001, 'mpesa', 'AVL-TEST-OVER')$$,
  NULL,
  'Payment above the current remaining balance is rejected'
);

-- Client cannot verify the pending payment.
select throws_ok(
  $$select public.verify_invoice_payment((select id from public.payments where invoice_id = (select id from invoice_test_ids) order by created_at desc limit 1), 'completed', 'Client attempt')$$,
  NULL,
  'Client cannot verify or complete a payment'
);

-- Direct payment insertion is also blocked by RLS.
select throws_ok(
  $$insert into public.payments(invoice_id, amount, status) values ((select id from invoice_test_ids), 1, 'completed')$$,
  '42501',
  'Client cannot manufacture a completed payment through direct INSERT'
);

-- Owner verifies the first partial payment.
reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'owner')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;

select lives_ok(
  $$select public.verify_invoice_payment((select id from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 30000 limit 1), 'completed', 'Verified partial payment')$$,
  'Owner can verify a legitimate partial payment'
);

select results_eq(
  $$select status from public.invoices where id = (select id from invoice_test_ids)$$,
  $$values ('unpaid'::text)$$,
  'Invoice remains unpaid after a partial completed payment'
);

select results_eq(
  $$select count(*)::bigint from public.commissions where payment_id = (select id from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 30000 limit 1)$$,
  $$values (1::bigint)$$,
  'Completed payment creates exactly one connector commission'
);

select results_eq(
  $$select eligible_amount, amount from public.commissions where payment_id = (select id from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 30000 limit 1)$$,
  $$values (30000::numeric, 6000::numeric)$$,
  'Commission amount is derived from the verified payment amount and connector rate'
);

-- Reprocessing the same completed payment remains idempotent.
select lives_ok(
  $$update public.payments set status = 'completed' where id = (select id from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 30000 limit 1)$$,
  'Reprocessing a completed payment does not fail'
);

select results_eq(
  $$select count(*)::bigint from public.commissions where payment_id = (select id from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 30000 limit 1)$$,
  $$values (1::bigint)$$,
  'Reprocessing a completed payment leaves exactly one commission'
);

-- Second and final partial payments settle the invoice cumulatively.
reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'client_a')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;
select public.submit_invoice_payment((select id from invoice_test_ids), 20000, 'mpesa', 'AVL-TEST-20000');

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'owner')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;
select public.verify_invoice_payment((select id from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 20000 limit 1), 'completed', 'Verified second partial payment');

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'client_a')::text,
  'role', 'authenticated'
)::text, true;
set local role authenticated;
select public.submit_invoice_payment((select id from invoice_test_ids), 50000, 'mpesa', 'AVL-TEST-50000');

reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'owner')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;
select public.verify_invoice_payment((select id from public.payments where invoice_id = (select id from invoice_test_ids) and amount = 50000 limit 1), 'completed', 'Verified final payment');

select results_eq(
  $$select status from public.invoices where id = (select id from invoice_test_ids)$$,
  $$values ('paid'::text)$$,
  'Cumulative completed payments settle the invoice only after the full balance is paid'
);

select throws_ok(
  $$select public.submit_invoice_payment((select id from invoice_test_ids), 1, 'mpesa', 'AVL-TEST-AFTER-PAID')$$,
  NULL,
  'Payment against an already-paid invoice is rejected'
);

-- -----------------------------------------------------------------------------
-- Commission and payout isolation
-- -----------------------------------------------------------------------------
reset role;
insert into public.commissions(connector_id, project_id, eligible_amount, commission_percentage, amount, status)
select (select user_id from test_ids where name = 'connector_b'),
       p.id, 1000, 20, 200, 'pending'
from public.projects p
where p.title = 'Client A Security Project';

insert into public.payouts(recipient_id, recipient_role, project_id, amount, status)
select (select user_id from test_ids where name = 'connector_a'), 'connector', p.id, 4000, 'pending'
from public.projects p
where p.title = 'Client A Security Project';

insert into public.payouts(recipient_id, recipient_role, project_id, amount, status)
select (select user_id from test_ids where name = 'connector_b'), 'connector', p.id, 2000, 'pending'
from public.projects p
where p.title = 'Client A Security Project';

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'connector_a')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.commissions$$,
  $$values (1::bigint)$$,
  'Connector A cannot read Connector B commission records'
);

select results_eq(
  $$select count(*)::bigint from public.payouts$$,
  $$values (1::bigint)$$,
  'Connector A can see only the payout addressed to Connector A'
);

-- Client A can see only Client A notifications.
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'client_a')::text,
  'role', 'authenticated'
)::text, true);

select results_eq(
  $$select count(*)::bigint from public.notifications where title = 'Isolation A'$$,
  $$values (0::bigint)$$,
  'No unrelated isolation notification is visible to Client A'
);

reset role;
insert into public.notifications(user_id, title, content)
select (select user_id from test_ids where name = 'client_a'), 'Isolation A', 'Client A only';
insert into public.notifications(user_id, title, content)
select (select user_id from test_ids where name = 'client_b'), 'Isolation B', 'Client B only';

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from test_ids where name = 'client_a')::text,
  'role', 'authenticated'
)::text, true);
set local role authenticated;
select results_eq(
  $$select title from public.notifications where title like 'Isolation %' order by title$$,
  $$values ('Isolation A'::text)$$,
  'Client A cannot read Client B notifications'
);

-- -----------------------------------------------------------------------------
-- Maintenance cumulative-settlement protection
-- -----------------------------------------------------------------------------
reset role;
select ok(to_regclass('public.recurring_services') is not null, 'Recurring maintenance service table exists for settlement testing');

select ok(
  pg_get_functiondef('public.sync_maintenance_subscription_after_payment()'::regprocedure)
    ilike '%sum(p.amount)%'
    and pg_get_functiondef('public.sync_maintenance_subscription_after_payment()'::regprocedure)
    ilike '%v_invoice_fully_paid%',
  'Maintenance settlement function uses cumulative completed payments'
);

select ok(
  pg_get_functiondef('public.sync_maintenance_subscription_after_payment()'::regprocedure)
    ilike '%status = ''past_due''%',
  'Maintenance settlement function protects partial-payment state'
);

select * from finish();
rollback;
