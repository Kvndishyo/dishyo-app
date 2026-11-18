CREATE TABLE public.user_xp (
  user_id uuid PRIMARY KEY,
  xp integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_xp TO authenticated;
GRANT ALL ON public.user_xp TO service_role;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "XP visible to signed-in users" ON public.user_xp FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.add_xp(_user uuid, _amount integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.user_xp(user_id, xp) VALUES (_user, GREATEST(_amount,0))
  ON CONFLICT (user_id) DO UPDATE SET xp = GREATEST(public.user_xp.xp + _amount, 0), updated_at = now();
$$;
REVOKE EXECUTE ON FUNCTION public.add_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.xp_on_post() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM public.add_xp(NEW.user_id, 50); RETURN NEW;
  ELSE PERFORM public.add_xp(OLD.user_id, -50); RETURN OLD; END IF;
END $$;
CREATE TRIGGER xp_posts AFTER INSERT OR DELETE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.xp_on_post();

CREATE OR REPLACE FUNCTION public.xp_on_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; s int; author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN r := NEW; s := 1; ELSE r := OLD; s := -1; END IF;
  SELECT user_id INTO author FROM public.posts WHERE id = r.post_id;
  PERFORM public.add_xp(r.user_id, 2*s);
  IF author IS NOT NULL AND author <> r.user_id THEN PERFORM public.add_xp(author, 1*s); END IF;
  RETURN r;
END $$;
CREATE TRIGGER xp_likes AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.xp_on_like();

CREATE OR REPLACE FUNCTION public.xp_on_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; s int; author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN r := NEW; s := 1; ELSE r := OLD; s := -1; END IF;
  SELECT user_id INTO author FROM public.posts WHERE id = r.post_id;
  PERFORM public.add_xp(r.user_id, 10*s);
  IF author IS NOT NULL AND author <> r.user_id THEN PERFORM public.add_xp(author, 3*s); END IF;
  RETURN r;
END $$;
CREATE TRIGGER xp_comments AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.xp_on_comment();

INSERT INTO public.user_xp(user_id, xp)
SELECT p.id,
  50*(SELECT count(*) FROM public.posts x WHERE x.user_id=p.id)
 + 2*(SELECT count(*) FROM public.likes l WHERE l.user_id=p.id)
 + 10*(SELECT count(*) FROM public.comments c WHERE c.user_id=p.id)
 + (SELECT count(*) FROM public.likes l JOIN public.posts x ON x.id=l.post_id WHERE x.user_id=p.id AND l.user_id<>p.id)
 + 3*(SELECT count(*) FROM public.comments c JOIN public.posts x ON x.id=c.post_id WHERE x.user_id=p.id AND c.user_id<>p.id)
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;