# Audit accessibilité (E7-02)

## Ce qui est automatisé (en CI, via `npm --prefix front test`)

`front/tests/e7-02-a11y.test.tsx` :
- axe-core (WCAG 2.0/2.1 A + AA) sur en-tête/pied de page, fiche produit (Classic et Premium), panier, commande, paiement : **zéro violation critique ou sérieuse**.
- Parcours clavier : lien d'évitement → navigation, et tabulation complète du formulaire de commande.
- Contrastes des tokens (calcul WCAG) en registre clair et sombre, seuil 4.5:1.

Limite : jsdom ne calcule ni la mise en page ni les styles CSS, donc la règle axe `color-contrast` est désactivée et remplacée par le calcul sur les tokens.

## Écarts restants

| # | Écart | Gravité | Suite |
|---|-------|---------|-------|
| 1 | `--brass` sur `--dark-bg-alt` = 4.16:1 : OK pour bordures, focus, grand texte (3:1), insuffisant pour du texte courant. Aucun texte courant concerné aujourd'hui ; ne pas en ajouter. | Faible | #235 : arbitrer avec la charte (brief §04) avant tout texte laiton sur `--dark-bg-alt`. |
| 2 | Test lecteur d'écran (VoiceOver, NVDA) sur la fiche produit : non réalisable en CI ni par un agent. | À faire à la main | #236 : recette manuelle VoiceOver/NVDA. |
| 3 | ~~Parcours clavier vérifié seulement par composants (jsdom).~~ **Résolu (#237)** : `front/e2e/parcours-clavier.spec.ts` (Playwright, Chromium, mocks MSW) fait accueil → fiche → panier → commande → paiement au clavier, vérifie le focus visible à chaque Tab et lance axe-core (contrastes réels du navigateur) à chaque page. Tourne via `npm test` dans la CI front. | Résolu | #237 : fait. |
| 4 | ~~Pages de contenu (accueil, légales, contact) pas encore couvertes par axe.~~ **Résolu (#238)** : `front/tests/e7-08-axe-contenu.test.tsx` lance axe sur l'accueil, les trois pages légales et le contact (zéro violation critique ou sérieuse). | Résolu | #238 : fait. |

## Vérification finale Maison de luxe (E10-10)

Pages vérifiées : accueil, catalogue, fiches Classic et Premium, panier, commande, paiement, confirmation, rendez-vous, contact, pages légales, design system.

- **Contrastes** : tokens du registre sombre ≥ 4.5:1 (tests existants E7-02/E10) ; aucune couleur codée en dur hors `tokens.css` (test E10-10).
- **Clavier** : parcours Playwright (#237) et axe inchangés, verts.
- **Reduced-motion** : la règle globale de `styles/globals.css` neutralise toutes les transitions et animations des modules CSS ; transitions de page et parallaxe déjà désactivées (test E10-10).
- **Petites capitales** : écart corrigé. Cinq surtitres avaient un espacement hors maquette (0.2em ou 0.08em) : `Serie`, `Footer`, `FicheProduit`, `Frise` (durée), `atelier/LegendeFigure`. Ils utilisent maintenant `--ls-eyebrow` (0.28em).
- **Non vérifiable ici** : rendu réel à 390 px et scores Lighthouse (mesurés par la CI, `lighthouserc.json`) ; VoiceOver/NVDA restent à faire à la main (#236). Le laiton en texte sur `--dark-bg-alt` (écart 1) reste à arbitrer (#235).

