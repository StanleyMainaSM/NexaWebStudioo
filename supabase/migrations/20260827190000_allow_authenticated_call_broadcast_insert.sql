drop policy if exists communication_realtime_call_insert on realtime.messages;

create policy communication_realtime_call_insert
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) like 'call:%'
  and extension = 'broadcast'
);