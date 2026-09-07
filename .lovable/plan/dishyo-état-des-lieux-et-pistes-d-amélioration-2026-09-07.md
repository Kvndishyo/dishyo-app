# Dishyo — état des lieux et pistes d'amélioration

## Ce qui est en place

Feed 24/48/72 h, publication avec éditeur photo et brouillon, carte des plats, recherche, profils et handles privés, amis/abonnés, commentaires avec réponses et réactions, messagerie privée et de groupe complète, notifications d'accueil, web push, onboarding, vérification d'âge 15+, signalements/blocages, modération IA des photos, assistant IA d'aide, panneau admin avec rôles owner et chat staff, pages légales, mode sombre, MCP sécurisé.

## Ce qui manque vraiment (par ordre d'impact)

1. **Paiements** — la page Mode Restaurateur affiche « Bientôt disponible » et le bouton est désactivé. Aucun encaissement possible aujourd'hui : c'est le seul revenu prévu et il n'existe pas.
2. **Réglages de notifications invisibles** — les préférences (types de notifs, heures calmes, appareils, test d'envoi) existent côté serveur mais aucune page ne les affiche. Travail déjà payé, non utilisable.
3. **Notifications natives iOS/Android** — aujourd'hui uniquement via l'app installée depuis le navigateur. Pas de version pour l'App Store / Play Store.
4. **Aucun test automatique** — chaque nouvelle modification peut casser une fonctionnalité existante sans que personne le voie avant les utilisateurs.
5. **Emails transactionnels** — pas d'email de bienvenue, de récap, ni de relance.

## Pistes d'amélioration à fort intérêt

- **Rappel « ton plat expire bientôt »** : notification 3 h avant expiration, pousse à republier.
- **Sauvegarde de plats / favoris** : liste personnelle, très demandé sur ce type d'app.
- **Fil « autour de moi »** : onglet qui trie par distance en plus d'Amis/Public.
- **Historique et statistiques par plat** : vues, réactions, partages, meilleure heure de publication.
- **Partage vers l'extérieur** : image générée pour Instagram/WhatsApp avec le plat et le logo, moteur de croissance gratuit.
- **Séries et badges** : « 5 jours de suite », badges de profil, rétention.
- **Recherche améliorée** : filtres par distance, fraîcheur, type de plat.
- **Invitations par lien** : parrainage avec compteur, pour amorcer la base d'utilisateurs.
- **Gamification restaurateur** : essai gratuit 7 jours pour convertir avant le paiement.

## Proposition de chantiers

- **Lot A — Monétisation** : paiements par carte pour les deux formules restaurateur, activation automatique du mode, gestion de l'abonnement et annulation.
- **Lot B — Réglages notifications** : page de réglages branchée sur ce qui existe déjà, plus le rappel d'expiration.
- **Lot C — Croissance** : partage d'image vers les réseaux, favoris, invitations avec parrainage.
- **Lot D — Fiabilité** : tests automatiques sur les parcours clés (inscription, publication, messages) et emails transactionnels.
- **Lot E — Applications natives** : préparation des versions iOS/Android avec vraies notifications système.

## Détails techniques

- Lot A : Stripe via l'outil d'activation, table `subscriptions`, webhook sous `src/routes/api/public/`, mise à jour du rôle restaurateur côté base, remplacement du bouton désactivé de `compte.restaurateur.tsx`.
- Lot B : nouvelle route `compte.notifications.tsx` consommant `getNotificationPrefs`, `saveNotificationPrefs`, `getPushDevices`, `sendTestPush` ; rappel d'expiration via tâche planifiée appelant `api/public/push-dispatch`.
- Lot C : génération d'image côté client (canvas) pour le partage ; table `saved_posts` avec RLS et GRANT.
- Lot D : Vitest sur les helpers (`chat.ts`, `queries.ts`, `age.ts`, `moderation.ts`) et Playwright sur les parcours ; emails via l'infrastructure email du projet.
- Lot E : Capacitor + FCM/APNs, réutilisation de la table d'appareils existante.
