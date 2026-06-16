import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StaffRole = "admin" | "moderator" | "support";

export function useStaffRoles() {
  const { session, loading } = useAuth();
  const [roles, setRoles] = useState<StaffRole[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) { setRoles([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!cancelled) {
        const r = (data ?? [])
          .map((x: { role: string }) => x.role as StaffRole)
          .filter((x) => x === "admin" || x === "moderator" || x === "support");
        setRoles(r);
      }
    })();
    return () => { cancelled = true; };
  }, [session, loading]);

  const list = roles ?? [];
  return {
    roles: list,
    isAdmin: list.includes("admin"),
    isModerator: list.includes("moderator") || list.includes("admin"),
    isSupport: list.includes("support") || list.includes("admin"),
    isStaff: list.length > 0,
    loading: loading || roles === null,
  };
}

/** Backwards-compatible alias used by older callers. */
export function useIsAdmin() {
  const { isAdmin, isStaff, loading } = useStaffRoles();
  // Existing call sites use this to gate the admin link — open it to any staff role.
  return { isAdmin: isStaff, isStrictAdmin: isAdmin, loading };
}
