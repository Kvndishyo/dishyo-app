import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isActive, PLUS_ACCENTS, type PlanId, type SubscriptionRow } from "@/lib/plans";

export function useSubscription() {
  const { session, loading: authLoading, refreshProfile } = useAuth();
  const [subs, setSubs] = useState<SubscriptionRow[] | null>(null);
  const [trialsUsed, setTrialsUsed] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!session) { setSubs([]); setTrialsUsed([]); return; }
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", session.user.id),
      supabase.from("trials_used").select("plan").eq("user_id", session.user.id),
    ]);
    setSubs((s ?? []) as unknown as SubscriptionRow[]);
    setTrialsUsed(((t ?? []) as { plan: string }[]).map((r) => r.plan));
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const list = subs ?? [];
  const get = (plan: PlanId) => list.find((s) => s.plan === plan);
  const active = (plan: PlanId) => isActive(get(plan));

  async function startTrial(plan: PlanId) {
    const { error } = await supabase.rpc("start_trial", { _plan: plan });
    if (error) throw new Error(error.message);
    await load();
    await refreshProfile();
  }

  async function cancel(plan: PlanId) {
    const { error } = await supabase.rpc("cancel_my_subscription", { _plan: plan });
    if (error) throw new Error(error.message);
    await load();
  }

  return {
    loading: authLoading || subs === null,
    subscriptions: list,
    get,
    isPlus: active("plus"),
    restoPlan: active("resto_pro") ? ("resto_pro" as const) : active("resto") ? ("resto" as const) : null,
    trialUsed: (plan: PlanId) => trialsUsed.includes(plan),
    startTrial,
    cancel,
    reload: load,
  };
}

/** Applique l'accent de couleur choisi par les abonnés Dishyo+. */
export function usePlusAppearance() {
  const { profile } = useAuth();
  const { isPlus, loading } = useSubscription();

  useEffect(() => {
    if (typeof document === "undefined" || loading) return;
    const root = document.documentElement;
    const accent = isPlus
      ? PLUS_ACCENTS.find((a) => a.id === (profile as { plus_accent?: string } | null)?.plus_accent)
      : undefined;
    if (!accent || accent.id === "orange") {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--primary-soft");
      return;
    }
    root.style.setProperty("--primary", accent.primary);
    root.style.setProperty("--ring", accent.ring);
    root.style.setProperty("--accent", accent.soft);
    root.style.setProperty("--primary-soft", accent.soft);
  }, [isPlus, loading, profile]);
}
