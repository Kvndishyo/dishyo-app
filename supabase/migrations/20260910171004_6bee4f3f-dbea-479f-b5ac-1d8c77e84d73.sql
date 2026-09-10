-- Profil : options de personnalisation et formule restaurateur
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS restaurateur_plan text,
  ADD COLUMN IF NOT EXISTS plus_theme text,
  ADD COLUMN IF NOT EXISTS plus_accent text,
  ADD COLUMN IF NOT EXISTS plus_frame text;

-- Abonnements
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('plus','resto','resto_pro')),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year','trial')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial boolean NOT NULL DEFAULT false,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan)
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "staff read subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Historique des essais déjà consommés (persiste même après suppression de l'abonnement)
CREATE TABLE IF NOT EXISTS public.trials_used (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan)
);

GRANT SELECT ON public.trials_used TO authenticated;
GRANT ALL ON public.trials_used TO service_role;

ALTER TABLE public.trials_used ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own trials"
  ON public.trials_used FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Un abonnement est-il actif ?
CREATE OR REPLACE FUNCTION public.has_active_plan(_user_id uuid, _plan text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.plan = _plan
      AND s.status IN ('trialing','active','past_due')
      AND s.current_period_end > now()
  );
$$;

-- Synchronise le badge restaurateur du profil
CREATE OR REPLACE FUNCTION public.sync_restaurateur_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := COALESCE(NEW.user_id, OLD.user_id); active_plan text;
BEGIN
  SELECT s.plan INTO active_plan
  FROM public.subscriptions s
  WHERE s.user_id = uid
    AND s.plan IN ('resto','resto_pro')
    AND s.status IN ('trialing','active','past_due')
    AND s.current_period_end > now()
  ORDER BY CASE s.plan WHEN 'resto_pro' THEN 0 ELSE 1 END
  LIMIT 1;

  UPDATE public.profiles
     SET restaurateur = active_plan IS NOT NULL,
         restaurateur_plan = active_plan
   WHERE id = uid;

  RETURN NULL;
END $$;

CREATE TRIGGER trg_sync_restaurateur
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_restaurateur_flag();

-- Démarrer un essai gratuit de 7 jours (une seule fois par formule)
CREATE OR REPLACE FUNCTION public.start_trial(_plan text)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); row public.subscriptions;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _plan NOT IN ('plus','resto','resto_pro') THEN RAISE EXCEPTION 'Formule inconnue'; END IF;
  IF EXISTS (SELECT 1 FROM public.trials_used t WHERE t.user_id = uid AND t.plan = _plan) THEN
    RAISE EXCEPTION 'Essai gratuit déjà utilisé pour cette formule';
  END IF;
  IF public.has_active_plan(uid, _plan) THEN
    RAISE EXCEPTION 'Tu as déjà cette formule active';
  END IF;

  INSERT INTO public.trials_used (user_id, plan) VALUES (uid, _plan);

  INSERT INTO public.subscriptions (user_id, plan, status, interval, trial, current_period_end)
  VALUES (uid, _plan, 'trialing', 'trial', true, now() + interval '7 days')
  ON CONFLICT (user_id, plan) DO UPDATE
    SET status = 'trialing', interval = 'trial', trial = true,
        started_at = now(), current_period_end = now() + interval '7 days',
        cancel_at_period_end = false
  RETURNING * INTO row;

  RETURN row;
END $$;

-- Annuler le renouvellement
CREATE OR REPLACE FUNCTION public.cancel_my_subscription(_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.subscriptions
     SET cancel_at_period_end = true
   WHERE user_id = uid AND plan = _plan;
END $$;

GRANT EXECUTE ON FUNCTION public.start_trial(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_subscription(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_plan(uuid, text) TO authenticated;