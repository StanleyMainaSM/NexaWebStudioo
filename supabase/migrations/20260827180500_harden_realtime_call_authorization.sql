create or replace function public.can_access_call_session(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.call_sessions cs
    where cs.id = p_call_id
      and (cs.caller_id = (select auth.uid()) or cs.callee_id = (select auth.uid()))
  );
$$;

revoke all on function public.can_access_call_session(uuid) from public;
grant execute on function public.can_access_call_session(uuid) to authenticated;

drop policy if exists communication_realtime_call_select on realtime.messages;
drop policy if exists communication_realtime_call_insert on realtime.messages;
drop policy if exists communication_realtime_user_calls_select on realtime.messages;
drop policy if exists communication_realtime_user_calls_insert on realtime.messages;

create policy communication_realtime_call_select
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) like 'call:%'
  and (select public.can_access_call_session(split_part((select realtime.topic()), ':', 2)::uuid))
);

create policy communication_realtime_call_insert
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) like 'call:%'
  and extension = 'broadcast'
  and (select public.can_access_call_session(split_part((select realtime.topic()), ':', 2)::uuid))
);

create policy communication_realtime_user_calls_select
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = ('user_calls:' || (select auth.uid())::text)
  or (
    (select realtime.topic()) like 'call:%'
    and (select public.can_access_call_session(split_part((select realtime.topic()), ':', 2)::uuid))
  )
);

create policy communication_realtime_user_calls_insert
on realtime.messages
for insert
to authenticated
with check (
  (
    (select realtime.topic()) like 'user_calls:%'
    and extension = 'broadcast'
    and not (payload ? 'call_id')
    and split_part((select realtime.topic()), ':', 2)::uuid <> (select auth.uid())
  )
  or (
    (select realtime.topic()) like 'user_calls:%'
    and extension = 'broadcast'
    and (payload ? 'call_id')
    and exists (
      select 1
      from public.call_sessions cs
      where cs.id = (payload ->> 'call_id')::uuid
        and cs.caller_id = (select auth.uid())
        and cs.callee_id = split_part((select realtime.topic()), ':', 2)::uuid
    )
  )
  or (
    (select realtime.topic()) like 'call:%'
    and extension = 'broadcast'
    and (select public.can_access_call_session(split_part((select realtime.topic()), ':', 2)::uuid))
  )
);