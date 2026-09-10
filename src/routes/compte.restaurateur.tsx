import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star, Check, MapPin, Megaphone, BadgeCheck, BarChart3, Users, Crown, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/compte/restaurateur")({
  head: () => ({
    meta: [
      { title: "Mode Restaurateur — Dishyo" },
      { name: "description", content: "Mets tes plats en avant auprès des foodies autour de toi : badge, statistiques et visibilité ciblée." },
      { property: "og:title", content: "Mode Restaurateur — Dishyo" },
      { property: "og:description", content: "Badge, statistiques et visibilité ciblée pour ton établissement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RestaurantPage,
});

const TIERS: {
  id: Extract<PlanId, "resto" | "resto_pro">;
  features: { icon: typeof Star; text: string }[];
}[] = [
  {
    id: "resto",
    features: [
      { icon: BadgeCheck, text: "Badge Restaurateur sur ton profil" },
      { icon: Megaphone, text: "Tes plats visibles au-delà de tes abonnés (mention « Pub »)" },
      { icon: Star, text: "Jusqu'à 10 plats mis en avant par mois" },
      { icon: BarChart3, text: "Statistiques par plat : vues, réactions, partages" },
      { icon: MapPin, text: "Fiche établissement : horaires, adresse, réservation" },
    ],
  },
  {
    id: "resto_pro",
    features: [
      { icon: Zap, text: "Mise en avant illimitée et priorité « autour de moi »" },
      { icon: MapPin, text: "Ciblage par rayon (1 à 30 km) et par créneau horaire" },
      { icon: Users, text: "Plusieurs comptes gérants pour un même établissement" },
      { icon: Megaphone, text: "Réponses aux commentaires au nom de l'établissement" },
      { icon: BarChart3, text: "Export des statistiques et bilan mensuel par email" },
      { icon: Crown, text: "Badge « Vérifié » après contrôle du SIRET" },
    ],
  },
];

const EXTRAS = [
  { title: "Coup de projecteur 24 h", price: "4,90€", note: "Un plat mis en avant pendant 24 h" },
  { title: "Pack 5 coups de projecteur", price: "19,90€", note: "À utiliser quand tu veux" },
];

function RestaurantPage() {
  const { restoPlan, get, trialUsed, startTrial, cancel, loading } = useSubscription();
  const [selected, setSelected] = useState<"resto" | "resto_pro">("resto");
  const [busy, setBusy] = useState(false);
  const sub = restoPlan ? get(restoPlan) : undefined;

  async function onTrial() {
    setBusy(true);
    try {
      await startTrial(selected);
      toast.success("Essai de 7 jours activé — ton badge est en ligne 🎉");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'activer l'essai");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mode Restaurateur</h1>
      </header>

      <div className="space-y-6 p-5">
        <div className="rounded-3xl gradient-warm p-6 text-white shadow-glow">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6" />
            <h2 className="text-xl font-bold">Booste ta visibilité</h2>
          </div>
          <p className="mt-2 text-sm text-white/90">
            Mets en avant tes plats auprès des foodies autour de ton établissement.
          </p>
        </div>

        {restoPlan && sub && (
          <div className="rounded-2xl border border-primary/40 bg-accent/40 p-4 text-sm">
            <div className="font-semibold text-primary">
              {PLANS[restoPlan].label} actif {sub.trial ? "(essai gratuit)" : ""}
            </div>
            <p className="text-xs text-muted-foreground">
              {sub.cancel_at_period_end ? "Se termine le " : "Prochaine échéance le "}
              {new Date(sub.current_period_end).toLocaleDateString("fr-FR")}
            </p>
            {!sub.cancel_at_period_end && (
              <button
                onClick={async () => { await cancel(restoPlan); toast.success("Renouvellement annulé"); }}
                className="mt-2 text-xs font-medium text-destructive underline"
              >
                Annuler le renouvellement
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Choisis ta formule</h3>
          {TIERS.map((tier) => {
            const meta = PLANS[tier.id];
            const active = selected === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelected(tier.id)}
                className={`relative block w-full rounded-2xl border-2 p-4 text-left transition ${
                  active ? "border-primary bg-accent/30" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{meta.label}</h4>
                      {tier.id === "resto" && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                          Populaire
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.tagline}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {meta.price}<span className="text-sm font-normal text-muted-foreground">{meta.period}</span>
                    </div>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <f.icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                {active && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onTrial}
          disabled={busy || loading || trialUsed(selected) || restoPlan === selected}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          {restoPlan === selected
            ? "Formule active"
            : trialUsed(selected)
              ? "Essai déjà utilisé"
              : "Essayer 7 jours gratuitement"}
        </button>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sans abonnement</h3>
          <ul className="space-y-2">
            {EXTRAS.map((e) => (
              <li key={e.title} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-soft">
                <div>
                  <div className="text-sm font-semibold">{e.title}</div>
                  <p className="text-xs text-muted-foreground">{e.note}</p>
                </div>
                <span className="text-sm font-bold">{e.price}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          💳 Le paiement par carte arrive bientôt. L'essai gratuit active immédiatement ton badge et tes avantages.
        </p>
      </div>
    </div>
  );
}
