DROP POLICY IF EXISTS "XP visible to signed-in users" ON public.user_xp;
CREATE POLICY "Users read own XP" ON public.user_xp FOR SELECT TO authenticated USING (auth.uid() = user_id);