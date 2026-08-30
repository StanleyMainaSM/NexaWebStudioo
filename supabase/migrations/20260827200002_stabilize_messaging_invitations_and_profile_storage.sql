alter table public.chat_contact_invitations add constraint chat_contact_invitations_inviter_email_key unique (inviter_id,email);
alter table public.conversation_preferences add constraint conversation_preferences_user_conversation_key unique (user_id,conversation_id);
alter table public.user_notification_preferences add constraint user_notification_preferences_user_key unique (user_id);
insert into storage.buckets (id,name,public,file_size_limit) values ('profile-avatars','profile-avatars',true,5242880) on conflict (id) do update set public=true,file_size_limit=5242880;
insert into storage.buckets (id,name,public,file_size_limit) values ('notification-sounds','notification-sounds',true,3145728) on conflict (id) do update set public=true,file_size_limit=3145728;
drop policy if exists profile_avatars_select_all on storage.objects;
create policy profile_avatars_select_all on storage.objects for select to authenticated using (bucket_id='profile-avatars');
