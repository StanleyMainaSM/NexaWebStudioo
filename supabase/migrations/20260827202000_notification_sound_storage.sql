insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('notification-sounds','notification-sounds',true,3145728,array['audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4']) on conflict (id) do update set public=true,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists notification_sounds_insert_own on storage.objects;
drop policy if exists notification_sounds_update_own on storage.objects;
drop policy if exists notification_sounds_delete_own on storage.objects;
create policy notification_sounds_insert_own on storage.objects for insert to authenticated with check (bucket_id='notification-sounds' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy notification_sounds_update_own on storage.objects for update to authenticated using (bucket_id='notification-sounds' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='notification-sounds' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy notification_sounds_delete_own on storage.objects for delete to authenticated using (bucket_id='notification-sounds' and (storage.foldername(name))[1]=(select auth.uid())::text);
