
-- Restrict support insert to authenticated users
drop policy if exists "Anyone can send support" on public.support_messages;
create policy "Authenticated send support" on public.support_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- Restrict storage SELECT to listing only own folder (uploaded files still publicly accessible via public URL since bucket is public)
drop policy if exists "Dish photos public read" on storage.objects;
drop policy if exists "Avatars public read" on storage.objects;
create policy "Dish photos read own folder" on storage.objects for select
  using (bucket_id = 'dish-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Avatars read own folder" on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke public execute on SECURITY DEFINER functions
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
