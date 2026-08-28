create policy user_contacts_update_own
on public.user_contacts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
