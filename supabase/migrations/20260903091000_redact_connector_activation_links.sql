-- Activation URLs are bearer credentials. Keep them only where the email
-- worker needs them, and remove the duplicate copy from notifications after
-- the email queue trigger has consumed it. Once delivery succeeds, remove the
-- HTML body copy from the queue as well.
create or replace function private.redact_connector_activation_notification_link()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.notification_type = 'connector_activation'
     and new.link is not null
     and (new.link like 'http://%' or new.link like 'https://%') then
    update public.notifications
    set link = null
    where id = new.id;
  end if;
  return new;
end;
$function$;

drop trigger if exists notifications_redact_connector_activation_link on public.notifications;
create trigger notifications_redact_connector_activation_link
after insert on public.notifications
for each row
execute function private.redact_connector_activation_notification_link();

create or replace function private.redact_sent_connector_activation_email_body()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status = 'sent' and coalesce(old.status, '') is distinct from 'sent' then
    update public.notification_email_queue q
    set html_body = null
    from public.notifications n
    where q.notification_id = n.id
      and n.id = new.notification_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists notification_email_queue_redact_connector_activation_body on public.notification_email_queue;
create trigger notification_email_queue_redact_connector_activation_body
after update of status on public.notification_email_queue
for each row
when (new.status = 'sent')
execute function private.redact_sent_connector_activation_email_body();
