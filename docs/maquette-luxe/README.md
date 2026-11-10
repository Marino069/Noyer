# Maquette « Maison de luxe » (Epic E10)

Direction validée par le client le 10 novembre 2026. Elle remplace la direction « carnet d'atelier » (`docs/maquette-atelier/`) pour la mise en page ; les interactions de l'Epic E9 (`docs/interactivite.md`) sont conservées et adaptées.

- `accueil.html` : page d'accueil (interrupteur cliquable).
- `fiche-premium.html` : fiche Lucerne Premium (grille des 50 pièces, plaque gravée, réservation).

Maquettes au format « Design Component » (`<x-dc>`, `{{…}}`, `<sc-for>`), pas du code à importer. Images : `front/public/mocks/`.

## Principes
- **Registre sombre par défaut** sur tout le site : fond `#29251F`, sections alternées `#3A3028`, texte `#F5F1E8`, texte secondaire `#DED3C2`. Les couleurs restent celles de `docs/brief.md`.
- **Typographie de maison** : logo « NOYER » en capitales espacées (0.6em) ; menus, surtitres et boutons en petites capitales 11 px espacées (0.22 à 0.4em) ; titres Fraunces 300, très grands (h1 accueil ≈ 96 px, h1 fiche ≈ 80 px, h2 ≈ 56–64 px), italique pour l'accent.
- **Laiton** : filets de 1 px, surtitres, bouton principal (aplat laiton, texte sombre) et boutons secondaires cerclés de laiton. Jamais d'aplat de fond de section.
- **Moins d'éléments** : pas de bandeau d'atelier, pas de bouton noir, pas de cartes bordées. Navigation à 3 colonnes, logo centré.
- **Espace** : sections de 160 à 180 px, images en pleine largeur ou en grands panneaux.
- **Numéros** : chiffres romains (I, II…) pour la matière et le geste.
- **Contraste** : texte ≥ 4.5:1 sur `#29251F` et `#3A3028` (le laiton `#B08D57` n'est utilisé qu'en petites capitales ≥ 11 px avec espacement, à vérifier, sinon en éléments décoratifs).

## Textes à confirmer par le client (garder les placeholders)
`[PRÉNOM]`, `[ADRESSE]`.
