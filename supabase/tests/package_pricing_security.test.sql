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

insert into public.packages(name,description,is_active)
values ('Stage 7 Inactive Public Test','Temporary inactive package for RLS verification',false);

set local role anon;
select is(
  (select count(*)::bigint from public.packages where is_active = true) > 0,
  true,
  'Public pricing can read active authoritative packages'
);
select is(
  (select count(*)::bigint from public.packages where name='Stage 7 Inactive Public Test'),
  0::bigint,
  'Public pricing cannot read inactive packages'
);
reset role;

create temporary table t_package_security_ids(name text primary key, id uuid not null);
grant select on t_package_security_ids to authenticated;

create temporary table t_package_target(id uuid primary key, original_min_price numeric, original_name text);
grant select on t_package_target to authenticated;
insert into t_package_target(id,original_min_price,original_name)
select id,min_price,name
from public.packages
where is_active=true
order by created_at
limit 1;

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

select lives_ok(
  $$update public.packages set min_price = coalesce(min_price,0) + 1 where id=(select id from t_package_target)$$,
  'Client update attempt is safely contained by package RLS'
);
select is(
  (select min_price from public.packages where id=(select id from t_package_target)),
  (select original_min_price from t_package_target),
  'Client cannot change authoritative package pricing'
);

select lives_ok(
  $$delete from public.packages where id=(select id from t_package_target)$$,
  'Client delete attempt is safely contained by package RLS'
);
select is(
  (select count(*)::bigint from public.packages where id=(select id from t_package_target)),
  1::bigint,
  'Client cannot delete authoritative packages'
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
