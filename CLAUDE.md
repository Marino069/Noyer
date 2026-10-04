# Noyer

Boutique en ligne de lampes artisanales. Monorepo :
- front/ : Next.js + TypeScript (géré par Claude, à créer avec le ticket E0-01)
- api/ : back Django + DRF (géré par Diego, NE JAMAIS MODIFIER)
- database/ : scripts SQL d'initialisation MariaDB (NE JAMAIS MODIFIER)
- docs/ : brief.md (charte), api.md (contrat d'API)

## Règles
- Une issue = une PR, avec "Closes #<numéro>" dans la description.
- Toujours lancer les commandes depuis la racine avec --prefix :
  npm --prefix front run lint / typecheck / build
- Ne jamais ajouter de couleur, de police ou de rayon hors des tokens de docs/brief.md.
- Tant que le back n'est pas prêt, utiliser les mocks MSW conformes à docs/api.md.
