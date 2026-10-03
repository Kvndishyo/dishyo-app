CREATE OR REPLACE FUNCTION public.owner_gift_subscription(_target uuid, _plan text, _days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux owners'; END IF;
  IF _plan NOT IN ('plus','resto','resto_pro') THEN RAISE EXCEPTION 'Plan invalide'; END IF;
  IF _days IS NULL OR _days < 1 OR _days > 3650 THEN RAISE EXCEPTION 'Durée invalide'; END IF;
  INSERT INTO public.subscriptions (user_id, plan, status, interval, trial, started_at, current_period_end, cancel_at_period_end, provider)
  VALUES (_target, _plan, 'active', 'month', false, now(), now() + make_interval(days => _days), true, 'gift')
  ON CONFLICT (user_id, plan) DO UPDATE SET
    status = 'active', trial = false, provider = 'gift', cancel_at_period_end = true,
    current_period_end = GREATEST(public.subscriptions.current_period_end, now()) + make_interval(days => _days),
    updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.owner_revoke_subscription(_target uuid, _plan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux owners'; END IF;
  UPDATE public.subscriptions SET status = 'canceled', current_period_end = now(), updated_at = now()
  WHERE user_id = _target AND plan = _plan;
END $$;

CREATE OR REPLACE FUNCTION public.owner_user_subscriptions(_target uuid)
RETURNS TABLE(plan text, status text, current_period_end timestamptz, provider text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Réservé aux owners'; END IF;
  RETURN QUERY SELECT s.plan, s.status, s.current_period_end, s.provider FROM public.subscriptions s WHERE s.user_id = _target;
END $$;

REVOKE EXECUTE ON FUNCTION public.owner_gift_subscription(uuid,text,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_revoke_subscription(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_user_subscriptions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_gift_subscription(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_revoke_subscription(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_user_subscriptions(uuid) TO authenticated;