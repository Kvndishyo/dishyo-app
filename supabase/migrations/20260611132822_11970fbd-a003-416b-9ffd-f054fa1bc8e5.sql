
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subs"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Notify followers when a new post is created
CREATE OR REPLACE FUNCTION public.notify_followers_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hidden = false THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    SELECT f.follower_id, NEW.user_id, 'post', NEW.id
    FROM public.follows f
    WHERE f.following_id = NEW.user_id
      AND f.follower_id <> NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_post ON public.posts;
CREATE TRIGGER trg_notify_followers_on_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_on_post();

-- Dispatch push via pg_net when a notification row is inserted
CREATE OR REPLACE FUNCTION public.dispatch_push_for_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_handle text;
  actor_display text;
  post_title text;
  notif_title text;
  notif_body text;
  notif_url text := '/';
BEGIN
  SELECT handle, display_name INTO actor_handle, actor_display
  FROM public.profiles WHERE id = NEW.actor_id;
  actor_display := COALESCE(actor_display, actor_handle, 'Quelqu''un');

  IF NEW.post_id IS NOT NULL THEN
    SELECT title INTO post_title FROM public.posts WHERE id = NEW.post_id;
  END IF;

  IF NEW.type = 'like' THEN
    notif_title := 'Nouveau like ❤️';
    notif_body  := actor_display || ' a aimé ton plat' || COALESCE(' "' || post_title || '"', '');
    notif_url   := '/';
  ELSIF NEW.type = 'comment' THEN
    notif_title := 'Nouveau commentaire 💬';
    notif_body  := actor_display || ' a commenté' || COALESCE(' "' || post_title || '"', ' ton plat');
    notif_url   := '/';
  ELSIF NEW.type = 'follow' THEN
    notif_title := 'Nouvel abonné 🎉';
    notif_body  := actor_display || ' s''est abonné à toi';
    notif_url   := '/profil/' || COALESCE(actor_handle, '');
  ELSIF NEW.type = 'post' THEN
    notif_title := actor_display || ' a publié un plat 🍽️';
    notif_body  := COALESCE(post_title, 'Va voir ce qu''il/elle partage !');
    notif_url   := '/';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://project--c33a9cbe-39e8-4d13-a7fa-307ca249c9af.lovable.app/api/public/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Dispatch-Secret', '99ef5de804e1eb4a864c0fbd501319b2b0804bb376bc1058f14ae371fd674721'
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', notif_title,
      'body', notif_body,
      'url', notif_url,
      'notification_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_push_for_notification ON public.notifications;
CREATE TRIGGER trg_dispatch_push_for_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_push_for_notification();
