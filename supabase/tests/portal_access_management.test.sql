begin;
select no_plan();

create temporary table t_stage3_users(name text primary key,id uuid not null);
create or replace function pg_temp.make_stage3_user(p_name text,p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,crypt('avelixa-stage3-auth',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
  insert into t_stage3_users values(p_name,v_id);
  return v_id;
end $$;

select pg_temp.make_stage3_user('owner','avelixa-stage3-owner@example.test');
select pg_temp.make_stage3_user('admin','avelixa-stage3-admin@example.test');
select pg_temp.make_stage3_user('client','avelixa-stage3-client@example.test');

insert into public.user_roles(user_id,role)
select id,'owner' from t_stage3_users where name='owner'
union all select id,'admin' from t_stage3_users where name='admin'
union all select id,'client' from t_stage3_users where name='client'
on conflict (user_id, role) do nothing;

insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
select gen_random_uuid(),id,now(),now(),'aal1',now()+interval '1 hour' from t_stage3_users;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_stage3_users where name='owner')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_stage3_users where name='owner')) )::text,true);
set local role authenticated;
select is((select count(*) from public.get_portal_access_status()),5::bigint,'Owner can see status for all five portals');
select is(public.set_portal_access_password('client','Stage3-Old-Password-123!'),true,'Owner can configure a portal password');
select is(public.set_portal_access_password('client','Stage3-New-Password-456!'),true,'Owner can change an existing portal password');
select is(public.verify_portal_access_password('client','Stage3-Old-Password-123!'),false,'Old portal password stops working after change');
select is(public.verify_portal_access_password('client','Stage3-New-Password-456!'),true,'New portal password works after change');
select is((select count(*) from public.get_portal_access_status() where portal='client' and configured),1::bigint,'Configured state is reported without exposing the password');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_stage3_users where name='admin')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_stage3_users where name='admin')) )::text,true);
set local role authenticated;
select is((select count(*) from public.get_portal_access_status()),5::bigint,'Admin can see status for all five portals');
select is(public.set_portal_access_password('operator','Stage3-Operator-Password-789!'),true,'Admin can configure another portal password');
select is(public.verify_portal_access_password('operator','Stage3-Operator-Password-789!'),false,'Admin does not gain Operator role merely by managing the password');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_stage3_users where name='client')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_stage3_users where name='client')) )::text,true);
set local role authenticated;
select is((select count(*) from public.get_portal_access_status()),0::bigint,'Ordinary Client cannot inspect portal password configuration status');
select is(public.set_portal_access_password('admin','Stage3-Unauthorized-Password-123!'),false,'Ordinary Client cannot configure portal passwords');
reset role;

select is((select count(*)::bigint from private.portal_access_passwords where password_hash like '%Stage3-%'),0::bigint,'Portal password hashes never contain the plaintext password');

select * from finish();
rollback;
