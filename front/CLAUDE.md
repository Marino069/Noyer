# front/

## Design system

- Chaque nouveau composant du design system doit être ajouté, avec toutes ses variantes, à la page de démonstration `app/[locale]/design-system/page.tsx` (visible en local uniquement : `notFound()` en production).

## Tests

- Un test ne doit jamais remplacer tout le module API (`@/lib/api`), seulement les fonctions qu'il vérifie : utiliser `vi.mock` avec `importOriginal` et ne surcharger que ces fonctions dans `api`. Sinon, chaque nouvelle section de la homepage casse le test.
