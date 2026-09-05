begin;
select plan(17);

select has_function('public','portal_access_password_status',ARRAY[]::text[],'Portal password status RPC exists');
select has_function('public','change_portal_access_password',ARRAY['text','text','text'],'Portal password change RPC exists');
select has_function('public','reset_portal_access_password',ARRAY['text','text'],'Portal password reset RPC exists');
select is_definer('private','portal_access_password_status',ARRAY[]::text[],'Portal password status is server-authorized');
select is_definer('private','change_portal_access_password',ARRAY['text','text','text'],'Portal password change is server-authorized');
select is_definer('private','reset_portal_access_password',ARRAY['text','text'],'Portal password reset is server-authorized');

create temporary table t_ids(name text primary key,id uuid not null);
create or replace function pg_temp.make_user(p_name text,p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,crypt('avelixa-test-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
  insert into t_ids values(p_name,v_id);
  return v_id;
end $$;

select pg_temp.make_user('admin','avelixa-stage3-admin@example.test');
select pg_temp.make_user('client','avelixa-stage3-client@example.test');
insert into public.user_roles(user_id,role)
select id,'admin' from t_ids where name='admin'
union all select id,'client' from t_ids where name='client'
on conflict (user_id,role) do nothing;
insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
select gen_random_uuid(),id,now(),now(),'aal1',now()+interval '1 hour' from t_ids;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='admin')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_ids where name='admin')) )::text,true);
set local role authenticated;
select is((select count(*) from public.portal_access_password_status()),5::bigint,'Admin receives status for all five portals without password data');
select is(public.reset_portal_access_password('owner','Owner-Stage3-Password-123!'),true,'Admin can configure/reset the Owner portal password');
select is((select configured from public.portal_access_password_status() where portal='owner'),true,'Owner portal status becomes configured');
select is(public.change_portal_access_password('owner','Owner-Stage3-Password-123!','Owner-Stage3-Changed-123!'),true,'Admin can change an existing portal password with the current password');
select is(public.change_portal_access_password('owner','Wrong-Current-123!','Owner-Stage3-Failed-123!'),false,'Incorrect current password cannot change a portal password');
select is(public.reset_portal_access_password('owner','Owner-Stage3-Reset-123!'),true,'Admin can reset an existing portal password without receiving the old password');
select is(public.verify_portal_access_password('owner','Owner-Stage3-Reset-123!'),false,'Admin reset does not grant the Admin user an Owner portal role or unlock');

-- The private password tables intentionally deny direct access to authenticated
-- users. Inspect their storage invariants only as the test owner role, after
-- the authenticated management RPC behavior has been verified above.
reset role;
select is((select count(*) from private.portal_access_passwords where password_hash in ('Owner-Stage3-Password-123!','Owner-Stage3-Changed-123!','Owner-Stage3-Reset-123!')),0::bigint,'Management never stores plaintext passwords');
select is((select count(*) from private.portal_access_passwords where portal='owner'),1::bigint,'Exactly one private hash remains for the Owner portal');
select is((select count(*) from private.portal_access_unlocks where portal='owner'),0::bigint,'Password update invalidates existing Owner portal unlocks');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='client')::text,'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_ids where name='client')) )::text,true);
set local role authenticated;
select is((select count(*) from public.portal_access_password_status()),0::bigint,'Non-management users receive no portal password management status');
reset role;

select * from finish();
rollback;
