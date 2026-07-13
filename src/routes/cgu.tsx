import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/cgu")({
  head: () => ({ meta: [{ title: "Dishyo — Conditions Générales d'Utilisation" }] }),
  component: CGU,
});

function CGU() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Conditions Générales d'Utilisation</h1>
      </header>
      <article className="prose prose-sm mx-auto max-w-2xl space-y-4 px-5 py-6 text-sm leading-relaxed">
        <p className="text-xs text-muted-foreground">Dernière mise à jour : 4 mai 2026</p>

        <h2 className="text-base font-bold">1. Objet</h2>
        <p>Dishyo est une application sociale permettant le partage éphémère (48 h) de plats entre amis et abonnés. En utilisant l'application, vous acceptez les présentes conditions.</p>

        <h2 className="text-base font-bold">2. Inscription</h2>
        <p>L'inscription nécessite une adresse email valide. Vous devez avoir au moins 13 ans. Vous êtes responsable de la confidentialité de votre mot de passe.</p>

        <h2 className="text-base font-bold">3. Contenus</h2>
        <p>Vous restez propriétaire de vos contenus. En publiant, vous accordez à Dishyo une licence non-exclusive pour les afficher dans l'application. Sont interdits : harcèlement, contenus haineux, violents, sexuellement explicites, illégaux, ou trompeurs.</p>

        <h2 className="text-base font-bold">4. Modération</h2>
        <p>Vous pouvez signaler tout contenu via l'icône drapeau. Dishyo se réserve le droit de supprimer un contenu, de suspendre ou de fermer un compte qui enfreint les règles.</p>

        <h2 className="text-base font-bold">5. Mode Restaurateur</h2>
        <p>L'abonnement payant donne accès à des avantages décrits dans l'application. Le paiement est mensuel, sans engagement, résiliable à tout moment.</p>

        <h2 className="text-base font-bold">6. Suppression de compte</h2>
        <p>Vous pouvez supprimer votre compte à tout moment depuis Compte → Supprimer mon compte. Toutes vos données seront effacées sous 30 jours.</p>

        <h2 className="text-base font-bold">7. Responsabilité</h2>
        <p>Dishyo est fourni « tel quel ». Nous ne garantissons pas l'absence d'interruption ni l'exactitude des contenus publiés par les utilisateurs.</p>

        <h2 className="text-base font-bold">8. Droit applicable</h2>
        <p>Les présentes CGU sont régies par le droit français. Tout litige relèvera des tribunaux compétents.</p>

        <h2 className="text-base font-bold">9. Contact</h2>
        <p>Pour toute question : Compte → Aide et support → Contactez-nous.</p>
      </article>
    </div>
  );
}
