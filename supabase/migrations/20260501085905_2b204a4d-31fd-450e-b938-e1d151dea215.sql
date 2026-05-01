
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID,
  type TEXT NOT NULL CHECK (type IN ('like','comment','follow')),
  post_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Trigger functions
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.posts WHERE id = NEW.post_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (owner, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.posts WHERE id = NEW.post_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (owner, NEW.user_id, 'comment', NEW.post_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.following_id <> NEW.follower_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Update handle function (validates format & uniqueness)
CREATE OR REPLACE FUNCTION public.update_my_handle(new_handle TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE clean TEXT; uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  clean := lower(trim(new_handle));
  IF clean !~ '^[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Pseudo invalide (3-20 caractères, lettres/chiffres/_)';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE handle = clean AND id <> uid) THEN
    RAISE EXCEPTION 'Ce pseudo est déjà pris';
  END IF;
  UPDATE public.profiles SET handle = clean WHERE id = uid;
  RETURN clean;
END; $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
