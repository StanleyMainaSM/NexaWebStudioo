-- Privacy-safe contact discovery helpers.
-- Saved contacts are the only directory shown in the communication UI.
-- Explicit lookup remains available for a user who knows an exact email/name/connector ID.
create index if not exists user_contacts_owner_contact_idx
  on public.user_contacts (user_id, contact_user_id);

create index if not exists user_presence_user_updated_idx
  on public.user_presence (user_id, updated_at desc);
