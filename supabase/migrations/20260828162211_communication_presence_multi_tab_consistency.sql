create or replace function public.communication_set_presence(p_online boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if p_online then
    insert into public.user_presence(user_id,is_online,last_seen_at,updated_at)
    values (auth.uid(), true, now(), now())
    on conflict (user_id) do update set is_online=true,last_seen_at=now(),updated_at=now();
  end if;
end;
$$;

create or replace function public.communication_mark_stale_presence_offline()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_presence
  set is_online=false, updated_at=now()
  where is_online=true
    and last_seen_at < now() - interval '45 seconds';
$$;

revoke execute on function public.communication_mark_stale_presence_offline() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname='avelixa-communication-presence-cleanup';
select cron.schedule('avelixa-communication-presence-cleanup','* * * * *','select public.communication_mark_stale_presence_offline();');
