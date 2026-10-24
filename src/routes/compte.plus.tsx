import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Check, Palette, Clock, BarChart3, EyeOff, Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { PLUS_ACCENTS, PLUS_FRAMES, PLANS, PLUS_YEARLY } from "@/lib/plans";
import { ProfileAvatar } from "@/components/dishyo/ProfileAvatar";
import { playSound, setSoundsEnabled, soundsEnabled } from "@/lib/sounds";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundsEnabled()), []);
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
      <div>
        <p className="text-sm font-semibold">Sons gourmands 🍳</p>
        <p className="text-xs text-muted-foreground">Pop, grésillement et tintement sur tes interactions</p>
      </div>
      <button
        onClick={() => { const n = !on; setSoundsEnabled(n); setOn(n); if (n) playSound("clink", true); }}
        className={`rounded-full px-4 py-1.5 text-xs font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
      >
        {on ? "Activés" : "Coupés"}
      </button>
    </div>
  );
}


export const Route = createFileRoute("/compte/plus")({
  head: () => ({
    meta: [
      { title: "Dishyo+ — personnalise ton expérience" },
      { name: "description", content: "Thèmes, badge exclusif, plats visibles 7 jours, statistiques et zéro publicité : découvre Dishyo+." },
      { property: "og:title", content: "Dishyo+ — personnalise ton expérience" },
      { property: "og:description", content: "Thèmes, badge exclusif, plats visibles 7 jours, statistiques et zéro publicité." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlusPage,
});

const FEATURES = [
  { icon: Palette, title: "Personnalisation", text: "Accent de couleur, cadre de photo de profil et badge Dishyo+." },
  { icon: Clock, title: "Plats visibles 7 jours", text: "En plus des durées 24, 48 et 72 h." },
  { icon: EyeOff, title: "Zéro publicité", text: "Un fil 100 % plats de tes amis et abonnements." },
  { icon: BarChart3, title: "Statistiques", text: "Vues par plat et évolution de tes abonnés." },
  { icon: Gift, title: "Réactions exclusives", text: "Des emojis réservés aux membres Dishyo+." },
];

function PlusPage() {
  const { profile, refreshProfile } = useAuth();
  const { isPlus, get, trialUsed, startTrial, cancel, loading } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [interval, setInterval] = useState<"month" | "year">("month");
  const sub = get("plus");
  const accent = (profile as { plus_accent?: string } | null)?.plus_accent ?? "orange";
  const frame = (profile as { plus_frame?: string } | null)?.plus_frame ?? "none";

  async function savePref(patch: { plus_accent?: string; plus_frame?: string }) {
    if (!profile || savingPref) return;
    setSavingPref(true);
    try {
      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id).select("id").single();
      if (error) throw error;
      await refreshProfile();
    } catch {
      toast.error("Impossible d’enregistrer ta personnalisation. Réessaie.");
    } finally {
      setSavingPref(false);
    }
  }

  async function onTrial() {
    setBusy(true);
    try {
      await startTrial("plus");
      toast.success("Essai Dishyo+ activé pour 7 jours ✨");
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
        <h1 className="text-lg font-semibold">Dishyo+</h1>
      </header>

      <div className="space-y-6 p-5">
        <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-glow">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <h2 className="text-xl font-bold">{PLANS.plus.tagline}</h2>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/90">
            Dishyo reste gratuit. Dishyo+ ajoute du confort, du style et des statistiques.
          </p>
        </div>

        {isPlus && sub && (
          <div className="rounded-2xl border border-primary/40 bg-accent/40 p-4 text-sm">
            <div className="font-semibold text-primary">Dishyo+ actif {sub.trial ? "(essai gratuit)" : ""}</div>
            <p className="text-xs text-muted-foreground">
              {sub.cancel_at_period_end ? "Se termine le " : "Prochaine échéance le "}
              {new Date(sub.current_period_end).toLocaleDateString("fr-FR")}
            </p>
            {!sub.cancel_at_period_end && (
              <button
                onClick={async () => { await cancel("plus"); toast.success("Renouvellement annulé"); }}
                className="mt-2 text-xs font-medium text-destructive underline"
              >
                Annuler le renouvellement
              </button>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Avantages</h3>
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{f.title}</div>
                  <p className="text-xs text-muted-foreground">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {isPlus ? (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Accent de couleur</h3>
              <div className="grid grid-cols-3 gap-2">
                {PLUS_ACCENTS.map((a) => (
                  <Button
                    key={a.id}
                    variant="outline"
                    disabled={savingPref}
                    aria-pressed={accent === a.id}
                    onClick={() => savePref({ plus_accent: a.id })}
                    className={`h-auto justify-start gap-2 whitespace-normal rounded-2xl border-2 p-3 text-left text-xs font-medium transition ${
                      accent === a.id ? "border-primary bg-accent/40" : "border-border bg-card"
                    }`}
                  >
                    <span className={`h-5 w-5 flex-shrink-0 rounded-full accent-swatch-${a.id}`} />
                    <span className="truncate">{a.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cadre de photo</h3>
              {profile && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
                  <ProfileAvatar profile={{ ...profile, plus_active: true, plus_frame: frame }} size="md" />
                  <div><p className="text-sm font-semibold">Aperçu du profil</p><p className="text-xs text-muted-foreground">Visible partout dans Dishyo</p></div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {PLUS_FRAMES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => savePref({ plus_frame: f.id })}
                    className={`rounded-2xl border-2 p-2 text-[11px] font-medium transition ${
                      frame === f.id ? "border-primary bg-accent/40" : "border-border bg-card"
                    }`}
                  >
                    <span className={`mx-auto mb-1 block h-8 w-8 rounded-full bg-muted ${f.className}`} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <SoundToggle />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <PriceCard
                active={interval === "month"}
                onClick={() => setInterval("month")}
                title="Mensuel"
                price={PLANS.plus.price}
                period={PLANS.plus.period}
                note="Sans engagement"
              />
              <PriceCard
                active={interval === "year"}
                onClick={() => setInterval("year")}
                title="Annuel"
                price={PLUS_YEARLY.price}
                period={PLUS_YEARLY.period}
                note={PLUS_YEARLY.note}
                best
              />
            </div>

            <button
              onClick={onTrial}
              disabled={busy || loading || trialUsed("plus")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {trialUsed("plus") ? "Essai déjà utilisé" : "Essayer 7 jours gratuitement"}
            </button>

            <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              💳 Le paiement par carte arrive bientôt. En attendant, l'essai gratuit débloque toutes les options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceCard({
  active, onClick, title, price, period, note, best,
}: { active: boolean; onClick: () => void; title: string; price: string; period: string; note: string; best?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-2xl border-2 p-4 text-left transition ${active ? "border-primary bg-accent/40" : "border-border bg-card"}`}
    >
      <div className="flex items-center gap-2">
        <h4 className="font-bold">{title}</h4>
        {best && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Top</span>}
      </div>
      <div className="mt-1 text-xl font-bold">
        {price}<span className="text-sm font-normal text-muted-foreground">{period}</span>
      </div>
      <p className="text-xs text-muted-foreground">{note}</p>
      {active && (
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}
