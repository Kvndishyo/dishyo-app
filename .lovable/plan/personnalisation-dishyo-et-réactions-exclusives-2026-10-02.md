# Personnalisation Dishyo+ et réactions exclusives

## Objectif
Rendre les avantages Dishyo+ visibles et fonctionnels dans toute l’application, puis fiabiliser l’affichage et l’enregistrement des réactions aux publications.

## Modifications prévues
- Appliquer immédiatement la couleur d’accent choisie à toute l’interface, en modes clair et sombre, et la conserver après navigation ou redémarrage.
- Afficher le cadre Dishyo+ choisi autour de la photo de profil dans le compte, les profils, le fil, la recherche, les abonnés et abonnements.
- Ajouter un badge Dishyo+ identifiable sur les profils et publications des membres actifs.
- Séparer les réactions standards des réactions exclusives Dishyo+, avec verrouillage et invitation vers Dishyo+ pour les non-membres.
- Corriger le sélecteur de réactions afin que chaque emoji soit lisible, correctement aligné et compatible avec les emojis composés.
- Afficher sous chaque publication le détail des réactions utilisées et leurs compteurs, tout en gardant l’état optimiste lors d’un ajout, changement ou retrait.
- Faire respecter côté base de données l’accès aux réactions exclusives, afin qu’un compte non abonné ne puisse pas les enregistrer directement.

## Vérification
- Vérifier les états membre/non-membre, le changement d’accent et de cadre, ainsi que l’ajout, le changement et le retrait d’une réaction.
- Contrôler l’affichage sur mobile et ordinateur, puis confirmer l’absence d’erreur de compilation et d’exécution.

## Détails techniques
- Étendre les données de profil chargées avec les préférences Dishyo+ nécessaires à l’affichage public.
- Centraliser l’apparence de photo de profil et les catalogues de réactions pour éviter des rendus différents selon les pages.
- Ajouter une validation SQL des emojis exclusifs basée sur l’abonnement actif, sans modifier les réactions déjà enregistrées.
