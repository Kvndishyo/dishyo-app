-- Owner implies every other role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and (role = _role or role = 'owner'::app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'owner'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('owner'::app_role,'admin'::app_role,'moderator'::app_role,'support'::app_role)
  )
$$;

-- Only owners may grant/revoke the owner role or touch an owner's roles
CREATE OR REPLACE FUNCTION public.admin_set_role(target_user_id uuid, target_role app_role, should_grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.is_owner(caller) OR public.has_role(caller, 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF target_role = 'owner' AND NOT public.is_owner(caller) THEN
    RAISE EXCEPTION 'Seul un owner peut gérer le rôle owner';
  END IF;
  IF public.is_owner(target_user_id) AND NOT public.is_owner(caller) THEN
    RAISE EXCEPTION 'Seul un owner peut modifier les rôles d''un owner';
  END IF;
  IF target_user_id = caller AND target_role IN ('admin','owner') AND should_grant = false THEN
    RAISE EXCEPTION 'Tu ne peux pas retirer ton propre rôle';
  END IF;
  IF should_grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = target_role;
  END IF;
END $$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::app_role FROM public.profiles WHERE handle = 'kvn_'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============ CHAT SETTINGS ============
CREATE TABLE public.admin_chat_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  chat_enabled boolean NOT NULL DEFAULT true,
  read_only boolean NOT NULL DEFAULT false,
  slow_mode_seconds integer NOT NULL DEFAULT 0,
  max_message_length integer NOT NULL DEFAULT 1000,
  welcome_message text,
  pinned_message text,
  retention_days integer NOT NULL DEFAULT 90,
  allow_admin_delete boolean NOT NULL DEFAULT true,
  allow_reactions boolean NOT NULL DEFAULT true,
  show_roles boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.admin_chat_settings TO authenticated;
GRANT ALL ON public.admin_chat_settings TO service_role;
ALTER TABLE public.admin_chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read chat settings" ON public.admin_chat_settings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owners update chat settings" ON public.admin_chat_settings
  FOR UPDATE TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owners insert chat settings" ON public.admin_chat_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_owner(auth.uid()));
CREATE TRIGGER trg_chat_settings_updated BEFORE UPDATE ON public.admin_chat_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.admin_chat_settings (id) VALUES (true);

-- ============ SPEAKERS ============
CREATE TABLE public.admin_chat_speakers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  can_speak boolean NOT NULL DEFAULT true,
  muted_until timestamptz,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_chat_speakers TO authenticated;
GRANT ALL ON public.admin_chat_speakers TO service_role;
ALTER TABLE public.admin_chat_speakers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read speakers" ON public.admin_chat_speakers
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owners manage speakers" ON public.admin_chat_speakers
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE TRIGGER trg_chat_speakers_updated BEFORE UPDATE ON public.admin_chat_speakers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MESSAGES ============
CREATE TABLE public.admin_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_chat_messages_created ON public.admin_chat_messages (created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.admin_chat_messages TO authenticated;
GRANT ALL ON public.admin_chat_messages TO service_role;
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_speak_admin_chat(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; sp record;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  SELECT * INTO s FROM public.admin_chat_settings WHERE id;
  IF s IS NULL OR s.chat_enabled = false THEN RETURN false; END IF;
  IF public.is_owner(_user_id) THEN RETURN true; END IF;
  IF s.read_only THEN RETURN false; END IF;
  IF NOT public.is_staff(_user_id) THEN RETURN false; END IF;
  SELECT * INTO sp FROM public.admin_chat_speakers WHERE user_id = _user_id;
  IF sp IS NULL OR sp.can_speak = false THEN RETURN false; END IF;
  IF sp.muted_until IS NOT NULL AND sp.muted_until > now() THEN RETURN false; END IF;
  RETURN true;
END $$;

CREATE POLICY "Staff read chat messages" ON public.admin_chat_messages
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Allowed staff send messages" ON public.admin_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_speak_admin_chat(auth.uid()));
CREATE POLICY "Authors and owners edit messages" ON public.admin_chat_messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_owner(auth.uid())
    OR (public.has_role(auth.uid(), 'admin')
        AND EXISTS (SELECT 1 FROM public.admin_chat_settings s WHERE s.id AND s.allow_admin_delete))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_owner(auth.uid())
    OR (public.has_role(auth.uid(), 'admin')
        AND EXISTS (SELECT 1 FROM public.admin_chat_settings s WHERE s.id AND s.allow_admin_delete))
  );

CREATE OR REPLACE FUNCTION public.enforce_admin_chat_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; last_at timestamptz;
BEGIN
  SELECT * INTO s FROM public.admin_chat_settings WHERE id;
  IF NOT public.can_speak_admin_chat(NEW.user_id) THEN
    RAISE EXCEPTION 'Tu n''as pas la parole dans ce chat';
  END IF;
  IF length(trim(NEW.body)) = 0 THEN RAISE EXCEPTION 'Message vide'; END IF;
  IF length(NEW.body) > s.max_message_length THEN
    RAISE EXCEPTION 'Message trop long (max % caractères)', s.max_message_length;
  END IF;
  IF s.slow_mode_seconds > 0 AND NOT public.is_owner(NEW.user_id) THEN
    SELECT max(created_at) INTO last_at FROM public.admin_chat_messages WHERE user_id = NEW.user_id;
    IF last_at IS NOT NULL AND last_at > now() - make_interval(secs => s.slow_mode_seconds) THEN
      RAISE EXCEPTION 'Mode lent actif : attends % secondes entre deux messages', s.slow_mode_seconds;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_enforce_admin_chat_rules BEFORE INSERT ON public.admin_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_chat_rules();

CREATE TRIGGER trg_admin_chat_messages_updated BEFORE UPDATE ON public.admin_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chat_messages;

-- Staff directory for the chat / speaker management
CREATE OR REPLACE FUNCTION public.admin_chat_staff()
RETURNS TABLE(user_id uuid, handle text, display_name text, avatar_url text, roles text[], can_speak boolean, muted_until timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.handle, p.display_name, p.avatar_url,
           COALESCE(array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL AND ur.role <> 'user'), ARRAY[]::text[]),
           COALESCE(sp.can_speak, false), sp.muted_until
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.admin_chat_speakers sp ON sp.user_id = p.id
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = p.id AND r.role IN ('owner','admin','moderator','support')
    )
    GROUP BY p.id, sp.can_speak, sp.muted_until
    ORDER BY p.display_name;
END $$;

-- Author info for chat messages (staff only)
CREATE OR REPLACE FUNCTION public.admin_chat_authors()
RETURNS TABLE(user_id uuid, handle text, display_name text, avatar_url text, roles text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.handle, p.display_name, p.avatar_url,
           COALESCE(array_agg(DISTINCT ur.role::text) FILTER (WHERE ur.role IS NOT NULL AND ur.role <> 'user'), ARRAY[]::text[])
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    GROUP BY p.id;
END $$;

REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_speak_admin_chat(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_chat_staff() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_chat_authors() FROM anon;