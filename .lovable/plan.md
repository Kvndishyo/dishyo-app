# Lot 4 — Engagement, sécurité & contenus riches

Objectif : transformer Dishyo en app vivante avec notifications, découverte locale, modération solide et format vidéo court.

## 1. Notifications push & emails transactionnels

- **Web Push** (PWA léger, sans service worker complet) :
  - Demande de permission depuis `/compte` (toggle).
  - Stockage des subscriptions dans une nouvelle table `push_subscriptions` (user_id, endpoint, keys, created_at) + RLS user-only.
  - Server route `/api/public/push/send` (signée HMAC) appelée par triggers DB pour les évènements like / commentaire / follow.
  - Utilisation de `web-push` côté server function avec clés VAPID (secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- **Emails transactionnels** via Lovable Emails :
  - Setup domaine email (dialogue dédié si non configuré).
  - Templates : nouveau follower, plat qui dépasse 10 likes, récap hebdo simple.
  - Trigger : enqueue dans `transactional_emails` depuis les triggers `notify_on_*` existants (avec dédoublonnage 1×/jour/type).
- Préférences dans `/compte/notifications` (nouvelle page) : toggles push / email par catégorie, stockés dans `profiles` (colonnes `notif_push_*`, `notif_email_*`).

## 2. Géolocalisation & carte

- Ajout colonnes `posts.lat double precision`, `posts.lng double precision`, `posts.place_name text` (nullable).
- Capture optionnelle à la publication : bouton "Ajouter ma position" (navigator.geolocation) + reverse geocoding via API Nominatim (gratuite, server function pour cacher l'IP).
- Nouvelle page `/carte` : carte interactive avec **MapLibre GL JS** (open-source, pas de clé) + tuiles MapTiler ou OSM. Markers cluster pour les plats actifs (<48h) dans un rayon configurable (5/10/25/50 km).
- Filtre dans `/recherche` : "Près de moi" (tri par distance via PostGIS `earth_distance` ou calcul Haversine côté SQL function `nearby_posts(lat, lng, radius_km)`).
- Lien "Voir sur la carte" depuis chaque PostCard quand position disponible.

## 3. Modération & sécurité avancée

- **Modération IA des images** à l'upload : server function `/api/moderate-image` qui appelle Lovable AI Gateway (`google/gemini-2.5-flash`) avec image en base64, retourne `{safe: bool, reason: string}`. Blocage upload si non-safe.
- **Modération IA des textes** (titre, recette, commentaires) : même gateway, classification rapide sur `nano` (haine, harcèlement, spam, NSFW). Score >0.7 → refus + message clair.
- **Anti-spam** : rate limit côté SQL (function `check_rate_limit(user_id, action, max, window)`) — max 5 posts / 10 min, 30 commentaires / 5 min.
- **Auto-modération des signalements** : à 3 signalements distincts sur un même post, masquage automatique (nouvelle colonne `posts.hidden boolean`) en attendant revue admin. Visible dans `/admin`.
- **Liste de blocage de mots** maintenue côté admin (`forbidden_words` table) appliquée avant insertion.

## 4. Stories & vidéos courtes

- Support upload vidéo (MP4 / WebM, max 15s, max 25 Mo) dans `publier.tsx` :
  - Détection automatique image vs vidéo.
  - Compression côté client avec `@ffmpeg/ffmpeg` (WebAssembly, ~720p / 2 Mbps) — fallback sans compression si trop lent.
  - Trim 15s max via UI simple (slider début).
- Nouvelle colonne `posts.media_type text` ('image' | 'video') + `posts.video_url text` + `posts.video_duration_ms int`.
- Bucket Storage dédié `dish-videos` (public, max 30 Mo).
- Lecture dans `PostCard` : `<video>` autoplay muted loop quand visible (IntersectionObserver), tap pour son.
- Bandeau Stories en haut du feed : carrousel horizontal des dernières vidéos actives des comptes suivis (style Instagram), tap → plein écran avec swipe vertical/horizontal entre stories.
- Expiration toujours 48h, même règle que les photos.

## Ordre d'implémentation suggéré

1. **Modération avancée** (le plus rapide à shipper, sécurise tout le reste).
2. **Géolocalisation & carte** (autonome, pas de dépendances).
3. **Notifications push & emails** (nécessite setup domaine email + VAPID).
4. **Stories & vidéos** (le plus lourd techniquement, en dernier).

## Détails techniques

- Migrations SQL nécessaires : `push_subscriptions`, `forbidden_words`, ajouts colonnes `posts` (lat, lng, place_name, media_type, video_url, video_duration_ms, hidden), ajouts colonnes `profiles` (préférences notif), function `nearby_posts`, function `check_rate_limit`.
- Bucket Storage : `dish-videos` (public, 30 Mo).
- Secrets à demander : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (générés via `web-push generate-vapid-keys`).
- Domaine email à configurer si pas déjà fait.
- Dépendances : `web-push`, `maplibre-gl`, `@ffmpeg/ffmpeg`, `@ffmpeg/util`.
- Mise à jour RLS posts pour intégrer `hidden = false` dans la policy SELECT.

## Hors scope (à voir plus tard)

- Notifications iOS natives (nécessite app native).
- Géofencing / notifications quand un ami publie près de toi.
- Édition vidéo avancée (filtres, stickers, musique).

## Estimation

~12-15 fichiers nouveaux, ~8 fichiers modifiés, 3-4 migrations SQL, 2 server functions IA. Compter une grosse session pour tout livrer proprement.

Je lance l'étape 1 (modération avancée) dès validation, puis j'enchaîne dans l'ordre proposé.
