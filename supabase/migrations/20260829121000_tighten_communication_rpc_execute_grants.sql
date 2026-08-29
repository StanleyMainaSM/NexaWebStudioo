revoke all on function public.communication_send_admin_message(uuid, text) from public, anon;
grant execute on function public.communication_send_admin_message(uuid, text) to authenticated;

revoke all on function public.communication_set_presence(boolean) from public, anon;
grant execute on function public.communication_set_presence(boolean) to authenticated;
