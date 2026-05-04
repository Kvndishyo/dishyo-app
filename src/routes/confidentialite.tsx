import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({ meta: [{ title: "Dishyo — Politique de confidentialité" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte/aide" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Politique de confidentialité</h1>
      </header>
      <article className="prose prose-sm mx-auto max-w-2xl space-y-4 px-5 py-6 text-sm leading-relaxed">
        <p className="text-xs text-muted-foreground">Dernière mise à jour : 4 mai 2026</p>

        <h2 className="text-base font-bold">1. Données collectées</h2>
        <ul className="list-disc pl-5">
          <li>Email (pour l'authentification)</li>
          <li>Pseudo, nom, photo de profil, bio</li>
          <li>Plats publiés (photo, titre, recette, restaurant, catégorie)</li>
          <li>Interactions : likes, commentaires, abonnements</li>
        </ul>

        <h2 className="text-base font-bold">2. Utilisation</h2>
        <p>Vos données servent uniquement à faire fonctionner l'application : afficher votre profil, livrer le fil à vos amis, vous notifier des interactions.</p>

        <h2 className="text-base font-bold">3. Confidentialité du @</h2>
        <p>Votre identifiant unique (@) n'est visible que par vous. Les autres utilisateurs ne voient que votre nom affiché et votre photo.</p>

        <h2 className="text-base font-bold">4. Visibilité des plats</h2>
        <p>Un plat est visible uniquement par vous, vos abonnés et les comptes que vous suivez. Il disparaît automatiquement après 48 h.</p>

        <h2 className="text-base font-bold">5. Partage avec des tiers</h2>
        <p>Aucune donnée n'est vendue. Nous utilisons Lovable Cloud (hébergement) et, pour les abonnements, un prestataire de paiement sécurisé.</p>

        <h2 className="text-base font-bold">6. Vos droits (RGPD)</h2>
        <ul className="list-disc pl-5">
          <li>Accès, rectification, portabilité</li>
          <li>Suppression : Compte → Supprimer mon compte (effacement immédiat)</li>
          <li>Opposition : contactez-nous via Aide et support</li>
        </ul>

        <h2 className="text-base font-bold">7. Conservation</h2>
        <p>Plats : 48 h. Compte et données associées : jusqu'à suppression du compte.</p>

        <h2 className="text-base font-bold">8. Cookies</h2>
        <p>Nous utilisons uniquement des cookies techniques nécessaires à l'authentification.</p>

        <h2 className="text-base font-bold">9. Contact</h2>
        <p>Pour toute question relative à vos données : Compte → Aide et support → Contactez-nous.</p>
      </article>
    </div>
  );
}
