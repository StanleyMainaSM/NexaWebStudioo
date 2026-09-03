begin;
select no_plan();

select has_trigger(
  'public',
  'creation_projects',
  'protect_creation_project_relationships',
  'Creation project ownership references are protected by trigger'
);

select ok(
  pg_get_functiondef('public.create_creation_project(text,text,uuid,uuid,uuid,uuid,uuid,jsonb,text[])'::regprocedure) ilike '%Project reference access denied%',
  'Creation project creation validates non-owner project references'
);

create temporary table t_ids(name text primary key, id uuid not null);
create or replace function pg_temp.make_user(p_name text,p_email text)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users(
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values(
    '00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated',p_email,
    crypt('avelixa-test-password',gen_salt('bf')),now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
  );
  insert into t_ids values(p_name,v_id);
  return v_id;
end $$;

select pg_temp.make_user('client_a','creation-client-a@example.test');
select pg_temp.make_user('client_b','creation-client-b@example.test');

delete from public.user_roles where user_id in (select id from t_ids);
insert into public.user_roles(user_id,role)
select id,'client' from t_ids;

insert into public.businesses(name)
values ('Creation Business A'),('Creation Business B');

insert into public.projects(client_id,title,status)
select (select id from t_ids where name='client_a'),'Creation Project A','pending';
insert into public.projects(client_id,title,status)
select (select id from t_ids where name='client_b'),'Creation Project B','pending';

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub',(select id from t_ids where name='client_a')::text,'role','authenticated')::text,
  true
);
set local role authenticated;

select throws_ok(
  $$select public.create_creation_project(
    'website','Cross-business',null,null,null,
    (select id from public.businesses where name='Creation Business B'),
    null,'{}'::jsonb,'{}'::text[]
  )$$,
  NULL,'Business reference is owner-managed',
  'Client cannot attach an arbitrary business reference'
);

select throws_ok(
  $$select public.create_creation_project(
    'website','Cross-project',null,null,null,null,
    (select id from public.projects where title='Creation Project B'),
    '{}'::jsonb,'{}'::text[]
  )$$,
  NULL,'Project reference access denied',
  'Client cannot attach another client project'
);

select lives_ok(
  $$select public.create_creation_project(
    'website','Own project',null,null,null,null,
    (select id from public.projects where title='Creation Project A'),
    '{}'::jsonb,'{}'::text[]
  )$$,
  'Client can attach their own project reference'
);

select is(
  (select count(*)::bigint from public.creation_projects where client_id=auth.uid()),
  1::bigint,
  'Own project creation is stored under the authenticated Client'
);

select throws_ok(
  $$update public.creation_projects
    set client_id=(select id from public.profiles where email='creation-client-b@example.test')
    where client_id=auth.uid()$$,
  NULL,'Creation project ownership references are protected',
  'Client cannot transfer creation ownership'
);

rollback;
