CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_like boolean NOT NULL DEFAULT true,
  push_comment boolean NOT NULL DEFAULT true,
  push_follow boolean NOT NULL DEFAULT true,
  push_post boolean NOT NULL DEFAULT true,
  push_announce boolean NOT NULL DEFAULT true,
  quiet_enabled boolean NOT NULL DEFAULT false,
  quiet_start time NOT NULL DEFAULT '22:00',
  quiet_end time NOT NULL DEFAULT '08:00',
  tz_offset_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own prefs select" ON public.notification_preferences;
CREATE POLICY "own prefs select" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own prefs insert" ON public.notification_preferences;
CREATE POLICY "own prefs insert" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own prefs update" ON public.notification_preferences;
CREATE POLICY "own prefs update" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own prefs delete" ON public.notification_preferences;
CREATE POLICY "own prefs delete" ON public.notification_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_notification_preferences_updated ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'web';
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS native_token text;

CREATE OR REPLACE FUNCTION public.push_allowed(_user_id uuid, _type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.notification_preferences%ROWTYPE;
  local_time time;
BEGIN
  SELECT * INTO p FROM public.notification_preferences WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF _type = 'like' AND NOT p.push_like THEN RETURN false; END IF;
  IF _type = 'comment' AND NOT p.push_comment THEN RETURN false; END IF;
  IF _type = 'follow' AND NOT p.push_follow THEN RETURN false; END IF;
  IF _type = 'post' AND NOT p.push_post THEN RETURN false; END IF;
  IF _type = 'announce' AND NOT p.push_announce THEN RETURN false; END IF;

  IF p.quiet_enabled THEN
    local_time := ((now() AT TIME ZONE 'UTC') + make_interval(mins => p.tz_offset_minutes))::time;
    IF p.quiet_start < p.quiet_end THEN
      IF local_time >= p.quiet_start AND local_time < p.quiet_end THEN RETURN false; END IF;
    ELSE
      IF local_time >= p.quiet_start OR local_time < p.quiet_end THEN RETURN false; END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$;

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
  post_photo text;
  notif_title text;
  notif_body text;
  notif_url text := '/';
BEGIN
  BEGIN
    IF NOT public.push_allowed(NEW.user_id, NEW.type) THEN
      RETURN NEW;
    END IF;

    SELECT handle, display_name INTO actor_handle, actor_display
    FROM public.profiles WHERE id = NEW.actor_id;
    actor_display := COALESCE(actor_display, actor_handle, 'Quelqu''un');

    IF NEW.post_id IS NOT NULL THEN
      SELECT title, photo_url INTO post_title, post_photo FROM public.posts WHERE id = NEW.post_id;
      notif_url := '/plat/' || NEW.post_id;
    END IF;

    IF NEW.type = 'like' THEN
      notif_title := 'Nouveau like ❤️';
      notif_body  := actor_display || ' a aimé ton plat' || COALESCE(' "' || post_title || '"', '');
    ELSIF NEW.type = 'comment' THEN
      notif_title := 'Nouveau commentaire 💬';
      notif_body  := actor_display || ' a commenté' || COALESCE(' "' || post_title || '"', ' ton plat');
    ELSIF NEW.type = 'follow' THEN
      notif_title := 'Nouvel abonné 🎉';
      notif_body  := actor_display || ' s''est abonné à toi';
      notif_url   := '/profil/' || COALESCE(actor_handle, '');
    ELSIF NEW.type = 'post' THEN
      notif_title := actor_display || ' a publié un plat 🍽️';
      notif_body  := COALESCE(post_title, 'Va voir ce qu''il/elle partage !');
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
        'image', post_photo,
        'notification_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_push_for_notification failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;