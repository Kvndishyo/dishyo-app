import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listConversations } from "@/lib/chat";
import { useAuth } from "@/hooks/useAuth";

/** Total unread messages across every conversation, kept fresh in realtime. */
export function useUnreadMessages() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id;

  const { data } = useQuery({
    queryKey: ["conversations", uid],
    queryFn: listConversations,
    enabled: !!uid,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel("unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", uid] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);

  const total = (data ?? []).reduce((n, c) => n + (c.unread_count ?? 0), 0);
  return { total, conversations: data ?? [] };
}
