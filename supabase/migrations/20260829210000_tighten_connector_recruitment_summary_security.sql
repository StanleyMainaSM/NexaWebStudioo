revoke execute on function private.get_connector_recruitment_summary() from anon, authenticated;

create or replace function public.get_connector_recruitment_summary()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.get_connector_recruitment_summary();
$$;

revoke execute on function public.get_connector_recruitment_summary() from anon;
grant execute on function public.get_connector_recruitment_summary() to authenticated;
