begin;
select no_plan();

select has_table('private','creation_access_passwords','Creation access password hashes stay in the private schema');
select has_table('private','creation_access_unlocks','Creation access unlock state stays in the private schema');
select has_function('private','verify_creation_access_password',ARRAY['text'],'Creation access password verification exists');
select has_function('private','has_creation_access',ARRAY[]::text[],'Creation access assertion exists');
select has_function('private','set_creation_access_password',ARRAY['text'],'Users can configure their own creation access password');
select has_function('private','change_creation_access_password',ARRAY['text','text'],'Users can change their own creation access password');
select is_definer('private','verify_creation_access_password',ARRAY['text'],'Creation password verification is server-side');
select is_definer('private','set_creation_access_password',ARRAY['text'],'Creation password configuration is server-side');

create temporary table t_creation_user(id uuid primary key);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000',gen_random_uuid(),'authenticated','authenticated','avelixa-creation@example.test',crypt('Supabase-Login-Password-123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now())
returning id into t_creation_user;

insert into public.user_roles(user_id,role) select id,'owner' from t_creation_user;
insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
select gen_random_uuid(),id,now(),now(),'aal1',now()+interval '1 hour' from t_creation_user;

select set_config('request.jwt.claims',jsonb_build_object('sub',(select id::text from t_creation_user),'role','authenticated','session_id',(select id::text from auth.sessions where user_id=(select id from t_creation_user)))::text,true);
set local role authenticated;

select is(public.set_creation_access_password('Creation-Access-Password-123!'),true,'Owner can configure their own creation access password');
select is(public.verify_creation_access_password('Creation-Access-Password-123!'),true,'Correct creation access password is accepted');
select is(public.verify_creation_access_password('Supabase-Login-Password-123!'),false,'Supabase login password is not accepted as creation access password');
select is(public.verify_creation_access_password('Wrong-Creation-Password'),false,'Incorrect creation access password is rejected');
select is(public.has_creation_access(),true,'Successful creation password verification establishes session-bound access');
select is((select count(*)::bigint from private.creation_access_passwords where password_hash like 'Creation-Access-Password-123!'),0::bigint,'Creation password is never stored in plaintext');

select is(public.change_creation_access_password('Creation-Access-Password-123!','New-Creation-Access-Password-456!'),true,'User can change their own creation access password');
select is(public.verify_creation_access_password('Creation-Access-Password-123!'),false,'Old creation password stops working after change');
select is(public.verify_creation_access_password('New-Creation-Access-Password-456!'),true,'New creation password works after change');

reset role;
select * from finish();
rollback;
