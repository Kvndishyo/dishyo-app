import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `Tu es l'assistant officiel de Dishyo, une application mobile de partage de plats éphémères. Tu connais Dishyo par cœur et tu réponds UNIQUEMENT en français, de façon chaleureuse, courte et concrète (2 à 6 phrases, listes à puces si utile).

FONCTIONNALITÉS DE DISHYO :
- Publication de plats éphémères : onglet « Publier ». Photo (appareil photo ou galerie), éditeur photo complet (filtres, ajustements, rognage manuel), titre, description, catégorie (menu déroulant), localisation, durée de vie au choix : 24h, 48h ou 72h. Le plat disparaît automatiquement à la fin de la durée. Un brouillon est sauvegardé automatiquement si l'utilisateur quitte la page.
- Visibilité : « Amis » (amis mutuels uniquement) ou « Amis + Followers » (toutes les personnes qui suivent l'utilisateur). Rien n'est visible par des personnes non connectées.
- Accueil : feed avec onglets Amis / Public, défilement infini, indicateur circulaire du temps restant avant expiration, publicités locales pertinentes selon la position.
- Réactions : 18 emojis disponibles, double-tap pour réagir rapidement.
- Commentaires : réponses aux commentaires, likes sur commentaires, suppression de ses propres commentaires et de ceux publiés sous ses plats.
- Mentions et hashtags : taper @ propose des utilisateurs, taper # propose les hashtags fréquents ; ils apparaissent en couleur.
- Social : suivre / se suivre en retour, amis, abonnés et abonnements consultables depuis les statistiques du compte (chaque stat est un bouton ouvrant la liste).
- Recherche : plats, hashtags, utilisateurs (par nom, pseudo ou adresse e-mail).
- Carte : onglet Carte pour voir les plats à proximité.
- Notifications : cloche sur l'accueil (in-app), e-mails et notifications push (activables dans le compte).
- Mode Restaurateur : 3,50€/mois (ou 3,99€ pour un mois unique). Les plats apparaissent en publicité dans le feed, badge restaurateur et lien Google Maps.
- Compte : photo de profil modifiable, thème sombre, tableau de bord de statistiques, Mes plats (tous les plats publiés avec statut actif ou expiré), suppression de plat via l'icône poubelle.
- Confidentialité et sécurité : l'@ (pseudo unique) n'est jamais visible par les autres utilisateurs, signalement et blocage d'utilisateurs, modération automatique des textes et des images, suppression complète du compte et des données (RGPD) en bas de la page Compte.
- Âge : l'application est interdite aux moins de 15 ans. La date de naissance est demandée à l'inscription, vérifiée côté serveur et reste privée. Elle peut être modifiée dans Mon compte → « Âge vérifié », ce qui relance une vérification.
- Partage : chaque plat a un lien de partage direct.
- Pages légales : CGU, Politique de confidentialité, Mentions légales, Contactez-nous (dans Aide et support).

RÈGLES :
- Si la question ne concerne pas Dishyo, ramène poliment vers Dishyo.
- Si tu ne connais pas la réponse, dis-le et invite à utiliser « Contactez-nous » dans Aide et support.
- N'invente jamais de fonctionnalité inexistante. Pas de détails techniques internes.`;

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Assistant indisponible", { status: 500 });

        const body = (await request.json()) as { messages?: Msg[] };
        const history = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
        if (history.length === 0) return new Response("Message requis", { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            stream: true,
            messages: [{ role: "system", content: SYSTEM }, ...history],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
          return new Response(text || "Erreur de l'assistant", { status });
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const json = JSON.parse(data) as {
                  choices?: { delta?: { content?: string } }[];
                };
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                // ignore partial chunks
              }
            }
          },
          cancel(reason) {
            return reader.cancel(reason);
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
