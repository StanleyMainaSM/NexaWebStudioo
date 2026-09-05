begin;
select no_plan();

select has_table('private','portal_access_passwords','Creation access password hashes reuse the existing private password store');
select has_table('private','portal_access_unlocks','Creation access unlock state reuses the existing private session-bound store');
select has_function('private','verify_portal_access_password',ARRAY['text','text'],'Existing server-side portal password verification supports creation access');
select has_function('private','has_portal_access',ARRAY['text'],'Existing server-side portal access assertion supports creation access');
select has_function('private','set_portal_access_password',ARRAY['text','text'],'Owner/Admin can configure the creation access password');
select has_function('private','change_portal_access_password',ARRAY['text','text','text'],'Owner/Admin can change the creation access password');
select is_definer('private','verify_portal_access_password',ARRAY['text','text'],'Creation password verification remains server-side');
select is_definer('private','set_portal_access_password',ARRAY['text','text'],'Creation password configuration remains server-side');

create temporary table t_creation_ids(name text primary key,id uuid not null);
create or replace function pg_temp.make_creation_user(p_name text,p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,crypt('Supabase-Login-Password-123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
  insert into t_creation_ids values(p_name,v_id);
  return v_id;
end $$;

select pg_temp.make_creation_user('owner','avelixa-creation-owner@example.test');
select pg_temp.make_creation_user('client','avelixa-creation-client@example.test');
-- Fresh test databases intentionally have no pre-existing Owner account.
-- Bootstrap only this fixture role with trigger execution disabled inside the
-- test transaction; production Owner-role protection remains unchanged.
set local session_replication_role = replica;
insert into public.user_roles(user_id,role) select id,'owner' from t_creation_ids where name='owner';
set local session_replication_role = origin;
-- The normal auth.users lifecycle already assigns the synthetic Client the
-- default client role through public.handle_new_user(). Reuse that established
-- fixture state instead of inserting the same role a second time.
insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
select gen_random_uuid(),id,now(),now(),'aal1',now()+interval '1 hour' from t_creation_ids;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id::text from t_creation_ids where name='owner'),'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_creation_ids where name='owner')))::text,true);
set local role authenticated;
select is(public.set_portal_access_password('creation','Creation-Access-Password-123!'),true,'Owner can configure the dedicated website/template creation access password');
select is(public.verify_portal_access_password('creation','Creation-Access-Password-123!'),true,'Correct creation access password is accepted for Owner');
select is(public.verify_portal_access_password('creation','Supabase-Login-Password-123!'),false,'Supabase login password is not accepted as the creation access password');
select is(public.verify_portal_access_password('creation','Wrong-Creation-Password'),false,'Incorrect creation access password is rejected');
select is(public.has_portal_access('creation'),true,'Successful creation password verification establishes session-bound creation access');
select is((select count(*)::bigint from private.portal_access_passwords where password_hash like 'Creation-Access-Password-123!'),0::bigint,'Creation password is never stored in plaintext');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id::text from t_creation_ids where name='client'),'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_creation_ids where name='client')))::text,true);
set local role authenticated;
select is(public.verify_portal_access_password('creation','Creation-Access-Password-123!'),true,'Authorized Client can unlock website/template creation with the dedicated creation password');
select is(public.has_portal_access('creation'),true,'Authorized Client creation unlock is recognized server-side');
select is(public.verify_portal_access_password('owner','Creation-Access-Password-123!'),false,'Creation password cannot unlock the Owner portal');
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id::text from t_creation_ids where name='owner'),'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_creation_ids where name='owner')))::text,true);
set local role authenticated;
select is(public.change_portal_access_password('creation','Creation-Access-Password-123!','New-Creation-Access-Password-456!'),true,'Owner can change the creation access password');
select is(public.verify_portal_access_password('creation','Creation-Access-Password-123!'),false,'Old creation password stops working after change');
select is(public.verify_portal_access_password('creation','New-Creation-Access-Password-456!'),true,'New creation password works after change');
reset role;

select * from finish();
rollback;
