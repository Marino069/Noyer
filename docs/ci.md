# CI et déploiements de preview

## Ce qui est en place
- `front/lighthouserc.json` : Lighthouse CI, seuils perf ≥ 90, a11y ≥ 95, SEO ≥ 95 (échec si non atteints).
- `npm --prefix front run lhci` : lance l'audit en local ou en CI (après `build`).

## Workflow à ajouter (`.github/workflows/front-ci.yml`)
Le workflow n'a pas pu être créé par Claude (écriture dans `.github/workflows` hors périmètre). À ajouter à la main :

```yaml
name: front-ci
on:
  pull_request:
    paths: ["front/**"]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: front/package-lock.json
      - run: npm --prefix front ci
      - run: npm --prefix front run lint
      - run: npm --prefix front run typecheck
      - run: npm --prefix front run build
      - run: npm --prefix front run lhci
```

Pour bloquer les PR : activer ce job comme « required status check » dans la protection de `master`.

## Preview par PR
À brancher sur la plateforme d'hébergement choisie (ex. Vercel : import du dossier `front/`, le lien de preview est commenté automatiquement sur chaque PR). Nécessite un compte et des secrets de dépôt : action humaine.

## Tests unitaires
Aucun runner n'est installé (pas de script `test`). À traiter dans un ticket dédié (ex. Vitest) avant de l'ajouter à la CI.
