
-- 1) Tighten posts visibility: friends visibility requires mutual follow
DROP POLICY IF EXISTS "View visible posts" ON public.posts;

CREATE POLICY "View visible posts" ON public.posts
FOR SELECT TO authenticated
USING (
  (expires_at > now())
  AND (NOT public.is_blocked_between(auth.uid(), user_id))
  AND (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      hidden = false
      AND (
        (
          visibility = 'public'::public.post_visibility
          AND (
            EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id)
            OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = posts.user_id AND f.following_id = auth.uid())
          )
        )
        OR (
          visibility = 'friends'::public.post_visibility
          AND EXISTS (SELECT 1 FROM public.follows f1 WHERE f1.follower_id = auth.uid() AND f1.following_id = posts.user_id)
          AND EXISTS (SELECT 1 FROM public.follows f2 WHERE f2.follower_id = posts.user_id AND f2.following_id = auth.uid())
        )
      )
    )
  )
);

-- 2) Remove billing tier from publicly readable profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS restaurateur_plan;
