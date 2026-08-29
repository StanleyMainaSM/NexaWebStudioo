create or replace function private.notify_connector_lead_workflow()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $$
declare
  v_event text;
  v_title text;
  v_content text;
  v_link text;
begin
  if tg_op = 'INSERT' then
    v_event := 'connector_lead_submitted';
    v_title := 'Lead submitted';
    v_content := format('Your business lead "%s" has been submitted to Avelixa for review.', new.title);
  elsif old.status is distinct from new.status then
    if lower(coalesce(new.status,'')) in ('action_required','needs_connector_action') then
      v_event := 'connector_lead_action_required';
      v_title := 'Lead requires your attention';
      v_content := format('Your lead "%s" now requires your attention.', new.title);
    else
      v_event := 'connector_lead_status_changed';
      v_title := 'Lead status updated';
      v_content := format('Your lead "%s" status is now %s.', new.title, coalesce(new.status,'unknown'));
    end if;
  else
    return new;
  end if;

  v_link := '/portal/connector/leads';

  perform private.log_avelixa_automation_event(v_event,'lead',new.id,auth.uid(),jsonb_build_object('connector_id',new.connector_id,'status',new.status));

  if new.connector_id is not null then
    perform private.create_avelixa_notification(new.connector_id,v_title,v_content,v_link,v_event,'lead',new.id,jsonb_build_object('status',new.status,'business_id',new.business_id),format('%s:%s:%s',v_event,new.id,coalesce(new.updated_at::text,now()::text)));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_avelixa_connector_lead_workflow on public.leads;
create trigger trg_avelixa_connector_lead_workflow
after insert or update of status on public.leads
for each row execute function private.notify_connector_lead_workflow();

create or replace function private.notify_connector_referral_completion()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $$
begin
  if new.referrer_id is not null then
    perform private.create_avelixa_notification(new.referrer_id,'Successful referral','A Connector you referred has completed the required onboarding and is now a successful referral.','/portal/connector','connector_referral_completed','referral_bonus',new.id,jsonb_build_object('referred_connector_id',new.referred_connector_id,'amount',new.amount,'status',new.status),'connector-referral-completed:' || new.referred_connector_id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_avelixa_connector_referral_notification on public.referral_bonuses;
create trigger trg_avelixa_connector_referral_notification
after insert on public.referral_bonuses
for each row execute function private.notify_connector_referral_completion();

create or replace function public.mark_direct_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'Authentication is required'; end if;
 if not exists (select 1 from public.direct_conversation_participants dcp where dcp.conversation_id=p_conversation_id and dcp.user_id=auth.uid()) then
   raise exception 'You do not have access to this conversation';
 end if;
 update public.direct_messages set read_at=coalesce(read_at,now()) where conversation_id=p_conversation_id and sender_id<>auth.uid() and read_at is null;
 get diagnostics n=row_count; return n;
end;
$$;
