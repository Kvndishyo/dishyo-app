## Lot 2 — Performances & UX

Objectif : rendre l'app fluide même avec beaucoup de contenu, et soigner les détails d'interaction.

### 1. Cache & data fetching (TanStack Query)
- Ajouter `@tanstack/react-query` au provider racine (`src/routes/__root.tsx`) avec un `QueryClient` partagé.
- Migrer les fetchs principaux vers `useQuery` / `useInfiniteQuery` :
  - feed accueil (`src/routes/index.tsx`)
  - mes plats (`src/routes/compte.mes-plats.tsx`)
  - profil utilisateur (`src/routes/profil.$handle.tsx`)
  - recherche (`src/routes/recherche.tsx`)
- Invalidation ciblée après publication, like, commentaire, follow.

### 2. Pagination infinie du feed
- `useInfiniteQuery` sur les posts (10 par page, tri `created_at desc`).
- Sentinelle `IntersectionObserver` en bas du feed pour charger la page suivante.
- Skeleton loaders pendant le chargement.

### 3. Compression d'images côté client
- Installer `browser-image-compression`.
- Dans `PhotoEditor.tsx` / `publier.tsx` : compresser à max 1600px / ~0.8 Mo / WebP avant upload Supabase Storage.
- Bénéfices : uploads plus rapides, moins de bande passante, brouillons localStorage allégés.

### 4. Animations & micro-interactions
- Animation "burst" du cœur au like (framer-motion scale+fade).
- Double-tap sur la photo pour liker (avec animation centrale).
- Indicateur d'expiration type Stories : barre de progression circulaire autour de l'avatar dans `PostCard` (couleur qui passe orange → rouge dans les 6 dernières heures).
- Transition douce lors du changement d'onglet du feed (Pour toi / Amis).

### 5. Détails techniques
- Garder le SSR : `QueryClient` créé dans `getRouter()` (pas de singleton module-level).
- `defaultPreloadStaleTime: 0` côté router pour laisser Query gérer la fraîcheur.
- Realtime Supabase déjà en place → invalider la query correspondante au lieu de remplacer le state local.

### Fichiers impactés (estimation)
- nouveau : `src/lib/queries.ts` (queryOptions centralisés)
- nouveau : `src/components/dishyo/ExpiryRing.tsx`
- modifs : `__root.tsx`, `router.tsx`, `index.tsx`, `compte.mes-plats.tsx`, `profil.$handle.tsx`, `recherche.tsx`, `publier.tsx`, `PhotoEditor.tsx`, `PostCard.tsx`
- dépendances : `@tanstack/react-query`, `browser-image-compression`

Pas de migration SQL nécessaire pour ce lot.

Je lance l'implémentation dès validation.
