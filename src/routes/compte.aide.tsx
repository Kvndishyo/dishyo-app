import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/compte/aide")({
  component: HelpPage,
});

const FAQ = [
  { q: "Combien de temps reste un plat publié ?", a: "Tous les plats disparaissent automatiquement 24h après leur publication." },
  { q: "Quelle est la différence entre Amis et Public ?", a: "« Amis » : visible uniquement par tes amis mutuels. « Public » : visible par toutes les personnes qui te suivent." },
  { q: "Comment fonctionne le mode Restaurateur ?", a: "Pour 3,50€/mois (ou 3,99€ pour un mois), tes plats apparaissent dans le feed des utilisateurs comme publicité, en plus de débloquer le badge et le lien Google Maps." },
  { q: "Comment supprimer un plat ?", a: "Va dans Compte → Mes plats, puis appuie sur l'icône poubelle." },
  { q: "Comment supprimer mon compte ?", a: "Va tout en bas de la page Compte et appuie sur « Supprimer mon compte »." },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Aide et support</h1>
      </header>

      <div className="space-y-3 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Questions fréquentes
        </h2>
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-2xl bg-card shadow-soft">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="font-semibold">{item.q}</span>
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
