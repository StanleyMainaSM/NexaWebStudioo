begin;
select no_plan();

select is((select count(*)::bigint from supabase_migrations.schema_migrations where version in ('20260830200000','20260830210000','20260830210001','20260830220000','20260830220001','20260830223000')),6::bigint,'All six release migrations execute with unique ordered versions');
select has_trigger('public','invoices','trg_avelixa_invoice_workflow','Exactly one canonical invoice workflow trigger exists');
select hasnt_trigger('public','invoices','trg_notify_invoice_workflow_change','Legacy duplicate invoice trigger is gone');
select has_trigger('public','profiles','trg_protect_client_referrer_attribution','Referral attribution protection trigger exists');
select has_trigger('public','leads','trg_avelixa_connector_lead_workflow','Connector lead workflow trigger exists');
select has_trigger('public','referral_bonuses','trg_avelixa_connector_referral_notification','Referral completion notification trigger exists');
select has_index('public','commissions','commissions_payment_id_uidx','Commission payment idempotency index exists');
select hasnt_index('public','commissions','commissions_payment_id_unique_idx','Redundant commission payment index is removed');
select ok(pg_get_functiondef('public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text)'::regprocedure) ilike '%is_active%' and pg_get_functiondef('public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text)'::regprocedure) ilike '%no longer active%','Final referral onboarding function checks active Connector state');
select ok(pg_get_functiondef('public.verify_invoice_payment(uuid,text,text)'::regprocedure) ilike '%remaining_balance%' and pg_get_functiondef('public.verify_invoice_payment(uuid,text,text)'::regprocedure) ilike '%sum(p.amount)%','Final payment verification uses cumulative remaining balance');
select ok(pg_get_functiondef('public.sync_maintenance_subscription_after_payment()'::regprocedure) ilike '%sum(p.amount)%' and pg_get_functiondef('public.sync_maintenance_subscription_after_payment()'::regprocedure) ilike '%v_invoice_fully_paid%','Maintenance settlement uses cumulative completed payments');
select ok(pg_get_functiondef('public.create_connector_commission_for_payment()'::regprocedure) ilike '%invoice%' and pg_get_functiondef('public.create_connector_commission_for_payment()'::regprocedure) ilike '%project%' and pg_get_functiondef('public.create_connector_commission_for_payment()'::regprocedure) ilike '%connector%','Commission creation derives payment to invoice to project to connector');
select ok(not has_function_privilege('anon','public.complete_client_referral_onboarding(text,text,text,text,text,numeric,text)','EXECUTE'),'Anonymous referral onboarding execution is revoked');

create temporary table t_ids(name text primary key, id uuid not null);
grant select on t_ids to authenticated;
create or replace function pg_temp.make_user(p_name text,p_email text,p_meta jsonb default '{}'::jsonb) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid(); begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,crypt('avelixa-test-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,coalesce(p_meta,'{}'::jsonb),now(),now());
  insert into t_ids values(p_name,v_id); return v_id; end $$;
select pg_temp.make_user('owner','avelixa-test-owner@example.test');
select pg_temp.make_user('client_a','avelixa-test-client-a@example.test');
select pg_temp.make_user('client_b','avelixa-test-client-b@example.test');
select pg_temp.make_user('connector_a','avelixa-test-connector-a@example.test');
select pg_temp.make_user('connector_b','avelixa-test-connector-b@example.test');
select pg_temp.make_user('inactive_connector','avelixa-test-inactive@example.test');
set local session_replication_role = replica;
delete from public.user_roles where user_id in (select id from t_ids where name in ('owner','connector_a','connector_b','inactive_connector'));
insert into public.user_roles(user_id,role) select id,'owner' from t_ids where name='owner' union all select id,'connector' from t_ids where name='connector_a' union all select id,'connector' from t_ids where name='connector_b' union all select id,'connector' from t_ids where name='inactive_connector';
set local session_replication_role = origin;
insert into public.connector_profiles(user_id,avl_id,commission_rate,is_active) select t.id,v.avl_id,v.rate,v.active from t_ids t join (values('connector_a','AVL-TEST-A',20.00,true),('connector_b','AVL-TEST-B',20.00,true),('inactive_connector','AVL-TEST-I',20.00,false)) v(name,avl_id,rate,active) on v.name=t.name;

select pg_temp.make_user('referred_client','avelixa-test-referred@example.test',jsonb_build_object('client_referral_avl_id','AVL-TEST-A','full_name','Referred Client'));
select is((select client_referrer_connector_id from public.profiles where id=(select id from t_ids where name='referred_client')),(select id from t_ids where name='connector_a'),'Active Connector referral is captured during signup');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='referred_client')::text,'role','authenticated')::text,true); set local role authenticated;
select lives_ok($$select public.complete_client_referral_onboarding('Test Business','Technology','Test Client','+254700000001','Requirements',50000,'30 days')$$,'Authenticated referred Client can onboard');
select is((select count(*)::bigint from public.leads where client_id=auth.uid()),1::bigint,'Referral onboarding creates one Lead');
select lives_ok($$select public.complete_client_referral_onboarding('Test Business Retry','Technology','Test Client','+254700000001','Retry',1,'Later')$$,'Repeated onboarding is idempotent');
select is((select count(*)::bigint from public.leads where client_id=auth.uid()),1::bigint,'Repeated onboarding keeps exactly one Lead');

reset role; set local session_replication_role = replica;
update public.profiles set client_referrer_connector_id=(select id from t_ids where name='inactive_connector') where id=(select id from t_ids where name='client_a');
set local session_replication_role = origin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='client_a')::text,'role','authenticated')::text,true); set local role authenticated;
select throws_ok($$select public.complete_client_referral_onboarding('Inactive','Technology','Client','+254700000002','Should fail',1,'Now')$$,NULL,'The Connector who referred this account is no longer active','Inactive Connector referral is rejected');
select throws_ok($$update public.profiles set client_referrer_connector_id=(select id from public.profiles where email='avelixa-test-connector-b@example.test') where id=auth.uid()$$,NULL,'Client referral attribution cannot be changed','Authenticated Client cannot change referral attribution');
reset role;

insert into public.projects(client_id,connector_id,title,description,status,price) select (select id from t_ids where name='client_a'),(select id from t_ids where name='connector_a'),'Release Test Project','Release regression project','in_progress',100000;
create temporary table t_invoice(id uuid);
grant select on t_invoice to authenticated;
with inserted_invoice as (
  insert into public.invoices(project_id,client_id,amount,status,due_date)
  select p.id,(select id from t_ids where name='client_a'),100000,'unpaid',current_date+30
  from public.projects p where p.title='Release Test Project'
  returning id
)
insert into t_invoice(id) select id from inserted_invoice;
select is((select count(*)::bigint from public.notifications where user_id=(select id from t_ids where name='client_a') and link='/portal/invoices/'||(select id::text from t_invoice) and title='New invoice available'),1::bigint,'Invoice event creates exactly one Client notification');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='client_a')::text,'role','authenticated')::text,true); set local role authenticated;
select lives_ok($$insert into public.project_files(project_id,uploaded_by,file_name,storage_path,is_internal) select p.id,auth.uid(),'visible.txt','test/visible.txt',false from public.projects p where p.title='Release Test Project'$$,'Client can insert a non-internal project file');
select throws_ok($$insert into public.project_files(project_id,uploaded_by,file_name,storage_path,is_internal) select p.id,auth.uid(),'internal.txt','test/internal.txt',true from public.projects p where p.title='Release Test Project'$$,'42501','Client cannot create an internal project file');
select lives_ok($$select public.submit_invoice_payment((select id from t_invoice),30000,'mpesa','TEST-30000')$$,'Client can submit a legitimate partial payment');
select is((select count(*)::bigint from public.payments where invoice_id=(select id from t_invoice) and amount=30000 and status='pending'),1::bigint,'Partial payment is stored as pending');
select throws_ok($$select public.submit_invoice_payment((select id from t_invoice),0,'mpesa','TEST-ZERO')$$,NULL,'Zero payment is rejected');
select throws_ok($$select public.submit_invoice_payment((select id from t_invoice),70001,'mpesa','TEST-OVER')$$,NULL,'Payment above remaining balance is rejected');
select throws_ok($$select public.verify_invoice_payment((select id from public.payments where invoice_id=(select id from t_invoice) order by created_at desc limit 1),'completed','Client attempt')$$,NULL,'Client cannot verify a payment');
select throws_ok($$insert into public.payments(invoice_id,amount,status) values((select id from t_invoice),1,'completed')$$,'42501','Client cannot directly manufacture a completed payment');

reset role; set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='owner')::text,'role','authenticated')::text,true); set local role authenticated;
select lives_ok($$select public.verify_invoice_payment((select id from public.payments where invoice_id=(select id from t_invoice) and amount=30000 limit 1),'completed','Verified')$$,'Owner can verify a partial payment');
select is((select status from public.invoices where id=(select id from t_invoice)),'unpaid'::text,'Invoice remains unpaid after a partial verified payment');
select is((select count(*)::bigint from public.commissions where payment_id=(select id from public.payments where invoice_id=(select id from t_invoice) and amount=30000 limit 1)),1::bigint,'Verified payment creates exactly one commission');
select is((select eligible_amount from public.commissions where payment_id=(select id from public.payments where invoice_id=(select id from t_invoice) and amount=30000 limit 1)),30000::numeric,'Commission eligible amount follows the verified payment');
select is((select amount from public.commissions where payment_id=(select id from public.payments where invoice_id=(select id from t_invoice) and amount=30000 limit 1)),6000::numeric,'Commission follows the 20 percent rate');
select lives_ok($$update public.payments set status='completed' where id=(select id from public.payments where invoice_id=(select id from t_invoice) and amount=30000 limit 1)$$,'Reprocessing a completed payment remains safe');
select is((select count(*)::bigint from public.commissions where payment_id=(select id from public.payments where invoice_id=(select id from t_invoice) and amount=30000 limit 1)),1::bigint,'Commission creation is idempotent');

reset role; set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='client_a')::text,'role','authenticated')::text,true); set local role authenticated;
select public.submit_invoice_payment((select id from t_invoice),70000,'mpesa','TEST-70000');
reset role; set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='owner')::text,'role','authenticated')::text,true); set local role authenticated;
select public.verify_invoice_payment((select id from public.payments where invoice_id=(select id from t_invoice) and amount=70000 limit 1),'completed','Final verified payment');
select is((select status from public.invoices where id=(select id from t_invoice)),'paid'::text,'Cumulative completed payments settle the invoice only at full payment');
select throws_ok($$select public.submit_invoice_payment((select id from t_invoice),1,'mpesa','AFTER-PAID')$$,NULL,'Already-paid invoice rejects another payment');

reset role;
insert into public.notifications(user_id,title,content) select (select id from t_ids where name='client_a'),'Isolation A','A only';
insert into public.notifications(user_id,title,content) select (select id from t_ids where name='client_b'),'Isolation B','B only';
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='client_a')::text,'role','authenticated')::text,true); set local role authenticated;
select is((select count(*)::bigint from public.notifications where title like 'Isolation %'),1::bigint,'Client A cannot read Client B notifications');
reset role;
insert into public.commissions(connector_id,project_id,eligible_amount,commission_percentage,amount,status) select (select id from t_ids where name='connector_b'),p.id,1000,20,200,'pending' from public.projects p where p.title='Release Test Project';
insert into public.payouts(recipient_id,recipient_role,project_id,amount,status) select (select id from t_ids where name='connector_a'),'connector',p.id,4000,'pending' from public.projects p where p.title='Release Test Project';
insert into public.payouts(recipient_id,recipient_role,project_id,amount,status) select (select id from t_ids where name='connector_b'),'connector',p.id,2000,'pending' from public.projects p where p.title='Release Test Project';
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='connector_a')::text,'role','authenticated')::text,true); set local role authenticated;
select is((select count(*)::bigint from public.commissions),1::bigint,'Connector A cannot read Connector B commission');
select is((select count(*)::bigint from public.payouts),1::bigint,'Connector A sees only Connector A payout');
select ok(to_regclass('public.maintenance_subscriptions') is not null,'Maintenance subscription table exists');
select ok(to_regclass('public.recurring_services') is not null,'Recurring service table exists');
select ok(pg_get_functiondef('public.sync_maintenance_subscription_after_payment()'::regprocedure) ilike '%status=''past_due''%','Maintenance partial-payment protection remains in final function');
select * from finish();
rollback;
