# Interactivité (Epic E9)

Objectif : un site qui réagit, avec 3 effets signature liés à l'atelier (interrupteur, comparateur, loupe) et des réactions fines partout. Validé par le client le 8 novembre 2026.

## Règles communes (tous les tickets E9)
- **Réduire les animations** : avec `prefers-reduced-motion: reduce`, aucune animation ni parallaxe ; l'état final s'affiche directement. Les fonctions restent utilisables (l'interrupteur allume, le comparateur se règle, etc.).
- **Performance** : animer seulement `transform`, `opacity`, `clip-path`, `filter`. Pas de bibliothèque d'animation (GSAP, Framer…) : CSS, Web Animations API, `IntersectionObserver`, animations CSS liées au défilement (`animation-timeline`) avec repli. Les seuils Lighthouse de la CI ne bougent pas (CLS 0, TBT ≤ 200 ms).
- **Accessibilité** : tout ce qui se fait à la souris se fait au clavier et au doigt. Rôles et états ARIA corrects (`aria-pressed`, `role="slider"` + `aria-valuenow`…). Focus visible. Aucune information portée par l'animation seule.
- **Mobile** : cibles de 44 px minimum, pas d'effet de survol obligatoire, pas de curseur personnalisé sur écran tactile.
- **Charte** : couleurs, polices et rayon de `docs/brief.md` uniquement. Le laiton reste un accent.
- **Tests** : comportement et états testés (Vitest + Testing Library) ; le parcours e2e tourne déjà en reduced-motion.
- **Images** : versions allumées `/mocks/<slug>-allumee-*.webp`, gros plans `/mocks/matiere-*-1600.webp` pour la loupe.
