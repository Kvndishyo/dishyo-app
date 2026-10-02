ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plus_active boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_plus_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_user NOT IN ('postgres', 'service_role') THEN
    NEW.plus_active := OLD.plus_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_plus_active ON public.profiles;
CREATE TRIGGER trg_protect_plus_active
  BEFORE UPDATE OF plus_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_plus_active();

CREATE OR REPLACE FUNCTION public.sync_plus_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE public.profiles
  SET plus_active = public.has_active_plan(uid, 'plus')
  WHERE id = uid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_plus_flag ON public.subscriptions;
CREATE TRIGGER trg_sync_plus_flag
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_plus_flag();

UPDATE public.profiles p
SET plus_active = public.has_active_plan(p.id, 'plus');

CREATE OR REPLACE FUNCTION public.enforce_plus_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.emoji = ANY (ARRAY['🧑‍🍳','🥂','🍾','⭐','👑','🫶']::text[])
     AND NOT public.has_active_plan(NEW.user_id, 'plus') THEN
    RAISE EXCEPTION 'Cette réaction est réservée aux membres Dishyo+';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_plus_like_reaction ON public.likes;
CREATE TRIGGER trg_enforce_plus_like_reaction
  BEFORE INSERT OR UPDATE OF emoji ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plus_reaction();

DROP TRIGGER IF EXISTS trg_enforce_plus_message_reaction ON public.message_reactions;
CREATE TRIGGER trg_enforce_plus_message_reaction
  BEFORE INSERT OR UPDATE OF emoji ON public.message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plus_reaction();

REVOKE ALL ON FUNCTION public.protect_plus_active() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_plus_flag() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_plus_reaction() FROM PUBLIC, anon, authenticated;