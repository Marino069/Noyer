# front/

## Design system

- Chaque nouveau composant du design system doit être ajouté, avec toutes ses variantes, à la page de démonstration `app/[locale]/design-system/page.tsx` (visible en local uniquement : `notFound()` en production).

## Tests

- Un test ne doit jamais remplacer tout le module API (`@/lib/api`), seulement les fonctions qu'il vérifie : utiliser `vi.mock` avec `importOriginal` et ne surcharger que ces fonctions (`{ ...original, api: { ...original.api, maFonction: mock } }`). Sinon, chaque nouvelle section ajoutée à une page casse le test.
