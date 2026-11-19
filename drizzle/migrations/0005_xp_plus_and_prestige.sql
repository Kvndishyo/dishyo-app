ALTER TABLE public.user_xp ADD COLUMN prestige integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.add_xp(_user uuid, _amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Europe/Paris')::date; mult numeric := 1; cap constant int := 98504;
BEGIN
  SELECT CASE WHEN streak_days >= 7 AND last_post_day >= today - 1 THEN 1.5 ELSE 1 END INTO mult
  FROM public.user_xp WHERE user_id = _user;
  mult := COALESCE(mult,1) * CASE WHEN public.has_active_plan(_user, 'plus') THEN 2 ELSE 1 END;
  INSERT INTO public.user_xp(user_id, xp) VALUES (_user, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_xp SET xp = GREATEST(xp + round(_amount * mult)::int, 0), updated_at = now() WHERE user_id = _user;
  UPDATE public.user_xp SET prestige = prestige + xp / cap, xp = xp % cap WHERE user_id = _user AND xp >= cap;
END $$;
REVOKE EXECUTE ON FUNCTION public.add_xp(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_xp_rank(_user uuid)
RETURNS TABLE(xp integer, prestige integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT xp, prestige FROM public.user_xp WHERE user_id = _user AND auth.uid() IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.public_xp_rank(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_xp_rank(uuid) TO authenticated;