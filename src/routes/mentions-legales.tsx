import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Dishyo — Mentions légales" },
      { name: "description", content: "Mentions légales de l'application Dishyo : éditeur, hébergeur, propriété intellectuelle et contact." },
    ],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mentions légales</h1>
      </header>
      <article className="prose prose-sm mx-auto max-w-2xl space-y-4 px-5 py-6 text-sm leading-relaxed">
        <p className="text-xs text-muted-foreground">Dernière mise à jour : 13 juillet 2026</p>

        <h2 className="text-base font-bold">1. Éditeur de l'application</h2>
        <p>
          L'application <strong>Dishyo</strong> est éditée par son propriétaire (ci-après « l'Éditeur »).
          Pour toute demande officielle (identité complète, forme juridique, adresse postale, numéro
          SIREN, numéro de TVA intracommunautaire le cas échéant), merci d'écrire via la page
          <Link to="/compte/contact" className="text-primary underline"> Contact</Link>.
        </p>
        <p>Directeur de la publication : l'Éditeur.</p>

        <h2 className="text-base font-bold">2. Hébergement</h2>
        <p>
          L'application est hébergée par Lovable (infrastructure Cloudflare Workers et Supabase).
          Les données sont stockées dans l'Union européenne dans la mesure du possible.
        </p>

        <h2 className="text-base font-bold">3. Propriété intellectuelle</h2>
        <p>
          La marque « Dishyo », son logo, son interface, ses textes et ses éléments graphiques sont
          la propriété exclusive de l'Éditeur. Toute reproduction, représentation, modification ou
          exploitation sans autorisation écrite préalable est interdite.
        </p>
        <p>
          Les contenus publiés par les utilisateurs (photos, textes, recettes) restent la propriété
          de leurs auteurs. En publiant, l'utilisateur accorde à Dishyo une licence non-exclusive
          d'affichage dans l'application, conformément aux
          <Link to="/cgu" className="text-primary underline"> Conditions Générales d'Utilisation</Link>.
        </p>

        <h2 className="text-base font-bold">4. Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans la
          <Link to="/confidentialite" className="text-primary underline"> Politique de confidentialité</Link>.
          Conformément au RGPD, l'utilisateur dispose d'un droit d'accès, de rectification, de
          suppression, d'opposition et de portabilité de ses données.
        </p>

        <h2 className="text-base font-bold">5. Modération</h2>
        <p>
          Les publications (texte et image) font l'objet d'une modération automatique par
          intelligence artificielle avant mise en ligne, complétée par un signalement communautaire.
          Trois signalements distincts entraînent le masquage automatique du contenu, en attente de
          revue humaine.
        </p>

        <h2 className="text-base font-bold">6. Cookies</h2>
        <p>
          Dishyo n'utilise que des cookies techniques strictement nécessaires à l'authentification
          et au fonctionnement de l'application. Aucun cookie publicitaire ni traceur tiers n'est
          déposé.
        </p>

        <h2 className="text-base font-bold">7. Responsabilité</h2>
        <p>
          L'Éditeur met tout en œuvre pour assurer la disponibilité et la fiabilité de
          l'application, sans garantie d'absence d'interruption ou d'erreur. L'Éditeur ne peut être
          tenu responsable des contenus publiés par les utilisateurs.
        </p>

        <h2 className="text-base font-bold">8. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont soumises au droit français. Tout litige relatif à
          l'utilisation de Dishyo relève de la compétence des tribunaux français.
        </p>

        <h2 className="text-base font-bold">9. Contact</h2>
        <p>
          Pour toute demande légale, DMCA, réquisition ou signalement d'un contenu illicite :
          <Link to="/compte/contact" className="text-primary underline"> Contactez-nous</Link>.
        </p>
      </article>
    </div>
  );
}
