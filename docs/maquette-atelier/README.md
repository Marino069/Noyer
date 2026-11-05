# Maquette « carnet d'atelier » (Epic E8)

Direction visuelle validée le 5 novembre 2026. C'est la référence des tickets E8 : on s'en inspire fidèlement, on ne la recopie pas telle quelle (composants, CSS modules et tokens du projet).

- `accueil.html` : page d'accueil.
- `fiche-premium.html` : fiche produit Premium (choix du numéro, plaque gravée, confirmation d'ajout).

Les fichiers sont des maquettes (format « Design Component » : `<x-dc>`, `{{…}}`, `<sc-for>`), pas du code à importer. Les images pointent vers `front/public/mocks/`.

## Principes
- **Échelle** : titres Fraunces très grands (h1 accueil ≈ 104 px desktop, h2 ≈ 64 px), conteneur 1320 px, sections espacées de 120 à 160 px. Tailles fluides (`clamp`) sur mobile.
- **Traces d'atelier** : bandeau d'atelier (adresse, coordonnées), cotes sur les photos (« H 42 cm », « Ø 28 cm »), légendes numérotées (« FIG. 01 — LE GRAIN »), petites capitales espacées pour les surtitres, filets 1 px.
- **Le geste** : frise des 4 étapes sur registre sombre, numéros 01-04 en Fraunces léger.
- **Laiton** : accent seulement (filets, puces, mot « Premium », bouton du registre sombre). Jamais en aplat de fond (brief §02).
- **Rayon** 2 px partout. Couleurs, polices : uniquement les tokens de `docs/brief.md`.

## Textes à confirmer par le client (garder les placeholders)
`[ADRESSE]`, `[PRÉNOM]`, `[DURÉE DE SÉCHAGE]`, `[HEURES AU TOUR]`, `[NOMBRE DE COUCHES]`.
