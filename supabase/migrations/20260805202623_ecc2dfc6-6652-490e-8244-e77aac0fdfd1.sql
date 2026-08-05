DROP POLICY IF EXISTS "Profiles viewable by anon" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.posts FROM anon;