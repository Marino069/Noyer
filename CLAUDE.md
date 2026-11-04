# Noyer

Boutique en ligne de lampes artisanales (Genève). Monorepo :
- front/ : Next.js + TypeScript. Conventions dans front/CLAUDE.md.
- api/ : back Django + Django REST Framework. Conventions dans api/CLAUDE.md.
- database/ : scripts d'initialisation MariaDB (base et utilisateurs). Les tables sont créées par les migrations Django.
- docs/ : brief.md (charte), api.md (contrat d'API, la référence entre front et back).

## Fonctionnement
Le projet avance tout seul : un chef d'orchestre lance les tickets, des agents les codent, les vérifient et les fusionnent.
- Un ticket frontend ne touche que front/ (et docs/ si besoin).
- Un ticket backend ne touche que api/ (et peut compléter docs/api.md sans rien casser).
- Une issue = une PR, dont la description commence par "Closes #<numéro>".
- Chaque ticket arrive avec ses tests, écrits à partir des critères d'acceptation.

## Règles
- Ne jamais modifier .github/ : c'est la configuration des agents.
- Ne jamais ajouter de couleur, de police ou de rayon hors des tokens de docs/brief.md.
- Montants toujours en centimes entiers ; jamais de float pour de l'argent.
- Si le back ne fournit pas encore une route, le front utilise les mocks MSW conformes à docs/api.md.
- Ne jamais écrire de secret (mot de passe, clé) dans le code : variables d'environnement uniquement.

## Décisions prises
- Vente en ligne directe : oui (panier, commande, paiement TWINT/carte, virement pour le Premium).
