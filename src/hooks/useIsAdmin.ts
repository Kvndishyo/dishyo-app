import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StaffRole = "owner" | "admin" | "moderator" | "support";

const STAFF: StaffRole[] = ["owner", "admin", "moderator", "support"];

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
          .filter((x) => STAFF.includes(x));
        setRoles(r);
      }
    })();
    return () => { cancelled = true; };
  }, [session, loading]);

  const list = roles ?? [];
  const isOwner = list.includes("owner");
  return {
    roles: list,
    isOwner,
    isAdmin: isOwner || list.includes("admin"),
    isModerator: isOwner || list.includes("moderator") || list.includes("admin"),
    isSupport: isOwner || list.includes("support") || list.includes("admin"),
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
