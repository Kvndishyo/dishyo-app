
-- 1. Posts duration: 24h -> 48h
ALTER TABLE public.posts ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');

-- 2. New RLS for posts: visible only to author, viewer's followings, or viewer's followers (no public-to-all).
DROP POLICY IF EXISTS "View visible posts" ON public.posts;
CREATE POLICY "View visible posts" ON public.posts FOR SELECT USING (
  expires_at > now() AND (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = posts.user_id)
    OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = posts.user_id AND f.following_id = auth.uid())
  )
);

-- 3. Comment replies + likes + extended delete policy
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

DROP POLICY IF EXISTS "Users delete own comments" ON public.comments;
CREATE POLICY "Users delete own or post-owner comments" ON public.comments FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id AND p.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comment likes viewable by everyone" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own comment likes" ON public.comment_likes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Search users (incl. by email) via SECURITY DEFINER RPC. Email is NOT returned.
CREATE OR REPLACE FUNCTION public.search_users(q text)
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.* FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE q IS NULL OR length(trim(q)) = 0
     OR p.handle ILIKE '%' || q || '%'
     OR p.display_name ILIKE '%' || q || '%'
     OR u.email ILIKE '%' || q || '%'
  LIMIT 30;
$$;
