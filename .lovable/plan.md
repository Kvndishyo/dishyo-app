## Problème

Dans `src/components/dishyo/PostCard.tsx`, le sélecteur de réactions affiche 18 emojis dans une seule ligne `flex` avec `overflow-x-auto` et `max-w-[min(90vw,360px)]`. Résultat :

- La rangée déborde largement (18 × ~40px ≈ 720px pour 360px de large), donc la moitié des emojis est masquée hors écran — c'est ce qui donne l'impression qu'« on n'en voit qu'un sur deux ».
- Sur mobile, le scroll horizontal dans un popover est peu découvrable, donc l'utilisateur croit que les emojis manquent / buguent.
- `whileHover={{ scale: 1.4 }}` fait chevaucher les voisins sur desktop, aggravant l'effet.
- Les stagger delays (`i * 0.025`) sur 18 items laissent parfois certains à `scale: 0` si on referme vite.

## Correctif

Remplacer la rangée scrollable par une **grille compacte visible d'un coup** :

- `grid grid-cols-6` (3 rangées × 6 emojis) — tout tient sans scroll même sur les petits écrans.
- Largeur fixe `w-[280px]` pour rester bien positionné sous le bouton et ne jamais sortir de l'écran (ajuster le `left-0` avec un fallback si trop à droite).
- Chaque cellule : `h-11 w-11` (cible tactile ≥44px), `text-2xl`, centrage flex, `rounded-xl hover:bg-muted`.
- Retirer `whileHover scale: 1.4` (chevauchement) → animation plus sobre `whileHover scale: 1.15`.
- Réduire le stagger à `i * 0.015` et `stiffness` plus élevé pour éviter les emojis restés invisibles à la fermeture.
- Garder `key={r}` mais ajouter `type="button"` pour éviter les soumissions accidentelles.
- S'assurer que le popover a `z-30` pour ne pas passer sous le bouton commentaires.

Aucun changement de logique métier ni de base de données — uniquement du CSS/JSX dans `PostCard.tsx`.

## Fichier modifié

- `src/components/dishyo/PostCard.tsx` (bloc `{reactionsOpen && (...)}`)
