CREATE POLICY "Chat media upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Chat media read authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

CREATE POLICY "Chat media delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);