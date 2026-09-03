-- Connector activation links must be available to the existing email worker,
-- but must not be embedded in durable notification content.
-- The existing notifications_queue_email trigger runs before the activation
-- redaction trigger (alphabetical trigger order: queue before redact).
create or replace function private.queue_notification_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient text;
  email_content text;
begin
  select p.email into recipient
  from public.profiles p
  where p.id = new.user_id;

  if recipient is null or btrim(recipient) = '' then
    return new;
  end if;

  email_content := new.content;

  if new.notification_type = 'connector_activation'
     and new.link is not null
     and (new.link like 'http://%' or new.link like 'https://%') then
    email_content := coalesce(new.content, '')
      || E'\n\n<p><a href="'
      || new.link
      || '">Activate your Avelixa Connector account</a></p>';
  end if;

  insert into public.notification_email_queue(
    notification_id,
    user_id,
    recipient_email,
    subject,
    html_body
  )
  values(
    new.id,
    new.user_id,
    recipient,
    new.title,
    email_content
  )
  on conflict(notification_id) do nothing;

  return new;
end;
$$;
