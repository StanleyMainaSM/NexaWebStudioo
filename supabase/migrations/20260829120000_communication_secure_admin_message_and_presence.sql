create or replace function public.communication_send_admin_message(p_conversation_id uuid, p_content text)
returns public.admin_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_conversation public.admin_conversations%rowtype;
  v_message public.admin_messages%rowtype;
  v_recipient uuid;
begin
  if v_user is null then raise exception 'Authentication is required'; end if;
  if p_conversation_id is null or length(trim(coalesce(p_content, ''))) = 0 then
    raise exception 'A conversation and message are required';
  end if;
  if length(trim(p_content)) > 5000 then raise exception 'Message is too long'; end if;

  select * into v_conversation
  from public.admin_conversations
  where id = p_conversation_id;

  if not found then raise exception 'Conversation not found'; end if;

  if v_conversation.user_id = v_user then
    v_recipient := v_conversation.admin_id;
  elsif private.is_admin_or_owner() and v_conversation.admin_id = v_user then
    v_recipient := v_conversation.user_id;
  else
    raise exception 'You do not have access to this conversation';
  end if;

  insert into public.admin_messages(conversation_id, sender_id, recipient_id, content)
  values (p_conversation_id, v_user, v_recipient, trim(p_content))
  returning * into v_message;

  update public.admin_conversations
  set updated_at = now()
  where id = p_conversation_id;

  return v_message;
end;
$$;

revoke all on function public.communication_send_admin_message(uuid, text) from public;
grant execute on function public.communication_send_admin_message(uuid, text) to authenticated;

create or replace function public.communication_set_presence(p_online boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;

  if p_online then
    insert into public.user_presence(user_id, is_online, last_seen_at, updated_at)
    values (auth.uid(), true, now(), now())
    on conflict (user_id) do update
      set is_online = true, last_seen_at = now(), updated_at = now();
  else
    update public.user_presence
    set is_online = false, last_seen_at = now(), updated_at = now()
    where user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.communication_set_presence(boolean) from public;
grant execute on function public.communication_set_presence(boolean) to authenticated;
