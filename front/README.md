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
npm --prefix front run format
```

## Arborescence

- `app/` : pages (App Router)
- `components/` : composants React
- `lib/` : utilitaires, client API
- `styles/` : CSS global et tokens (`tokens.css`, issus de `docs/brief.md`)
- `content/` : contenus éditoriaux

## Pre-commit

Husky lance lint-staged à chaque commit (ESLint sans warning + Prettier) : un commit qui ne passe pas le lint est bloqué.
