
DROP POLICY IF EXISTS "Comments viewable except from blocked" ON public.comments;
CREATE POLICY "Comments viewable except from blocked"
  ON public.comments FOR SELECT
  TO authenticated
  USING (NOT public.is_blocked_between(auth.uid(), user_id));

DROP POLICY IF EXISTS "Likes viewable by everyone" ON public.likes;
CREATE POLICY "Likes viewable by authenticated"
  ON public.likes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Comment likes viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes viewable by authenticated"
  ON public.comment_likes FOR SELECT
  TO authenticated
  USING (true);
