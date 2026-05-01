import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star, Check, MapPin, Megaphone, BadgeCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/compte/restaurateur")({
  component: RestaurantPage,
});

function RestaurantPage() {
  const [plan, setPlan] = useState<"monthly" | "single">("monthly");

  const advantages = [
    { icon: Megaphone, text: "Tes plats apparaissent dans le feed des utilisateurs avec la mention « Pub »" },
    { icon: BadgeCheck, text: "Badge Restaurateur visible sur ton profil" },
    { icon: MapPin, text: "Lien Google Maps direct sur ton profil" },
    { icon: Star, text: "Visibilité au-delà de tes abonnés" },
  ];

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
            Mets en avant tes plats auprès de milliers de foodies passionnés.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Avantages
          </h3>
          <ul className="space-y-2">
            {advantages.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <a.icon className="h-4 w-4" />
                </div>
                <p className="pt-1.5 text-sm">{a.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Choisis ta formule
          </h3>
          <div className="space-y-2">
            <PlanCard
              active={plan === "monthly"}
              onClick={() => setPlan("monthly")}
              title="Mensuel"
              price="3,50€"
              period="/ mois"
              note="Renouvelé automatiquement"
              best
            />
            <PlanCard
              active={plan === "single"}
              onClick={() => setPlan("single")}
              title="Un mois"
              price="3,99€"
              period=""
              note="Sans renouvellement"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          💳 Le paiement par carte sera bientôt disponible. Le mode Restaurateur s'activera automatiquement après ton abonnement.
        </div>

        <button
          disabled
          className="w-full rounded-2xl bg-primary/60 px-4 py-4 font-semibold text-primary-foreground opacity-70"
        >
          Bientôt disponible
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  active, onClick, title, price, period, note, best,
}: {
  active: boolean; onClick: () => void; title: string; price: string; period: string;
  note: string; best?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition ${
        active
          ? "border-primary bg-accent/40"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-bold">{title}</h4>
          {best && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
              Recommandé
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold">{price}<span className="text-sm font-normal text-muted-foreground">{period}</span></div>
      </div>
      {active && (
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}
