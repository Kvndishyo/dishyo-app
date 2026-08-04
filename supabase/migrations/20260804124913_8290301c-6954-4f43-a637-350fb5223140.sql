-- 1. Table
CREATE TABLE public.user_ages (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birthdate date NOT NULL,
  verified_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE ON public.user_ages TO authenticated;
GRANT ALL ON public.user_ages TO service_role;

-- 3. RLS
ALTER TABLE public.user_ages ENABLE ROW LEVEL SECURITY;

-- 4. Policies (owner only, jamais anon)
CREATE POLICY "Users see own age" ON public.user_ages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own age" ON public.user_ages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own age" ON public.user_ages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Contrôle serveur de l'âge minimum
CREATE OR REPLACE FUNCTION public.enforce_min_age()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.birthdate IS NULL THEN
    RAISE EXCEPTION 'Date de naissance requise';
  END IF;
  IF NEW.birthdate > current_date THEN
    RAISE EXCEPTION 'Date de naissance invalide';
  END IF;
  IF NEW.birthdate < current_date - INTERVAL '120 years' THEN
    RAISE EXCEPTION 'Date de naissance invalide';
  END IF;
  IF NEW.birthdate > current_date - INTERVAL '15 years' THEN
    RAISE EXCEPTION 'Dishyo est interdit aux moins de 15 ans';
  END IF;
  NEW.verified_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_enforce_min_age
BEFORE INSERT OR UPDATE OF birthdate ON public.user_ages
FOR EACH ROW EXECUTE FUNCTION public.enforce_min_age();

-- 6. RPC de (re)vérification
CREATE OR REPLACE FUNCTION public.verify_my_age(_birthdate date)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); v timestamp with time zone;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.user_ages (user_id, birthdate)
  VALUES (uid, _birthdate)
  ON CONFLICT (user_id) DO UPDATE SET birthdate = EXCLUDED.birthdate
  RETURNING verified_at INTO v;
  RETURN v;
END $$;

GRANT EXECUTE ON FUNCTION public.verify_my_age(date) TO authenticated;

-- 7. Inscription : enregistre la date fournie
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare base_handle text; final_handle text; i int := 0; bd date;
begin
  base_handle := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  if base_handle is null or length(base_handle) < 2 then base_handle := 'user' || substr(new.id::text, 1, 6); end if;
  final_handle := base_handle;
  while exists (select 1 from public.profiles where handle = final_handle) loop
    i := i + 1; final_handle := base_handle || i::text;
  end loop;
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (new.id, final_handle, coalesce(new.raw_user_meta_data->>'display_name', final_handle), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');

  begin
    bd := nullif(new.raw_user_meta_data->>'birthdate','')::date;
    if bd is not null then
      insert into public.user_ages (user_id, birthdate) values (new.id, bd);
    end if;
  exception when others then
    raise warning 'birthdate not stored at signup: %', sqlerrm;
  end;

  return new;
end $$;