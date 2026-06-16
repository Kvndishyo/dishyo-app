
-- 1) Profiles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (NOT public.is_blocked_between(auth.uid(), id));

REVOKE SELECT ON public.profiles FROM anon;

-- 2) Sponsored ads: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read active ads" ON public.sponsored_ads;
CREATE POLICY "Authenticated can read active ads"
ON public.sponsored_ads FOR SELECT
TO authenticated
USING (active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

REVOKE SELECT ON public.sponsored_ads FROM anon;

-- 3) Notifications: drop user INSERT policy; triggers run as SECURITY DEFINER
DROP POLICY IF EXISTS "Users insert notifications as actor" ON public.notifications;

-- 4) Posts visibility: only author + followers (one-way: viewer follows author)
DROP POLICY IF EXISTS "View visible posts" ON public.posts;
CREATE POLICY "View visible posts"
ON public.posts FOR SELECT
TO authenticated
USING (
  hidden = false
  AND NOT public.is_blocked_between(auth.uid(), user_id)
  AND (
    user_id = auth.uid()
    OR (
      visibility = 'public'
      AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid() AND f.following_id = user_id
      )
    )
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.follows f1
        JOIN public.follows f2
          ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = auth.uid() AND f1.following_id = user_id
      )
    )
  )
);
