begin;
select plan(27);

select has_function('public','portal_access_password_status',ARRAY[]::text[],'Portal password status RPC exists');
select has_function('public','change_portal_access_password',ARRAY['text','text','text'],'Portal password change RPC exists');
select has_function('public','reset_portal_access_password',ARRAY['text','text'],'Portal password reset RPC exists');
select is_definer('private','portal_access_password_status',ARRAY[]::text[],'Portal password status is server-authorized');
select is_definer('private','change_portal_access_password',ARRAY['text','text','text'],'Portal password change is server-authorized');
select is_definer('private','reset_portal_access_password',ARRAY['text','text'],'Portal password reset is server-authorized');
select is(
  pg_get_function_result('public.portal_access_password_status()'::regprocedure) !~* 'password_hash',
  true,
  'Portal password status RPC result contains no password hash field'
);

create temporary table t_ids(name text primary key,id uuid not null);
create temporary table t_sessions(name text primary key,id uuid not null);
create or replace function pg_temp.pw(p_label text) returns text
language sql
immutable
as $$
  select 'Avelixa-' || p_label || '-' || repeat('7', 8) || '!';
$$;

create or replace function pg_temp.make_user(p_name text,p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,crypt(pg_temp.pw('auth-user'),gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
  insert into t_ids values(p_name,v_id);
  return v_id;
end $$;

select pg_temp.make_user('admin','avelixa-stage3-admin@example.test');
select pg_temp.make_user('owner','avelixa-stage3-owner@example.test');
select pg_temp.make_user('client','avelixa-stage3-client@example.test');
insert into public.user_roles(user_id,role)
select id,'admin' from t_ids where name='admin'
union all select id,'client' from t_ids where name='client'
on conflict (user_id,role) do nothing;
-- Fresh test databases intentionally have no pre-existing Owner account.
-- Bootstrap only this fixture role with trigger execution disabled inside the
-- test transaction; production Owner-role protection remains unchanged.
set local session_replication_role = replica;
insert into public.user_roles(user_id,role)
select id,'owner' from t_ids where name='owner'
on conflict (user_id,role) do nothing;
set local session_replication_role = origin;
insert into t_sessions(name,id)
select name,gen_random_uuid() from t_ids;
insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
select s.id,i.id,now(),now(),'aal1',now()+interval '1 hour'
from t_sessions s join t_ids i using(name);

grant select on t_ids to authenticated;
grant select on t_sessions to authenticated;
grant select on auth.sessions to authenticated;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='owner')::text,'role','authenticated','session_id',(select id::text from t_sessions where name='owner'))::text,true);
set local role authenticated;
select is(public.reset_portal_access_password('client',pg_temp.pw('owner-configure')),true,'Owner can configure/reset a portal password through the authorized management RPC');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='admin')::text,'role','authenticated','session_id',(select id::text from t_sessions where name='admin'))::text,true);
select is((select count(*) from public.portal_access_password_status()),5::bigint,'Admin receives status for all five portals without password data');
select is(public.reset_portal_access_password('owner',pg_temp.pw('owner-initial')),true,'Admin can configure/reset the Owner portal password');
select is((select configured from public.portal_access_password_status() where portal='owner'),true,'Owner portal status becomes configured');
select is(public.change_portal_access_password('owner',pg_temp.pw('owner-initial'),pg_temp.pw('owner-changed')),true,'Admin can change an existing portal password with the current password');
select is(public.change_portal_access_password('owner',pg_temp.pw('wrong-current'),pg_temp.pw('owner-failed')),false,'Incorrect current password cannot change a portal password');
select throws_ok(
  $$select public.reset_portal_access_password('owner','Short-123')$$,
  '22023',
  'Portal access passwords must contain at least 12 characters.',
  'Portal password minimum length is enforced server-side'
);
select is(public.reset_portal_access_password('owner',pg_temp.pw('owner-reset')),true,'Admin can reset an existing portal password without receiving the old password');
select is(public.verify_portal_access_password('owner',pg_temp.pw('owner-reset')),false,'Admin reset does not grant the Admin user an Owner portal role or unlock');

-- Establish a real Owner-session unlock through the public access RPC, then
-- verify that an Admin password reset invalidates that unlock.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='owner')::text,'role','authenticated','session_id',(select id::text from t_sessions where name='owner'))::text,true);
select is(public.verify_portal_access_password('owner',pg_temp.pw('owner-reset')),true,'Authorized Owner can unlock the Owner portal with the configured password');
select is(public.has_portal_access('owner'),true,'Owner unlock is active before the password reset');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='admin')::text,'role','authenticated','session_id',(select id::text from t_sessions where name='admin'))::text,true);
select is(public.reset_portal_access_password('owner',pg_temp.pw('owner-reset-2')),true,'Admin password reset succeeds after an existing Owner unlock');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='owner')::text,'role','authenticated','session_id',(select id::text from t_sessions where name='owner'))::text,true);
select is(public.has_portal_access('owner'),false,'Password reset invalidates the existing Owner-session unlock');

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from t_ids where name='client')::text,'role','authenticated','session_id',(select id::text from t_sessions where name='client'))::text,true);
select is((select count(*) from public.portal_access_password_status()),0::bigint,'Non-management users receive no portal password management status');
select is(public.reset_portal_access_password('owner',pg_temp.pw('client-reset')),false,'Unauthorized Client cannot reset a portal password');
select is(public.change_portal_access_password('owner',pg_temp.pw('owner-reset-2'),pg_temp.pw('client-changed')),false,'Unauthorized Client cannot change a portal password');
select throws_ok(
  $$select count(*) from private.portal_access_passwords$$,
  '42501',
  NULL,
  'Authenticated users cannot directly read the private portal password table'
);

reset role;

select is((select count(*) from private.portal_access_passwords where password_hash in (pg_temp.pw('owner-initial'),pg_temp.pw('owner-changed'),pg_temp.pw('owner-reset'),pg_temp.pw('owner-reset-2'))),0::bigint,'Management never stores plaintext passwords');
select is((select count(*) from private.portal_access_passwords where portal='owner'),1::bigint,'Exactly one private hash remains for the Owner portal');
select is((select count(*) from private.portal_access_unlocks where portal='owner'),0::bigint,'Password update leaves no stale Owner portal unlocks');

select * from finish();
rollback;
