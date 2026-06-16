
-- Extend roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';

-- Search users (admin only)
CREATE OR REPLACE FUNCTION public.admin_search_users(q text)
RETURNS TABLE(user_id uuid, handle text, display_name text, avatar_url text, email text, roles text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.handle, p.display_name, p.avatar_url, u.email::text,
           COALESCE(array_agg(ur.role::text) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::text[])
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE q IS NULL OR length(trim(q)) = 0
       OR p.handle ILIKE '%' || q || '%'
       OR p.display_name ILIKE '%' || q || '%'
       OR u.email ILIKE '%' || q || '%'
    GROUP BY p.id, u.email
    ORDER BY p.display_name
    LIMIT 50;
END $$;

-- Grant/revoke role (admin only)
CREATE OR REPLACE FUNCTION public.admin_set_role(target_user_id uuid, target_role app_role, should_grant boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF target_user_id = auth.uid() AND target_role = 'admin' AND should_grant = false THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role';
  END IF;
  IF should_grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = target_role;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_search_users(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
