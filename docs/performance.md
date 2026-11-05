# Budget de performance

Mesuré sur **mobile** (émulation Lighthouse, 4G ralentie) pour la homepage (`/fr`) et une fiche produit (`/fr/produits/lucerne-classic`). Vérifié par `npm --prefix front run lhci` (voir `front/lighthouserc.json`).

| Indicateur | Seuil | Remarque |
| --- | --- | --- |
| LCP | < 2,5 s | Image du hero : `loading="eager"`, `fetchpriority="high"`, préchargée |
| CLS | < 0,1 | Toutes les images portent `width`/`height` (ratio réservé) |
| INP | < 200 ms | Non mesurable en lab : TBT < 200 ms sert de proxy bloquant, INP en avertissement |
| Poids homepage | < 1,5 Mo (1 572 864 octets) | `total-byte-weight` au premier chargement |

## Images
- Sources WebP multi-résolutions (`srcset` + `sizes` calés sur 600 / 900 px), fournies par l'API ; AVIF puis WebP via `next/image` (`next.config.ts`).
- Lazy loading sous la ligne de flottaison ; seule l'image du hero est chargée en priorité.
- Qualité plancher **80** : en dessous, le grain du bois se dégrade.

## Comparaison visuelle du grain du bois (avant/après compression)
Cette validation est **humaine** et reste à faire sur les vraies photos (les mocks ne contiennent pas de photo de bois) :
1. Exporter l'original et la version compressée (qualité 80) d'une photo de gros plan noyer.
2. Les afficher côte à côte à 100 % et à 200 % ; contrôler les fibres, les pores et les dégradés (pas de bandes ni de blocs).
3. Si le grain est dégradé, relever la qualité (jamais en dessous de 80) et mesurer à nouveau le poids.
4. Consigner la décision ici (date, photo, qualité retenue, poids).
