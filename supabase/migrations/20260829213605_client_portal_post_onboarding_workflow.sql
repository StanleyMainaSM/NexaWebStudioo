CREATE OR REPLACE FUNCTION public.protect_client_referrer_attribution()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.client_referrer_connector_id IS DISTINCT FROM OLD.client_referrer_connector_id THEN
    RAISE EXCEPTION 'Client referral attribution is write-once';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_client_referrer_attribution ON public.profiles;
CREATE TRIGGER protect_client_referrer_attribution
BEFORE UPDATE OF client_referrer_connector_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_client_referrer_attribution();

CREATE OR REPLACE FUNCTION private.notify_connector_lead_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
declare
  v_event text;
  v_title text;
  v_content text;
  v_client_title text;
  v_client_content text;
begin
  if tg_op = 'INSERT' then
    v_event := 'connector_lead_submitted';
    v_title := 'Lead submitted';
    v_content := format('Your business lead "%s" has been submitted to Avelixa for review.', new.title);
    v_client_title := 'Request submitted';
    v_client_content := format('Your request "%s" has been submitted to Avelixa for review.', new.title);
  elsif old.status is distinct from new.status then
    if lower(coalesce(new.status,'')) in ('action_required','needs_connector_action') then
      v_event := 'connector_lead_action_required';
      v_title := 'Lead requires your attention';
      v_content := format('Your lead "%s" now requires your attention.', new.title);
      v_client_title := 'Request requires your attention';
      v_client_content := format('Your request "%s" now requires your attention.', new.title);
    else
      v_event := 'connector_lead_status_changed';
      v_title := 'Lead status updated';
      v_content := format('Your lead "%s" status is now %s.', new.title, coalesce(new.status,'unknown'));
      v_client_title := 'Request status updated';
      v_client_content := format('Your request "%s" status is now %s.', new.title, coalesce(new.status,'unknown'));
    end if;
  else
    return new;
  end if;

  perform private.log_avelixa_automation_event(
    v_event,
    'lead',
    new.id,
    auth.uid(),
    jsonb_build_object('connector_id', new.connector_id, 'client_id', new.client_id, 'status', new.status)
  );

  if new.connector_id is not null then
    perform private.create_avelixa_notification(
      new.connector_id,
      v_title,
      v_content,
      '/portal/connector/leads',
      v_event,
      'lead',
      new.id,
      jsonb_build_object('status', new.status, 'business_id', new.business_id),
      format('%s:%s:%s', v_event, new.id, coalesce(new.updated_at::text, now()::text))
    );
  end if;

  if new.client_id is not null then
    perform private.create_avelixa_notification(
      new.client_id,
      v_client_title,
      v_client_content,
      '/portal/activity',
      v_event,
      'lead',
      new.id,
      jsonb_build_object('status', new.status, 'business_id', new.business_id),
      format('%s:client:%s:%s', v_event, new.id, coalesce(new.updated_at::text, now()::text))
    );
  end if;

  return new;
end;
$function$;
