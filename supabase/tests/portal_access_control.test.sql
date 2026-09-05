begin;
select no_plan();

select has_schema('private','Private schema is available for server-only portal access state');
select has_table('private','portal_access_passwords','Portal password hashes stay in the private schema');
select has_table('private','portal_access_unlocks','Portal unlock state stays in the private schema');
select has_function('private','verify_portal_access_password',ARRAY['text','text'],'Password verification function exists');
select has_function('private','has_portal_access',ARRAY['text'],'Server-side portal access assertion function exists');
select has_function('private','set_portal_access_password',ARRAY['text','text'],'Owner/Admin portal password management function exists');
select is_definer('private','has_portal_access',ARRAY['text'],'Portal access assertion uses controlled server-side privileges');
select is_definer('private','verify_portal_access_password',ARRAY['text','text'],'Password verification uses controlled server-side privileges');
select is_definer('private','set_portal_access_password',ARRAY['text','text'],'Password configuration uses controlled server-side privileges');

create temporary table t_portal_ids(name text primary key,id uuid not null);
create or replace function pg_temp.make_user(p_name text,p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,crypt('avelixa-test-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
  insert into t_portal_ids values(p_name,v_id);
  return v_id;
end $$;

select pg_temp.make_user('client','avelixa-portal-client@example.test');
select pg_temp.make_user('connector','avelixa-portal-connector@example.test');
select pg_temp.make_user('operator','avelixa-portal-operator@example.test');
select pg_temp.make_user('admin','avelixa-portal-admin@example.test');

insert into public.user_roles(user_id,role)
select id,'client' from t_portal_ids where name='client'
union all select id,'connector' from t_portal_ids where name='connector'
union all select id,'operator' from t_portal_ids where name='operator'
union all select id,'admin' from t_portal_ids where name='admin'
on conflict (user_id, role) do nothing;

-- Auth-created users receive a baseline client role in the existing Avelixa
-- lifecycle. Remove it from the Connector fixture so this is a truly
-- unauthorized-role test rather than a multi-role fixture.
delete from public.user_roles
where user_id = (select id from t_portal_ids where name='connector')
  and role = 'client';

insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
select gen_random_uuid(),id,now(),now(),'aal1',now()+interval '1 hour' from t_portal_ids;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_portal_ids where name='admin')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_portal_ids where name='admin')) )::text,true);
set local role authenticated;
select lives_ok($$select public.set_portal_access_password('client','Client-Portal-Password-123!')$$,'Authorized Admin can configure a portal password');
select lives_ok($$select public.set_portal_access_password('operator','Operator-Portal-Password-123!')$$,'Authorized Admin can configure another portal password');
select lives_ok($$select public.set_portal_access_password('connector','Connector-Portal-Password-123!')$$,'Authorized Admin can configure Connector password');
select lives_ok($$select public.set_portal_access_password('admin','Admin-Portal-Password-123!')$$,'Authorized Admin can configure Admin password');
select lives_ok($$select public.set_portal_access_password('owner','Owner-Portal-Password-123!')$$,'Authorized Admin can configure Owner password without gaining Owner role');
reset role;

select is((select count(*)::bigint from private.portal_access_passwords where password_hash like 'Client-Portal-Password-123!'),0::bigint,'Plaintext Client portal password is never stored');
select is((select count(*)::bigint from private.portal_access_passwords where password_hash like '%Portal-Password%'),0::bigint,'Portal password hashes are not exposed as plaintext values');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_portal_ids where name='client')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_portal_ids where name='client')) )::text,true);
set local role authenticated;
select is(public.verify_portal_access_password('client','Client-Portal-Password-123!'),true,'Authenticated Client with the correct Client password unlocks Client portal');
select is(public.has_portal_access('client'),true,'Unlocked Client portal is recognized server-side');
select is(public.verify_portal_access_password('client','Wrong-Password'),false,'Wrong portal password is rejected');
select is(public.has_portal_access('operator'),false,'Client password cannot unlock Operator portal');
select is(public.verify_portal_access_password('operator','Client-Portal-Password-123!'),false,'A password for one portal cannot unlock another portal');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_portal_ids where name='connector')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_portal_ids where name='connector')) )::text,true);
set local role authenticated;
select is(public.verify_portal_access_password('client','Client-Portal-Password-123!'),false,'A valid password cannot bypass the user role requirement');
select is(public.has_portal_access('client'),false,'Unauthorized role cannot gain portal access without its role');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_portal_ids where name='client')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_portal_ids where name='client')) )::text,true);
set local role authenticated;
select public.verify_portal_access_password('client','Client-Portal-Password-123!');
select is(public.has_portal_access('client'),true,'Unlock is recognized for the authenticated session');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_portal_ids where name='client')::text,'role','authenticated','session_id',gen_random_uuid()::text)::text,true);
set local role authenticated;
select is(public.has_portal_access('client'),false,'Manipulating the client session identifier cannot reuse another session unlock');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_portal_ids where name='client')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_portal_ids where name='client')) )::text,true);
set local role authenticated;
delete from auth.sessions where user_id=auth.uid();
select is(public.has_portal_access('client'),false,'Session termination invalidates the portal unlock');
reset role;

select * from finish();
rollback;
