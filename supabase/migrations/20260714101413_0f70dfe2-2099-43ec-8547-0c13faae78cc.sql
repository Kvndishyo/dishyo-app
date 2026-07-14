
DROP POLICY IF EXISTS "View visible posts" ON public.posts;

CREATE POLICY "View visible posts" ON public.posts
FOR SELECT
USING (
  hidden = false
  AND NOT public.is_blocked_between(auth.uid(), user_id)
  AND (
    user_id = auth.uid()
    OR visibility = 'public'::post_visibility
    OR (
      visibility = 'friends'::post_visibility
      AND EXISTS (
        SELECT 1 FROM public.follows f1
        JOIN public.follows f2
          ON f1.follower_id = f2.following_id
         AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = auth.uid()
          AND f1.following_id = posts.user_id
      )
    )
  )
);
