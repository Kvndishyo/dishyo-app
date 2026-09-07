GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversation_members_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.conversation_members
      ADD CONSTRAINT conversation_members_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "Chat media read authenticated" ON storage.objects;
CREATE POLICY "Chat media read members only"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_members cm
        ON cm.conversation_id = m.conversation_id
       AND cm.user_id = auth.uid()
      WHERE m.media_url = storage.objects.name
    )
  )
);