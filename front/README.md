# Noyer — Frontend

Next.js (App Router) + TypeScript `strict`, qui consomme l'API REST Django (`docs/api.md`).

## Démarrage

Depuis la racine du dépôt :

```bash
npm --prefix front install        # installe aussi le hook Husky
cp front/.env.example front/.env.local
npm --prefix front run dev        # http://localhost:3000
```

## Variables d'environnement

| Variable              | Rôle                        |
| --------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL` | URL de base de l'API Django |

## Commandes

```bash
npm --prefix front run lint
npm --prefix front run typecheck
npm --prefix front run build
npm --prefix front run test
npm --prefix front run format
```

## Tests

Tests unitaires avec Vitest, Testing Library et jsdom (aucun navigateur requis).

```bash
npm --prefix front run test
```

La commande lance les tests une seule fois (pas de mode surveillance) et retourne un code de sortie non nul si un test échoue.

- Placer chaque test à côté du fichier testé, nommé `<Fichier>.test.tsx` (ou `.test.ts`), p. ex. `components/Button.test.tsx`.
- Configuration : `vitest.config.mts` ; `vitest.setup.ts` charge les matchers `jest-dom` et nettoie le DOM entre les tests.
- L'alias `@/` fonctionne comme dans l'application.

## Arborescence

- `app/` : pages (App Router)
- `components/` : composants React
- `lib/` : utilitaires, client API
- `styles/` : CSS global et tokens (`tokens.css`, issus de `docs/brief.md`)
- `content/` : contenus éditoriaux

## Lighthouse CI

Après `npm --prefix front run build` :

```bash
npm --prefix front run lhci
```

Seuils bloquants (`lighthouserc.json`) : performance ≥ 90, accessibilité ≥ 95, SEO ≥ 95.
La CI (lint, typecheck, build, Lighthouse, preview) est décrite dans `docs/ci.md`.

## Pre-commit

Husky lance lint-staged à chaque commit (ESLint sans warning + Prettier) : un commit qui ne passe pas le lint est bloqué.
