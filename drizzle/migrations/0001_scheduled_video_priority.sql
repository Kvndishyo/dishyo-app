ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publish_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "View visible posts" ON public.posts;
CREATE POLICY "View visible posts" ON public.posts FOR SELECT TO authenticated USING (
  (hidden = false) AND (NOT public.is_blocked_between(auth.uid(), user_id)) AND (
    (user_id = auth.uid())
    OR (publish_at <= now() AND (
      (visibility = 'public'::post_visibility)
      OR ((visibility = 'friends'::post_visibility) AND EXISTS (
        SELECT 1 FROM public.follows f1 JOIN public.follows f2
          ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = auth.uid() AND f1.following_id = posts.user_id))
    ))
  )
);

CREATE OR REPLACE FUNCTION public.enforce_post_duration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base timestamptz;
BEGIN
  IF NEW.media_type NOT IN ('image','video') THEN NEW.media_type := 'image'; END IF;
  IF NEW.publish_at IS NULL OR NEW.publish_at < now() THEN NEW.publish_at := now(); END IF;
  IF NEW.publish_at > now() + interval '5 minutes' AND NOT public.has_active_plan(NEW.user_id, 'plus') THEN
    NEW.publish_at := now();
  END IF;
  IF NEW.publish_at > now() + interval '30 days' THEN NEW.publish_at := now() + interval '30 days'; END IF;
  base := NEW.publish_at;
  IF NEW.expires_at > base + interval '73 hours' AND NOT public.has_active_plan(NEW.user_id, 'plus') THEN
    NEW.expires_at := base + interval '72 hours';
  END IF;
  IF NEW.expires_at > base + interval '7 days 1 hour' THEN NEW.expires_at := base + interval '7 days'; END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_post_duration() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_support_priority()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.priority := NEW.user_id IS NOT NULL AND (public.has_active_plan(NEW.user_id,'plus')
    OR public.has_active_plan(NEW.user_id,'restaurateur') OR public.has_active_plan(NEW.user_id,'restaurateur_pro'));
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_support_priority() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS set_support_priority ON public.support_messages;
CREATE TRIGGER set_support_priority BEFORE INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.set_support_priority();