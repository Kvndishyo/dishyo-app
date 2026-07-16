-- Allow anonymous read of profiles (public info: handle, name, avatar, bio)
CREATE POLICY "Profiles viewable by anon"
ON public.profiles
FOR SELECT
TO anon
USING (true);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.posts TO anon;