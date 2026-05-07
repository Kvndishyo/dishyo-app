
-- 1. Hidden column on posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- 2. Forbidden words table
CREATE TABLE IF NOT EXISTS public.forbidden_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.forbidden_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read forbidden words"
  ON public.forbidden_words FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage forbidden words"
  ON public.forbidden_words FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Rate limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(_action text, _max int, _window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cnt int;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF _action = 'post' THEN
    SELECT COUNT(*) INTO cnt FROM public.posts
    WHERE user_id = uid AND created_at > now() - make_interval(secs => _window_seconds);
  ELSIF _action = 'comment' THEN
    SELECT COUNT(*) INTO cnt FROM public.comments
    WHERE user_id = uid AND created_at > now() - make_interval(secs => _window_seconds);
  ELSE
    RETURN true;
  END IF;
  RETURN cnt < _max;
END; $$;

-- 4. Auto-hide post after 3 distinct reports
CREATE OR REPLACE FUNCTION public.auto_hide_reported_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT COUNT(DISTINCT reporter_id) INTO cnt
    FROM public.reports
    WHERE target_type = 'post' AND target_id = NEW.target_id;
    IF cnt >= 3 THEN
      UPDATE public.posts SET hidden = true WHERE id = NEW.target_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_hide_reported_post ON public.reports;
CREATE TRIGGER trg_auto_hide_reported_post
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.auto_hide_reported_post();

-- 5. Update posts SELECT policy to exclude hidden (except for owner & admins)
DROP POLICY IF EXISTS "View visible posts" ON public.posts;
CREATE POLICY "View visible posts"
  ON public.posts FOR SELECT
  USING (
    (expires_at > now())
    AND (NOT is_blocked_between(auth.uid(), user_id))
    AND (
      (auth.uid() = user_id)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (
        (hidden = false)
        AND (
          (EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id))
          OR (EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = posts.user_id AND f.following_id = auth.uid()))
        )
      )
    )
  );
