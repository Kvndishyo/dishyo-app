CREATE TABLE public.saved_posts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;
GRANT ALL ON public.saved_posts TO service_role;

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_posts_select_own" ON public.saved_posts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "saved_posts_insert_own" ON public.saved_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_posts_delete_own" ON public.saved_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX saved_posts_user_created_idx ON public.saved_posts (user_id, created_at DESC);

CREATE TABLE public.post_expiry_reminders (
  post_id uuid NOT NULL PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.post_expiry_reminders TO service_role;

ALTER TABLE public.post_expiry_reminders ENABLE ROW LEVEL SECURITY;