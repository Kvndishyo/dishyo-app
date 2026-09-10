export type PlanId = "plus" | "resto" | "resto_pro";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: PlanId;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  interval: "month" | "year" | "trial";
  started_at: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial: boolean;
};

export const PLANS: Record<PlanId, { label: string; price: string; period: string; tagline: string }> = {
  plus: { label: "Dishyo+", price: "4,99€", period: "/ mois", tagline: "Personnalise ton Dishyo" },
  resto: { label: "Restaurateur", price: "14,90€", period: "/ mois", tagline: "Fais découvrir tes plats" },
  resto_pro: { label: "Restaurateur Pro", price: "39,90€", period: "/ mois", tagline: "Visibilité maximale" },
};

export const PLUS_YEARLY = { price: "39,99€", period: "/ an", note: "2 mois offerts" };

/** Accents disponibles pour les abonnés Dishyo+ (valeurs oklch cohérentes avec le design system). */
export const PLUS_ACCENTS: { id: string; label: string; primary: string; ring: string; soft: string; swatch: string }[] = [
  { id: "orange", label: "Orange Dishyo", primary: "oklch(0.68 0.19 42)", ring: "oklch(0.68 0.19 42)", soft: "oklch(0.94 0.05 50)", swatch: "#f2762c" },
  { id: "framboise", label: "Framboise", primary: "oklch(0.62 0.21 5)", ring: "oklch(0.62 0.21 5)", soft: "oklch(0.94 0.05 5)", swatch: "#e0356b" },
  { id: "basilic", label: "Basilic", primary: "oklch(0.62 0.15 150)", ring: "oklch(0.62 0.15 150)", soft: "oklch(0.94 0.05 150)", swatch: "#2f9e63" },
  { id: "myrtille", label: "Myrtille", primary: "oklch(0.55 0.19 275)", ring: "oklch(0.55 0.19 275)", soft: "oklch(0.94 0.05 275)", swatch: "#5b5bd6" },
  { id: "safran", label: "Safran", primary: "oklch(0.78 0.16 85)", ring: "oklch(0.78 0.16 85)", soft: "oklch(0.95 0.06 85)", swatch: "#e0a02a" },
  { id: "cacao", label: "Cacao", primary: "oklch(0.48 0.08 55)", ring: "oklch(0.48 0.08 55)", soft: "oklch(0.93 0.03 55)", swatch: "#6b4a34" },
];

export const PLUS_FRAMES: { id: string; label: string; className: string }[] = [
  { id: "none", label: "Aucun", className: "" },
  { id: "gold", label: "Doré", className: "ring-4 ring-amber-400" },
  { id: "gradient", label: "Dégradé", className: "ring-4 ring-primary" },
  { id: "glow", label: "Halo", className: "ring-4 ring-primary shadow-glow" },
];

export function isActive(s: SubscriptionRow | undefined | null) {
  if (!s) return false;
  return (
    ["trialing", "active", "past_due"].includes(s.status) &&
    new Date(s.current_period_end).getTime() > Date.now()
  );
}
