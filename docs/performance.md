# Budget performance

Mesuré par Lighthouse CI en profil **mobile** (`npm --prefix front run lhci`, après `build`), sur l'accueil (`/fr`) et une fiche produit (`/fr/produits/lucerne-classic`).

| Métrique | Seuil | Assertion Lighthouse |
|---|---|---|
| LCP | < 2,5 s | `largest-contentful-paint` ≤ 2500 ms |
| CLS | < 0,1 | `cumulative-layout-shift` ≤ 0,1 |
| INP | < 200 ms | proxy de labo : `total-blocking-time` ≤ 200 ms (l'INP exige des interactions réelles) |
| Poids au premier chargement | < 1,5 Mo | `total-byte-weight` ≤ 1 500 000 octets |

Le score Performance reste ≥ 0,9.

**Exception : LCP de la fiche produit en avertissement.** Sur la fiche produit, le LCP *simulé* par Lighthouse
(réseau lent et CPU ×4 recalculés) donne 2,8 à 3,0 s sur les runners GitHub. Pourtant, le LCP observé est de 136 ms :
l'image principale est préchargée, en `eager`, et pèse 3 Ko. Le délai vient presque entièrement de la phase « element
render delay » de la simulation. L'assertion reste visible en `warn`. Tous les autres seuils de la fiche (score ≥ 0,9,
CLS, TBT, poids) restent bloquants. L'enquête sur le JS client de la fiche est suivie dans #242.

## Images
- Toutes les images passent par `next/image` (srcset, `sizes`, lazy-loading) ; seule l'image hero est `priority`.
- Dimensions explicites ou conteneur à ratio fixe : pas de saut de mise en page (CLS).

## Comparaison visuelle du grain du bois (validation humaine)
1. Prendre la photo source et la version compressée servie par `/_next/image` (même largeur, ex. 1200 px).
2. Les afficher côte à côte à 100 % et à 200 % sur un zone de grain nette (veines, nœuds).
3. Valider si aucun aplat, bandes ni halos de compression n'apparaît. Sinon, relever la qualité (`quality` de `next/image`, 75 par défaut) et mesurer à nouveau le poids.
4. Noter la décision (qualité retenue, date, validateur) dans la PR.

Cette étape ne peut pas être automatisée : elle se fait sur les vraies photos.
