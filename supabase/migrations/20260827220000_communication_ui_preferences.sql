alter table public.user_contacts
  add column if not exists contact_name text;

alter table public.conversation_preferences
  add column if not exists wallpaper text;

create index if not exists user_contacts_user_contact_name_idx
  on public.user_contacts (user_id, contact_name);
