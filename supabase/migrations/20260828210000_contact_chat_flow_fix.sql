create or replace function public.communication_open_contact(p_contact_user_id uuid, p_contact_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 select coalesce(nullif(trim(p_contact_name),''),nullif(trim(full_name),''),email,'Avelixa User') into v_name from profiles where id=p_contact_user_id;
 if v_name is null then raise exception 'Avelixa user not found'; end if;
 insert into user_contacts(user_id,contact_user_id,contact_name) values(auth.uid(),p_contact_user_id,v_name)
 on conflict(user_id,contact_user_id) do nothing;
 select id into v_id from direct_conversations where (participant_1=auth.uid() and participant_2=p_contact_user_id) or (participant_1=p_contact_user_id and participant_2=auth.uid()) limit 1;
 if v_id is null then select get_or_create_direct_conversation(p_recipient_id:=p_contact_user_id) into v_id; end if;
 return v_id;
end; $$;
revoke all on function public.communication_open_contact(uuid,text) from public;
grant execute on function public.communication_open_contact(uuid,text) to authenticated;
