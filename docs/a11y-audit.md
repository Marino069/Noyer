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
| 3 | Parcours clavier accueil → fiche → panier → paiement vérifié par composants (jsdom), pas en navigateur réel. | Moyen | #237 : test e2e navigateur (Playwright + axe) incluant les contrastes calculés. |
| 4 | Pages de contenu (accueil, légales, contact) pas encore couvertes par axe. | Faible | #238 : étendre les tests axe. |

