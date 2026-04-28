import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/compte/confidentialite")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Confidentialité</h1>
      </header>

      <div className="space-y-4 p-5 text-sm leading-relaxed text-muted-foreground">
        <Section title="Données collectées">
          Nous collectons uniquement les données strictement nécessaires au fonctionnement de Dishyo :
          email, pseudo, photos publiées, interactions (likes, commentaires).
        </Section>
        <Section title="Durée de conservation">
          Les plats publiés sont automatiquement supprimés après 24h. Ton compte et ses données restent
          tant que tu ne supprimes pas ton compte.
        </Section>
        <Section title="Partage des données">
          Aucune donnée personnelle n'est revendue à des tiers. Les données ne sont partagées qu'avec
          les services techniques nécessaires (hébergement, paiement).
        </Section>
        <Section title="Tes droits (RGPD)">
          Tu peux à tout moment exporter tes données ou demander leur suppression depuis ton compte
          ou en nous contactant.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <h3 className="mb-1.5 font-semibold text-foreground">{title}</h3>
      <p>{children}</p>
    </div>
  );
}
