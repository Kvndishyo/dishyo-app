
-- ========== BLOCKS ==========
CREATE TABLE public.blocks (
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own blocks" ON public.blocks
FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users manage own blocks" ON public.blocks
FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);

-- Helper: is there a block between two users (either direction)?
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- ========== REPORTS ==========
CREATE TYPE public.report_target AS ENUM ('post', 'comment', 'profile');
CREATE TYPE public.report_status AS ENUM ('open', 'reviewed', 'dismissed', 'actioned');

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reports" ON public.reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users see own reports" ON public.reports
FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update reports" ON public.reports
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);

-- ========== UPDATE POSTS RLS to exclude blocked users ==========
DROP POLICY IF EXISTS "View visible posts" ON public.posts;
CREATE POLICY "View visible posts" ON public.posts
FOR SELECT USING (
  expires_at > now()
  AND NOT public.is_blocked_between(auth.uid(), user_id)
  AND (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id)
    OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = posts.user_id AND f.following_id = auth.uid())
  )
);

-- ========== UPDATE COMMENTS RLS ==========
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable except from blocked" ON public.comments
FOR SELECT USING (
  auth.uid() IS NULL OR NOT public.is_blocked_between(auth.uid(), user_id)
);

-- ========== UPDATE search_users to exclude blocked ==========
CREATE OR REPLACE FUNCTION public.search_users(q text)
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.* FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE (q IS NULL OR length(trim(q)) = 0
     OR p.handle ILIKE '%' || q || '%'
     OR p.display_name ILIKE '%' || q || '%'
     OR u.email ILIKE '%' || q || '%')
    AND NOT public.is_blocked_between(auth.uid(), p.id)
  LIMIT 30;
$$;
