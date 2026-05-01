import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadNotifications() {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session) { setCount(0); return; }
    const uid = session.user.id;
    const refresh = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("read", false);
      setCount(c ?? 0);
    };
    refresh();
    const ch = supabase
      .channel(`notifs-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session]);

  return count;
}
