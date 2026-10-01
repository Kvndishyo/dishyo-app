DROP POLICY IF EXISTS "Follows viewable by authenticated" ON public.follows;
CREATE POLICY "Follows viewable unless blocked" ON public.follows FOR SELECT TO authenticated
USING (auth.uid() IN (follower_id, following_id) OR (NOT public.is_blocked_between(auth.uid(), follower_id) AND NOT public.is_blocked_between(auth.uid(), following_id)));

DROP POLICY IF EXISTS "Likes viewable by authenticated" ON public.likes;
CREATE POLICY "Likes viewable on visible posts" ON public.likes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = likes.post_id));

DROP POLICY IF EXISTS "Comment likes viewable by authenticated" ON public.comment_likes;
CREATE POLICY "Comment likes viewable on visible comments" ON public.comment_likes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_likes.comment_id));

CREATE OR REPLACE FUNCTION public.enforce_post_duration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.expires_at > now() + interval '73 hours' AND NOT public.has_active_plan(NEW.user_id, 'plus') THEN
    NEW.expires_at := now() + interval '72 hours';
  END IF;
  IF NEW.expires_at > now() + interval '7 days 1 hour' THEN
    NEW.expires_at := now() + interval '7 days';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_post_duration ON public.posts;
CREATE TRIGGER enforce_post_duration BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.enforce_post_duration();