# Noyer · Contrat d'API

API REST du back Django (dossier `api/`). Le front l'utilise via `NEXT_PUBLIC_API_URL`
(par défaut `http://localhost:8000/api`). Tant que le back n'existe pas, le front utilise
des mocks MSW qui respectent exactement ce contrat.

Quand le back sera en place, le schéma OpenAPI généré (`/api/schema/`) fera foi.

## Conventions

- JSON, noms de champs en `snake_case`.
- Toutes les routes finissent par `/`.
- **Montants en centimes entiers** (`124000` = CHF 1'240.–). Jamais de nombre décimal.
- Dates au format ISO 8601 (`2026-10-05T14:30:00+02:00`).
- Le panier est identifié par un cookie `HttpOnly` posé par le back (`credentials: "include"` côté front).

### Format d'erreur (toutes les routes)

```json
{ "erreur": { "code": "piece_indisponible", "message": "Cette pièce vient d'être réservée." } }
```

| HTTP | Quand |
|---|---|
| 400 / 422 | Données invalides (`code: "validation"`, avec `details` par champ) |
| 404 | Ressource introuvable |
| 409 | Conflit : pièce ou stock indisponible, commande déjà payée |
| 410 | Réservation expirée |
| 429 | Trop de requêtes |
| 500 | Erreur interne (aucun détail technique) |

### Pagination

```json
{ "count": 42, "next": "…/api/produits/?page=2", "previous": null, "results": [ … ] }
```

## Types communs

```ts
type Gamme = "Classic" | "Premium";

type Image = {
  alt: string;
  largeur_origine: number;
  hauteur_origine: number;
  sources: { largeur: 480 | 960 | 1600; url: string }[]; // WebP
};

type ProduitResume = {
  slug: string;              // "lucerne-premium"
  modele: string;            // "Lucerne"
  gamme: Gamme;
  prix_ttc_centimes: number;
  image_principale: Image | null;
};
```

## Catalogue

### `GET /produits/`

Paramètres : `gamme` (`Classic` | `Premium`), `mis_en_avant` (`true`), `page`.
Réponse : pagination de `ProduitResume` (24 par page). Seuls les produits actifs.
`mis_en_avant=true` ne renvoie que les produits actifs mis en avant (page d'accueil).
Une valeur de `gamme` inconnue renvoie une 400 `validation`.
`image_principale` vaut `{ "url": "…", "alt": "…" }` (ou `null`). Pour une photo téléversée,
l'objet contient en plus `largeur_origine`, `hauteur_origine` et `sources` (WebP en 480, 960 et
1600 px, jamais agrandies au-delà de l'original) ; `url` pointe alors vers la version 960 px.

### `GET /produits/{slug}/`

```json
{
  "slug": "lucerne-premium",
  "modele": { "slug": "lucerne", "nom": "Lucerne", "description": "…" },
  "gamme": "Premium",
  "prix_ttc_centimes": 124000,
  "caracteristiques": { "hauteur_cm": 42, "diametre_cm": 28, "culot": "E27" },
  "matieres": [
    { "nom": "Noyer", "role": "Pied", "entretien": "Huiler une fois par an." },
    { "nom": "Laiton", "role": "Finition", "entretien": "Chiffon doux et sec." }
  ],
  "medias": [ /* Image[], triées par ordre */ ],
  "autre_gamme": "lucerne-classic"
}
```

404 si le produit n'existe pas ou est inactif.

### `GET /modeles/{slug}/`

```json
{ "slug": "lucerne", "nom": "Lucerne", "description": "…", "produits": [ /* ProduitResume[] */ ] }
```

`produits` ne contient que les produits actifs du modèle (une ou deux versions, Classic puis Premium). 404 si le modèle n'a aucun produit actif.

### `GET /produits/{slug}/disponibilite/`

Classic :
```json
{ "gamme": "Classic", "quantite_disponible": 7 }
```

Premium :
```json
{
  "gamme": "Premium",
  "series": [
    { "id": 1, "taille_serie": 50, "pieces_restantes": 12, "numeros_disponibles": [3, 8, 15] }
  ]
}
```

## Contenu éditable

### `GET /contenu/accueil/hero/`

Hero de la homepage, modifiable depuis le back-office (source du CMS : point ouvert n° 3).

```json
{
  "titre": "Une lumière qui prend son temps",
  "mot_italique": "prend son temps",
  "sous_titre": "Lampes semi-artisanales en noyer et laiton, assemblées à Genève.",
  "cta_libelle": "Découvrir les lampes",
  "cta_chemin": "/produits/classic",
  "image": { /* Image, ou null */ }
}
```

`mot_italique` est un fragment de `titre` (ou `null`) mis en italique ; `cta_chemin` est un chemin
public sans préfixe de langue. L'image doit être en contexte, jamais sur fond blanc (brief §06).

### `GET /contenu/accueil/matiere/`

Les 4 gros plans « La matière » de la homepage (brief §05.3), modifiables depuis le back-office.

```json
{
  "titre": "La matière",
  "gros_plans": [
    { "legende": "Noyer", "image": { /* Image */ } }
  ]
}
```

`gros_plans` contient 4 éléments, triés par ordre. L'`alt` de chaque image décrit la matière
(« Grain de noyer huilé, gros plan »).

## Panier

### `GET /panier/`

```json
{
  "lignes": [
    {
      "id": "a1b2",
      "produit": { /* ProduitResume */ },
      "quantite": 1,
      "numero_piece": 7,
      "reservation_expire_le": "2026-10-05T14:45:00+02:00"
    }
  ],
  "sous_total_centimes": 124000,
  "frais_livraison_centimes": 0,
  "tva_incluse_centimes": 9291,
  "taux_tva": "8.10",
  "total_centimes": 124000
}
```

### `POST /panier/lignes/`

Corps : `{ "produit_slug": "lucerne-premium", "quantite": 1, "numero": 7 }` (`numero` optionnel, Premium uniquement).
Réponse 201 : le panier complet. Erreurs : 409 `piece_indisponible` ou `stock_insuffisant`.

### `PATCH /panier/lignes/{id}/`

Corps : `{ "quantite": 2 }` (Classic uniquement). Réponse : le panier complet. Erreur : 409 `stock_insuffisant`.

### `DELETE /panier/lignes/{id}/`

Réponse : le panier complet.

## Commande

### `POST /commandes/`

```json
{
  "email": "client@exemple.ch",
  "adresse_livraison": { "nom": "…", "rue": "…", "npa": "1204", "localite": "Genève", "pays": "CH" },
  "adresse_facturation": null,
  "mode_livraison": "livraison",
  "cgv_acceptees": true
}
```

`mode_livraison` : `livraison` | `retrait_atelier`.
Réponse 201 :
```json
{ "reference": "NOY-2026-00042", "statut": "EnAttente", "total_centimes": 124000 }
```
Erreur : 410 `reservation_expiree`.

Précisions : le panier est lu via le cookie. `adresse_facturation` vaut l'adresse de livraison si
elle est `null`. NPA suisse (`pays` = `CH`) : 4 chiffres. `cgv_acceptees` doit être `true`. Panier
vide ou données invalides : 422/400 `validation`. Si une réservation n'est plus active, aucune
commande n'est créée (410). Sinon les réservations sont prolongées de 30 minutes (paiement),
les prix et noms sont copiés dans la commande et le panier est vidé.

### `GET /commandes/{reference}/?email=…`

```json
{
  "reference": "NOY-2026-00042",
  "statut": "Payee",
  "cree_le": "2026-10-05T14:30:00+02:00",
  "lignes": [
    { "nom_produit": "Lucerne Premium", "gamme": "Premium", "numero_piece": 7,
      "prix_unitaire_centimes": 124000, "quantite": 1 }
  ],
  "total_centimes": 124000
}
```

`statut` : `EnAttente` | `Payee` | `Expediee` | `Annulee`. 404 si la référence et l'email ne correspondent pas.

### `POST /commandes/{reference}/paiement/`

Corps : `{ "methode": "stripe" }` ou `{ "methode": "virement" }`.

Stripe (TWINT et cartes) :
```json
{ "methode": "stripe", "url_paiement": "https://checkout.stripe.com/…" }
```

Virement (Premium uniquement) :
```json
{ "methode": "virement", "iban": "CH…", "beneficiaire": "Noyer", "reference": "NOY-2026-00042", "delai_jours": 5 }
```

Réponse stripe : 201. Le montant est recalculé par le back (CHF) ; le client est redirigé vers
`url_paiement` (page hébergée par Stripe), puis revient sur `/fr/panier/confirmation?reference=…`
(ou `/fr/panier/paiement?reference=…&retour=annule`).

Réponse virement : 201. Crée une transaction `Virement`, prolonge les réservations de 5 jours ouvrés
et envoie un email au client. Sans validation de l'atelier dans ce délai, la commande est annulée
et la pièce libérée. Un second appel renvoie les mêmes coordonnées sans rien prolonger.
Réservé aux commandes contenant du Premium : sinon 422 `virement_indisponible`.

Erreurs : 409 `deja_payee`, 409 `commande_annulee`, 404 (référence inconnue), 410 `reservation_expiree`
(virement), 422 `virement_indisponible`, 502 (Stripe indisponible, ou IBAN non configuré).

### POST /api/webhooks/stripe/
Appelé par Stripe uniquement (pas d'authentification ni de CSRF) : l'en-tête `Stripe-Signature` est
vérifié avec `STRIPE_WEBHOOK_SECRET`. Signature invalide → 400 `signature_invalide`. Sinon 200
`{ "recu": true }`, y compris pour un doublon (même `id` d'événement, appliqué une seule fois).
Événements traités : `checkout.session.completed` (payé → commande `Payee`, réservations
confirmées, email), `checkout.session.async_payment_failed` et `checkout.session.expired`
(transaction `Echouee`). `Webhook.traite` reste faux pour un événement non appliqué.

Vente : la confirmation est atomique (transaction `Confirmee`, commande `Payee`, pièces `Vendue`,
stock Classic décrémenté, réservations `Confirmee`). Paiement reçu après expiration : vendu si
l'article est encore libre, sinon la commande passe `Annulee` avec `a_rembourser` vrai en base et
l'atelier est alerté par email (`ATELIER_EMAIL`).

## Divers

### `POST /contact/`

Corps : `{ "nom": "…", "email": "…", "message": "…", "consentement": true, "site_web": "" }`
(`site_web` est un champ piège anti-robot, toujours vide).
Réponse : 204.

### `POST /newsletter/`

Corps : `{ "email": "…", "consentement": true }`. Réponse : 202 (un email de confirmation est envoyé).

### `GET /health/`

`{ "statut": "ok", "base": "ok", "redis": "ok" }` (503 avec `"statut": "erreur"` si la base ou Redis ne répond pas).
