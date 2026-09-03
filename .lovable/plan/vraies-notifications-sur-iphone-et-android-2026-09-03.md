# Vraies notifications sur iPhone et Android

Objectif : que chaque notification de l'accueil (like, commentaire, réponse, nouvel abonné, plat d'un ami) arrive aussi en notification système sur le téléphone, même app fermée — avec des réglages fins dans l'espace compte.

## Ce qui existe déjà

Dishyo a déjà toute la mécanique d'envoi push : clés VAPID, service worker `push-sw.js`, table des abonnements d'appareils, déclencheurs en base qui envoient un push à chaque notification créée, et un interrupteur "Notifications push" dans le compte. Ce qui manque, c'est l'installation sur le téléphone (obligatoire sur iPhone), les réglages par type, et la version app native pour les stores.

## Étape 1 — PWA installable (effet immédiat, gratuit)

Sur Android, le push web fonctionne déjà dans Chrome ; installée, l'app affiche l'icône Dishyo dans la barre de notification. Sur iPhone, Apple n'autorise le push **que** si l'app a été ajoutée à l'écran d'accueil depuis Safari (iOS 16.4+). Il faut donc guider l'utilisateur.

- Bannière/écran "Installer Dishyo" : détection Android (invite native `beforeinstallprompt`) et iOS (instructions illustrées Partager → Sur l'écran d'accueil).
- L'interrupteur push demande l'installation d'abord sur iPhone au lieu d'échouer silencieusement ; messages clairs pour permission refusée, navigateur non compatible, mode navigation privée.
- Écran de diagnostic dans le compte : état de l'autorisation, appareil enregistré ou non, bouton "Envoyer une notification test".
- Amélioration du contenu des push : titre + texte adaptés au type, photo du plat en icône, clic qui ouvre directement le plat ou le profil concerné, regroupement pour éviter le spam.
- Nettoyage automatique des appareils dont l'abonnement est expiré (évite les envois inutiles).

## Étape 2 — Réglages de notifications dans le compte

Nouvelle page `Compte → Notifications` avec un interrupteur par type :

- J'aime sur mes plats
- Commentaires et réponses
- Nouveaux abonnés
- Plats publiés par mes amis / personnes suivies
- Messages du staff / annonces
- Heures calmes (ne pas déranger, plage horaire au choix)

Les préférences sont stockées en base et respectées au moment de l'envoi : un type désactivé n'envoie plus de push (mais reste visible dans la cloche de l'accueil si souhaité).

## Étape 3 — Application native iOS / Android (stores)

Pour une vraie app téléchargeable sur l'App Store et Google Play, on enveloppe Dishyo avec Capacitor.

- Configuration Capacitor + plateformes iOS et Android dans le projet.
- Notifications natives : Firebase Cloud Messaging pour Android, APNs via Firebase pour iOS — les jetons d'appareil sont enregistrés dans la même table que les abonnements web, et l'envoi choisit automatiquement le bon canal.
- Icônes, splash screen, nom d'app, permissions, deep links (ouvrir un plat depuis une notification).
- Instructions détaillées pour construire et publier.

Ce que tu dois fournir pour cette étape (impossible de le faire depuis Lovable) :
- un Mac avec Xcode (obligatoire pour iOS),
- un compte Apple Developer (99 $/an) et un compte Google Play (25 $ une fois),
- un projet Firebase (gratuit) pour la connexion FCM/APNs.

Le code sera prêt et testable ; la compilation et l'envoi aux stores se font depuis ton ordinateur.

## Détails techniques

- Table `notification_preferences` (user_id + booléens par type + plage horaire), RLS propriétaire, GRANT authenticated/service_role.
- Le trigger `dispatch_push_for_notification` filtre selon ces préférences avant d'appeler `/api/public/push-dispatch`.
- `push_subscriptions` gagne des colonnes `platform` (web/ios/android) et `fcm_token` pour partager la table entre web push et natif ; l'endpoint de dispatch route vers Web Push (VAPID) ou FCM v1 selon la plateforme.
- Composant `InstallPrompt.tsx` (détection iOS/Android/standalone) + `NotificationSettings.tsx`.
- `push-sw.js` enrichi : `notificationclick` → navigation deep link, `tag` pour le regroupement, badge et icône.
- FCM branché via le connecteur Firebase Cloud Messaging (aucune clé à coller dans le chat).

## Ordre proposé

1. Étape 1 + 2 (PWA installable, diagnostic, réglages) — utilisable tout de suite sur Android et iPhone installé.
2. Étape 3 (Capacitor + FCM) quand tu es prêt côté comptes développeurs.
