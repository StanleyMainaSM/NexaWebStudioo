begin;
select no_plan();

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'packages'
      and policyname = 'packages_public_active_select'
      and cmd = 'SELECT'
      and 'anon' = any(roles)
      and 'authenticated' = any(roles)
      and qual = '(is_active = true)'
  ),
  'Packages expose only active rows to public roles'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'packages'
      and policyname = 'packages_management'
      and cmd = 'ALL'
      and 'authenticated' = any(roles)
      and qual ilike '%owner%'
      and qual ilike '%admin%'
      and with_check ilike '%owner%'
      and with_check ilike '%admin%'
  ),
  'Package management remains restricted to Owner/Admin roles'
);

select is(
  (select count(*)::bigint from public.packages where is_active = true) > 0,
  true,
  'At least one active authoritative package exists'
);

select is(
  (select count(*)::bigint from public.packages where is_active = false),
  0::bigint,
  'Current package catalogue has no inactive public package rows in the clean fixture'
);

create temporary table t_package_security_ids(name text primary key, id uuid not null);
grant select on t_package_security_ids to authenticated;

create or replace function pg_temp.make_user(p_name text, p_email text) returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,crypt('avelixa-test-password',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
  insert into t_package_security_ids values(p_name,v_id);
  return v_id;
end $$;

select pg_temp.make_user('client','package-client@example.test');
select pg_temp.make_user('owner','package-owner@example.test');

insert into public.user_roles(user_id,role)
select id,'client' from t_package_security_ids where name='client';
insert into public.user_roles(user_id,role)
select id,'owner' from t_package_security_ids where name='owner';

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select id from t_package_security_ids where name='client')::text,
    'role','authenticated'
  )::text,
  true
);
set local role authenticated;

select throws_ok(
  $$insert into public.packages(name,min_price,max_price,description,features) values ('Unauthorized Package',1,2,'Nope','[]'::jsonb)$$,
  NULL,
  NULL,
  'Client cannot create packages'
);

select throws_ok(
  $$update public.packages set min_price = coalesce(min_price,0) + 1 where is_active = true limit 1$$,
  NULL,
  NULL,
  'Client cannot update packages'
);

select throws_ok(
  $$delete from public.packages where is_active = true$$,
  NULL,
  NULL,
  'Client cannot delete packages'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select id from t_package_security_ids where name='owner')::text,
    'role','authenticated'
  )::text,
  true
);

select lives_ok(
  $$insert into public.packages(name,min_price,max_price,description,features) values ('Stage 7 Test Package',12345,23456,'Temporary package','["Test feature"]'::jsonb)$$,
  'Owner can create an authoritative package'
);

select is(
  (select count(*)::bigint from public.packages where name='Stage 7 Test Package'),
  1::bigint,
  'Owner-created package is stored in the authoritative packages table'
);

select lives_ok(
  $$update public.packages set min_price=15000,max_price=25000 where name='Stage 7 Test Package'$$,
  'Owner can update authoritative package pricing'
);

select is(
  (select min_price from public.packages where name='Stage 7 Test Package'),
  15000::numeric,
  'Owner pricing update is persisted'
);

select lives_ok(
  $$delete from public.packages where name='Stage 7 Test Package'$$,
  'Owner can delete an authoritative package'
);

select is(
  (select count(*)::bigint from public.packages where name='Stage 7 Test Package'),
  0::bigint,
  'Owner package deletion is persisted within the test transaction'
);

select * from finish();
rollback;
