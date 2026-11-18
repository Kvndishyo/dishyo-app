ALTER TABLE public.user_xp ADD COLUMN streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_xp ADD COLUMN last_post_day date;

CREATE OR REPLACE FUNCTION public.add_xp(_user uuid, _amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Europe/Paris')::date; mult numeric := 1;
BEGIN
  SELECT CASE WHEN streak_days >= 7 AND last_post_day >= today - 1 THEN 1.5 ELSE 1 END INTO mult
  FROM public.user_xp WHERE user_id = _user;
  INSERT INTO public.user_xp(user_id, xp) VALUES (_user, GREATEST(_amount,0))
  ON CONFLICT (user_id) DO UPDATE SET xp = GREATEST(public.user_xp.xp + round(_amount * COALESCE(mult,1))::int, 0), updated_at = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.add_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.xp_on_post() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_xp(user_id, xp, streak_days, last_post_day) VALUES (NEW.user_id, 0, 1, today)
    ON CONFLICT (user_id) DO UPDATE SET
      streak_days = CASE WHEN public.user_xp.last_post_day = today THEN public.user_xp.streak_days
                         WHEN public.user_xp.last_post_day = today - 1 THEN public.user_xp.streak_days + 1
                         ELSE 1 END,
      last_post_day = today;
    PERFORM public.add_xp(NEW.user_id, 50); RETURN NEW;
  ELSE PERFORM public.add_xp(OLD.user_id, -50); RETURN OLD; END IF;
END $$;