DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by authenticated" ON public.follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "View visible posts" ON public.posts;
CREATE POLICY "View visible posts" ON public.posts FOR SELECT TO authenticated USING (
  (expires_at > now()) AND (NOT is_blocked_between(auth.uid(), user_id)) AND (
    (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR (
      (hidden = false) AND (
        (EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id))
        OR (EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = posts.user_id AND f.following_id = auth.uid()))
      )
    )
  )
);