# Rentabiliser Dishyo : plan Restaurateur repensé + Dishyo+ grand public

## Le principe

Deux sources de revenus complémentaires :

- **Restaurateur** (côté offre) : de la visibilité payante, facturée à la valeur — plus cher, avec des paliers.
- **Dishyo+** (côté grand public) : un abonnement léger de confort et de personnalisation, volume élevé, petit prix.

Aujourd'hui la page Mode Restaurateur affiche « Bientôt disponible » et rien n'est encaissable. C'est le premier verrou à lever.

---

## 1. Plan Restaurateur repensé (3 paliers)

Le tarif actuel (3,50 €/mois) est très bas pour un professionnel. Proposition :

**Découverte — 0 € / 7 jours**
Essai complet, une seule fois, pour convertir. Rappel automatique à J-2.

**Restaurateur — 14,90 € / mois**

- Badge Restaurateur + lien Google Maps sur le profil
- Plats visibles au-delà des abonnés (mention « Pub »)
- Jusqu'à 10 plats mis en avant par mois
- Statistiques par plat : vues, réactions, partages, meilleure heure de publication
- Fiche établissement : horaires, adresse, téléphone, lien de réservation

**Restaurateur Pro — 39,90 € / mois**

- Mise en avant illimitée + priorité dans le feed « autour de moi »
- Ciblage par rayon (1/3/10/20/30 km) et par créneau horaire
- Plusieurs comptes gérants sur un même établissement
- Réponses aux commentaires en tant qu'établissement
- Export des statistiques, bilan mensuel par email
- Badge « Vérifié » après contrôle du SIRET

**Extras à l'unité (sans abonnement)**

- Coup de projecteur 24 h sur un plat : 4,90 €
- Pack 5 coups de projecteur : 19,90 €
Ces achats ponctuels attirent les indépendants qui refusent l'abonnement.

---

## 2. Dishyo+ — grand public

Cible : 4,99 € / mois ou 39,99 € / an (2 mois offerts). Le gratuit doit rester pleinement utilisable ; Dishyo+ vend du confort, pas de l'accès.

**Personnalisation**

- Thèmes de l'app (palettes, mode nuit AMOLED) et icône d'app au choix
- Cadre et effet animé sur la photo de profil, bannière de profil
- Badge Dishyo+ discret et couleur de pseudo
- Filtres et cadres exclusifs dans l'éditeur photo, retrait du filigrane sur les partages

**Fonctionnalités**

- Durée de publication étendue : 7 jours en plus de 24/48/72 h
- Favoris illimités et dossiers de favoris
- Statistiques personnelles : vues par plat, évolution des abonnés
- Voir qui a consulté son plat
- Recherche avancée : filtres distance, fraîcheur, type de plat
- Publications programmées
- Aucune publicité dans le feed
- actions exclusives et emojis animés
- Messagerie : réponses rapides, thèmes de conversation, envoi de plusieurs photos

**Gratifications sociales**

- Séries (« 5 jours d'affilée ») et badges de profil ; certains réservés à Dishyo+
- Classement local hebdomadaire des plats les plus appréciés

---

## 3. Revenus complémentaires

- **Publicité native** pour les non-abonnés : déjà en place côté restaurateurs, à densifier avec le ciblage géographique.
- **Parrainage** : un mois de Dishyo+ offert par filleul actif — croissance et conversion en même temps.
- **Cadeau d'abonnement** : offrir Dishyo+ à un ami.
- **Plus tard** : commission sur les réservations depuis la fiche établissement.

---

## 4. Ordre de mise en œuvre

1. **Encaissement** — créer les produits, brancher le checkout et l'activation automatique du rôle. Sans cela rien d'autre ne rapporte.
2. **Restaurateur 3 paliers + essai 7 jours** — refonte de la page, gestion de l'abonnement et annulation.
3. **Dishyo+ v1** — thèmes, badge, sans publicité, durée 7 jours, favoris illimités, statistiques personnelles.
4. **Dishyo+ v2** — publications programmées, cadres/filtres exclusifs, vues du profil, recherche avancée.
5. **Croissance** — parrainage, cadeau d'abonnement, extras à l'unité.

---

## Détails techniques

- Paiements : l'activation nécessite un forfait Lovable Pro. Provider recommandé après vérification d'éligibilité (produit numérique / abonnement → Paddle ou Stripe géré). Produits créés côté provider, checkout appelé depuis une server function, webhook sous `src/routes/api/public/`.
- Base : table `subscriptions` (user_id, plan, statut, période, provider_ids) + `entitlements` dérivés ; RLS et GRANT sur chaque table ; mise à jour de `profiles.restaurateur` / `restaurateur_plan` par le webhook uniquement.
- Table `establishments` pour la fiche restaurateur (horaires, adresse, SIRET, lien réservation) et `establishment_members` pour les multi-gérants.
- Table `promotions` pour les coups de projecteur 24 h, consommée par le classement du feed et le ciblage par rayon (réutilise `src/lib/geo.ts`).
- Personnalisation Dishyo+ : colonnes de préférences sur `profiles` (thème, cadre, couleur), variables de thème injectées via les tokens de `src/styles.css` ; garde-fou côté serveur pour n'appliquer les options qu'aux abonnés actifs.
- Durée 7 jours : extension de la logique d'expiration existante, conditionnée à l'abonnement.
- Publications programmées : table `scheduled_posts` + tâche planifiée appelant une route publique protégée, comme `api/public/expiry-reminders.ts`.
- Statistiques : table `post_views` avec agrégation, pour éviter de compter en direct sur `posts`.