-- Avelixa self-service Connector registration.
-- Legacy approval/provisioning objects remain for historical records only.

create or replace function public.check_email_registered(p_email text)
returns boolean language sql security definer stable set search_path=''
as $$
  select exists(select 1 from auth.users where lower(email)=lower(trim(p_email)))
      or exists(select 1 from public.profiles where lower(email)=lower(trim(p_email)));
$$;
revoke all on function public.check_email_registered(text) from public;
grant execute on function public.check_email_registered(text) to anon, authenticated;

create or replace function public.validate_connector_referral(p_referral text)
returns jsonb language plpgsql security definer stable set search_path=''
as $$
declare v_user_id uuid; v_name text; v_avl_id text;
begin
  if nullif(btrim(p_referral),'') is null then return jsonb_build_object('valid',true,'referral',null); end if;
  select cp.user_id,p.full_name,cp.avl_id into v_user_id,v_name,v_avl_id
  from public.connector_profiles cp
  join public.profiles p on p.id=cp.user_id
  join public.user_roles ur on ur.user_id=cp.user_id and ur.role='connector'
  where upper(cp.avl_id)=upper(btrim(p_referral)) and coalesce(cp.is_active,false)=true limit 1;
  if v_user_id is null then return jsonb_build_object('valid',false); end if;
  return jsonb_build_object('valid',true,'user_id',v_user_id,'full_name',v_name,'referral',v_avl_id);
end;
$$;
revoke all on function public.validate_connector_referral(text) from public;
grant execute on function public.validate_connector_referral(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare
  v_type text:=lower(coalesce(new.raw_user_meta_data->>'registration_type',''));
  v_email text:=lower(trim(new.email));
  v_name text:=nullif(btrim(new.raw_user_meta_data->>'full_name'),'');
  v_phone text:=nullif(btrim(new.raw_user_meta_data->>'phone'),'');
  v_national_id text:=nullif(btrim(new.raw_user_meta_data->>'national_id'),'');
  v_county text:=nullif(btrim(new.raw_user_meta_data->>'county'),'');
  v_town text:=nullif(btrim(new.raw_user_meta_data->>'town'),'');
  v_referral text:=nullif(btrim(new.raw_user_meta_data->>'referring_connector'),'');
  v_client_referral text:=nullif(btrim(new.raw_user_meta_data->>'client_referral_avl_id'),'');
  v_referrer uuid;
begin
  if v_type='connector' then
    if v_name is null or v_phone is null or v_national_id is null or v_county is null or v_town is null then
      raise exception 'Connector registration details are incomplete';
    end if;
    if v_referral is not null then
      select cp.user_id into v_referrer
      from public.connector_profiles cp
      join public.user_roles ur on ur.user_id=cp.user_id and ur.role='connector'
      where upper(cp.avl_id)=upper(v_referral) and coalesce(cp.is_active,false)=true limit 1;
      if v_referrer is null then raise exception 'Invalid or inactive Connector referral ID'; end if;
    end if;

    insert into public.profiles(id,email,full_name) values(new.id,v_email,v_name);
    insert into public.user_roles(user_id,role) values(new.id,'connector') on conflict(user_id,role) do nothing;
    insert into public.connector_profiles(user_id,is_active,terms_accepted_at,terms_version) values(new.id,true,null,null);
    insert into public.connector_applications(full_name,email,phone,national_id_secure,county,town,referring_connector_id,status,provisioning_status,provisioned_user_id,provisioned_at)
    values(v_name,v_email,v_phone,v_national_id,v_county,v_town,v_referrer,'approved','completed',new.id,now());

    update auth.users set raw_user_meta_data=raw_user_meta_data-array['registration_type','phone','national_id','county','town','referring_connector','full_name']::text[] where id=new.id;
    return new;
  end if;

  insert into public.profiles(id,email,full_name,client_referrer_connector_id)
  values(new.id,v_email,v_name,(
    select cp.user_id from public.connector_profiles cp
    join public.user_roles ur on ur.user_id=cp.user_id and ur.role='connector'
    where lower(cp.avl_id)=lower(v_client_referral) and coalesce(cp.is_active,false)=true limit 1
  ));
  insert into public.user_roles(user_id,role) values(new.id,'client') on conflict(user_id,role) do nothing;
  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public,anon,authenticated;
