import { useEffect, useState } from "react";
import { Gift, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PLANS, type PlanId } from "@/lib/plans";

type Sub = { plan: string; status: string; current_period_end: string; provider: string | null };

const DURATIONS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "1 mois" },
  { days: 90, label: "3 mois" },
  { days: 365, label: "1 an" },
];

export function GiftSubscription({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [plan, setPlan] = useState<PlanId>("plus");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.rpc("owner_user_subscriptions", { _target: userId });
    if (error) return toast.error(error.message);
    setSubs((data ?? []) as Sub[]);
  }

  useEffect(() => { if (open) load(); }, [open]);

  const active = subs.filter((s) => ["active", "trialing", "past_due"].includes(s.status) && new Date(s.current_period_end) > new Date());

  async function gift() {
    setBusy(true);
    const { error } = await supabase.rpc("owner_gift_subscription", { _target: userId, _plan: plan, _days: days });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${PLANS[plan].label} offert 🎁`);
    load();
  }

  async function revoke(p: string) {
    setBusy(true);
    const { error } = await supabase.rpc("owner_revoke_subscription", { _target: userId, _plan: p });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Abonnement retiré");
    load();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
        <Gift className="h-3.5 w-3.5" /> Offrir un abonnement
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-muted p-3">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Abonnements</span>
        <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
      </div>
      {active.length === 0 && <p className="text-xs text-muted-foreground">Aucun abonnement actif.</p>}
      {active.map((s) => (
        <div key={s.plan} className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-xs">
          <span>
            <b>{PLANS[s.plan as PlanId]?.label ?? s.plan}</b> · jusqu'au {new Date(s.current_period_end).toLocaleDateString("fr-FR")}
            {s.provider === "gift" && " 🎁"}
          </span>
          <button disabled={busy} onClick={() => revoke(s.plan)} className="font-semibold text-destructive">Retirer</button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(PLANS) as PlanId[]).map((p) => (
          <button key={p} onClick={() => setPlan(p)} className={`rounded-full px-3 py-1 text-xs font-semibold ${plan === p ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {PLANS[p].label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DURATIONS.map((d) => (
          <button key={d.days} onClick={() => setDays(d.days)} className={`rounded-full px-3 py-1 text-xs font-semibold ${days === d.days ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {d.label}
          </button>
        ))}
      </div>
      <button disabled={busy} onClick={gift} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />} Offrir
      </button>
      <p className="text-[10px] text-muted-foreground">Si l'abonnement existe déjà, la durée est ajoutée. Il ne se renouvelle pas.</p>
    </div>
  );
}
