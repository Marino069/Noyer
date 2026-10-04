# Noyer · Backlog complet frontend et backend


*Version du 4 octobre 2026.*

## Sommaire

- [Stack et architecture](#stack-et-architecture)
- [Ordre de réalisation](#ordre-de-réalisation)
- [Récapitulatif de tous les tickets](#récapitulatif-de-tous-les-tickets)
- [Backend](#backend)
- [Frontend](#frontend)
- [Correspondance frontend ↔ backend](#correspondance-frontend--backend)
- [Points ouverts](#points-ouverts)


## Stack et architecture

Quatre containers Docker, plus un worker pour les tâches planifiées :

| Container | Rôle | Technologies |
|---|---|---|
| `front` | Site public | Next.js, TypeScript |
| `back` | API REST et administration de l'atelier | Python, Django, Django REST Framework |
| `worker` | Tâches planifiées (expiration des réservations, annulations) | Même code que le back, APScheduler |
| `mariadb` | Base de données unique `noyer` | MariaDB, schéma géré par les migrations Django |
| `redis` | Paniers, cache, limitation de débit | Redis |


Le back est découpé en apps par domaine (catalogue, inventaire, panier, commande, paiement). Le paiement passe par **Stripe Checkout**, qui gère TWINT et les cartes pour les paiements en CHF.


## Ordre de réalisation

### Phase 1 · Socle

Les deux projets démarrent, tournent dans Docker et partagent un design system.

- **Backend** (7) : B0-01, B0-02, B0-03, B0-04, B0-05, B0-06, B0-07
- **Frontend** (15) : E0-01, E0-02, E0-03, E0-04, E0-05, E0-06, E1-01, E1-02, E1-03, E1-04, E1-05, E1-06, E1-07, E2-01, E2-02

### Phase 2 · Site vitrine et administration

Le site affiche le vrai catalogue et l'atelier gère ses produits. Un lancement en vitrine est possible à la fin de cette phase.

- **Backend** (13) : B1-01, B1-02, B1-03, B1-04, B2-01, B6-01, B6-02, B6-03, B6-04, B6-05, B7-01, B7-02, B7-03
- **Frontend** (19) : E2-03, E3-01, E3-02, E3-03, E3-04, E3-05, E4-01, E4-02, E4-03, E4-04, E4-05, E6-01, E6-02, E6-03, E6-04, E7-01, E7-02, E7-03, E7-04

### Phase 3 · Vente en ligne

Panier, réservation, commande et paiement. Bloquée tant que la vente en ligne directe n'est pas confirmée.

- **Backend** (14) : B2-02, B2-03, B2-04, B3-01, B3-02, B3-03, B3-04, B4-01, B4-03, B4-04, B5-01, B5-02, B5-03, B6-06
- **Frontend** (7) : E2-04, E5-01, E5-02, E5-03, E5-04, E5-05, E5-06

### Phase 4 · Compléments

Fonctions utiles mais non indispensables au lancement.

- **Backend** (3) : B4-02, B5-04, B7-04

Dans la phase 3, commencer par **B2-02** : la réservation sûre est la pièce la plus délicate du projet, toute la chaîne B2-02 → B4-01 → B5-03 garantit qu'une pièce numérotée n'est jamais vendue deux fois.

## Récapitulatif de tous les tickets

| Id | Titre | Type | Taille | Prio | Phase | Dépend de |
|---|---|---|---|---|---|---|
| [B0-01](#b0-01) | Initialiser le projet Django + DRF | Technique | S | P0 | 1 | — |
| [B0-02](#b0-02) | Modèles Django et migrations du schéma | Technique | M | P0 | 1 | B0-01 |
| [B0-03](#b0-03) | Format d'erreur, documentation API et CORS | Technique | S | P0 | 1 | B0-01 |
| [B0-04](#b0-04) | Connexion Redis | Technique | S | P0 | 1 | B0-01 |
| [B0-05](#b0-05) | Tests automatisés et CI | Technique | M | P1 | 1 | B0-02 |
| [B0-06](#b0-06) | Docker Compose complet | Technique | S | P0 | 1 | B0-02, B0-04 |
| [B0-07](#b0-07) | Ajouter le champ « mis en avant » au produit | Technique | S | P1 | 1 | B0-02 |
| [B1-01](#b1-01) | Lister les produits | Story | M | P0 | 2 | B0-02, B0-03 |
| [B1-02](#b1-02) | Consulter une fiche produit | Story | M | P0 | 2 | B1-01 |
| [B1-03](#b1-03) | Consulter un modèle et ses deux versions | Story | S | P2 | 2 | B1-02 |
| [B1-04](#b1-04) | Produits mis en avant | Story | S | P1 | 2 | B1-01, B0-07 |
| [B2-01](#b2-01) | Connaître la disponibilité d'un produit | Story | M | P0 | 2 | B1-02 |
| [B2-02](#b2-02) | Réserver un article de façon sûre ⚠️ | Technique | L | P0 | 3 | B2-01 |
| [B2-03](#b2-03) | Libérer une réservation ⚠️ | Technique | S | P0 | 3 | B2-02 |
| [B2-04](#b2-04) | Expirer automatiquement les réservations ⚠️ | Technique | M | P0 | 3 | B2-03, B0-06 |
| [B3-01](#b3-01) | Avoir un panier sans compte ⚠️ | Story | M | P0 | 3 | B0-04 |
| [B3-02](#b3-02) | Ajouter une lampe au panier ⚠️ | Story | M | P0 | 3 | B3-01, B2-02 |
| [B3-03](#b3-03) | Modifier ou retirer un article ⚠️ | Story | S | P0 | 3 | B3-02, B2-03 |
| [B3-04](#b3-04) | Calculer le récapitulatif du panier ⚠️ | Technique | S | P1 | 3 | B3-01 |
| [B4-01](#b4-01) | Passer commande ⚠️ | Story | L | P0 | 3 | B3-04, B3-02 |
| [B4-02](#b4-02) | Suivre ma commande ⚠️ | Story | S | P1 | 4 | B4-01 |
| [B4-03](#b4-03) | Recevoir les emails de commande ⚠️ | Story | M | P1 | 3 | B4-01 |
| [B4-04](#b4-04) | Annuler les commandes jamais payées ⚠️ | Technique | S | P1 | 3 | B4-01, B2-04 |
| [B5-01](#b5-01) | Payer par TWINT ou carte ⚠️ | Story | L | P0 | 3 | B4-01 |
| [B5-02](#b5-02) | Recevoir les webhooks Stripe ⚠️ | Technique | L | P0 | 3 | B5-01 |
| [B5-03](#b5-03) | Confirmer la vente après paiement ⚠️ | Technique | M | P0 | 3 | B5-02, B2-02 |
| [B5-04](#b5-04) | Payer un Premium par virement ⚠️ | Story | M | P2 | 4 | B5-01 |
| [B6-01](#b6-01) | Se connecter à l'administration | Story | S | P0 | 2 | B0-02 |
| [B6-02](#b6-02) | Gérer le catalogue | Story | M | P0 | 2 | B6-01, B1-02 |
| [B6-03](#b6-03) | Ajouter des photos produit | Story | M | P1 | 2 | B6-02 |
| [B6-04](#b6-04) | Créer une série Premium numérotée | Story | M | P0 | 2 | B6-02 |
| [B6-05](#b6-05) | Gérer le stock Classic | Story | S | P1 | 2 | B6-02 |
| [B6-06](#b6-06) | Suivre et traiter les commandes ⚠️ | Story | M | P0 | 3 | B6-01, B4-01 |
| [B7-01](#b7-01) | Contacter l'atelier | Story | S | P1 | 2 | B0-03 |
| [B7-02](#b7-02) | S'inscrire à la newsletter | Story | S | P2 | 2 | B0-03 |
| [B7-03](#b7-03) | Limiter les abus | Technique | S | P1 | 2 | B0-04 |
| [B7-04](#b7-04) | Répondre aux demandes nLPD d'un client | Story | S | P2 | 4 | B6-06 |
| [E0-01](#e0-01) | Initialiser le projet Next.js | Ticket | S | P0 | 1 | — |
| [E0-02](#e0-02) | Design tokens CSS de la charte | Ticket | S | P0 | 1 | E0-01 |
| [E0-03](#e0-03) | Typographie : Fraunces & Hanken Grotesk | Ticket | S | P0 | 1 | E0-02 |
| [E0-04](#e0-04) | Routage i18n (FR par défaut, prêt pour EN/DE) ⚠️ | Ticket | M | P1 | 1 | E0-01 |
| [E0-05](#e0-05) | Client API typé vers le back + mocks | Ticket | M | P0 | 1 | E0-01 |
| [E0-06](#e0-06) | CI : lint, tests, Lighthouse + déploiements de preview | Ticket | M | P1 | 1 | E0-01 |
| [E1-01](#e1-01) | Boutons primaire & secondaire (registres clair et sombre) | Ticket | S | P0 | 1 | E0-02, E0-03 |
| [E1-02](#e1-02) | Composant Section (clair / alterné / sombre) | Ticket | S | P0 | 1 | E0-02 |
| [E1-03](#e1-03) | Composant image responsive (AVIF/WebP, srcset, lazy) | Ticket | M | P0 | 1 | E0-01 |
| [E1-04](#e1-04) | ProductCard Classic / Premium | Ticket | M | P0 | 1 | E1-01, E1-02, E1-03 |
| [E1-05](#e1-05) | Focus, skip link et utilitaires d'accessibilité | Ticket | S | P0 | 1 | E0-02 |
| [E1-06](#e1-06) | Champs de formulaire | Ticket | M | P1 | 1 | E0-02, E0-03 |
| [E1-07](#e1-07) | Affichage prix & badges | Ticket | S | P1 | 1 | E0-02 |
| [E2-01](#e2-01) | Header & navigation desktop | Ticket | S | P0 | 1 | E1-01, E0-03 |
| [E2-02](#e2-02) | Menu burger mobile (< 800px) | Ticket | M | P0 | 1 | E2-01 |
| [E2-03](#e2-03) | Footer : Genève, contact, newsletter, légal | Ticket | M | P1 | 2 | E1-02, E1-06 |
| [E2-04](#e2-04) | Indicateur panier dans le header ⚠️ | Ticket | S | P1 | 3 | E2-01 |
| [E3-01](#e3-01) | Homepage : Hero | Ticket | M | P0 | 2 | E1-01, E1-03, E2-01 |
| [E3-02](#e3-02) | Homepage : La matière (4 gros plans) | Ticket | S | P1 | 2 | E1-03, E1-02 |
| [E3-03](#e3-03) | Homepage : Deux gammes | Ticket | S | P0 | 2 | E1-04 |
| [E3-04](#e3-04) | Homepage : L'atelier (registre sombre) | Ticket | S | P1 | 2 | E1-02, E1-03 |
| [E3-05](#e3-05) | Homepage : Sélection produits | Ticket | M | P1 | 2 | E1-04, E0-05 |
| [E4-01](#e4-01) | Page listing produits avec filtre par gamme | Ticket | M | P1 | 2 | E1-04, E0-05 |
| [E4-02](#e4-02) | Template fiche produit | Ticket | L | P0 | 2 | E1-03, E1-07, E0-05 |
| [E4-03](#e4-03) | Spécificités fiche Premium : processus et numérotation | Ticket | M | P1 | 2 | E4-02 |
| [E4-04](#e4-04) | SEO : metadata, sitemap, robots | Ticket | M | P1 | 2 | E4-02 |
| [E4-05](#e4-05) | Données structurées schema.org Product | Ticket | S | P2 | 2 | E4-02 |
| [E5-01](#e5-01) | Panier : état, persistance, page panier ⚠️ | Ticket | M | P0 | 3 | E1-07, E0-05 |
| [E5-02](#e5-02) | Réservation temporaire d'une pièce numérotée ⚠️ | Ticket | M | P0 | 3 | E5-01, E4-03 |
| [E5-03](#e5-03) | Checkout : coordonnées & livraison ⚠️ | Ticket | M | P0 | 3 | E5-01, E1-06 |
| [E5-04](#e5-04) | Paiement TWINT et carte bancaire ⚠️ | Ticket | L | P0 | 3 | E5-03 |
| [E5-05](#e5-05) | Virement bancaire pour le Premium ⚠️ | Ticket | S | P2 | 3 | E5-04 |
| [E5-06](#e5-06) | Pages confirmation, échec et suivi de commande ⚠️ | Ticket | S | P1 | 3 | E5-04 |
| [E6-01](#e6-01) | Récupérer les contenus éditoriaux | Ticket | M | P0 | 2 | E0-05 |
| [E6-02](#e6-02) | Page L'atelier / Notre histoire | Ticket | M | P1 | 2 | E6-01, E1-02, E1-03 |
| [E6-03](#e6-03) | Page contact / showroom | Ticket | M | P1 | 2 | E1-06, E0-05 |
| [E6-04](#e6-04) | Pages légales : Impressum, CGV, confidentialité | Ticket | S | P0 | 2 | E6-01 |
| [E7-01](#e7-01) | Bannière de consentement cookies (nLPD) | Ticket | M | P0 | 2 | E1-01 |
| [E7-02](#e7-02) | Audit accessibilité | Ticket | M | P1 | 2 | E3-05, E4-02 |
| [E7-03](#e7-03) | Budget performance & optimisation des images | Ticket | M | P1 | 2 | E1-03, E3-01 |
| [E7-04](#e7-04) | Pages 404 et erreur | Ticket | S | P2 | 2 | E1-01, E1-02 |

## Backend

### B0 · Socle technique

Projet Django + DRF, base MariaDB via les migrations Django, Redis, tests, Docker.

<a id="b0-01"></a>
#### B0-01 · Initialiser le projet Django + DRF

*Tâche technique · Taille S · Priorité P0 · Phase 1 · Aucune dépendance*

**Objectif.** Poser la structure du back, découpée par domaine.

**Détails techniques**
- Python 3.12+, `django`, `djangorestframework`, `django-environ` (lecture du `.env`), `ruff`
- `django-admin startproject config .` puis une app par domaine : `catalogue`, `inventaire`, `panier`, `commande`, `paiement`
- Toutes les routes de l'API sous `/api/`, l'administration sous `/admin/`
- Endpoint `GET /api/health` qui vérifie la base et Redis

**Critères d'acceptation**
- [ ] `python manage.py runserver` démarre sans erreur
- [ ] `ruff check .` passe
- [ ] Un `.env.example` liste toutes les variables, aucun secret dans le repo

<a id="b0-02"></a>
#### B0-02 · Modèles Django et migrations du schéma

*Tâche technique · Taille M · Priorité P0 · Phase 1 · Dépend de B0-01*

**Objectif.** Les migrations Django deviennent la source de vérité du schéma, et produisent exactement les tables du MCD validé.

**Détails techniques**
- Moteur `django.db.backends.mysql` (compatible MariaDB) avec le driver `mysqlclient`
- Une classe par table dans l'app de son domaine, avec `db_table = "Produit"` etc. pour garder les noms du schéma
- Contraintes dans `Meta.constraints` : `UniqueConstraint(fields=["modele", "gamme"])`, série + numéro, commande + type d'adresse
- La règle « une seule réservation active par pièce » (colonne générée + index unique) n'est pas exprimable par l'ORM sur MariaDB : l'ajouter dans une migration `RunSQL`
- `01_init.sql` ne crée plus que la base et les utilisateurs ; `manage.py migrate` est lancé avec `adm_noyer`, l'application tourne avec `app_noyer`

**Critères d'acceptation**
- [ ] `manage.py migrate` sur une base vide crée toutes les tables métier
- [ ] Les contraintes d'unicité et les clés étrangères sont présentes en base
- [ ] Un test vérifie que deux réservations actives sur la même pièce sont refusées

<a id="b0-03"></a>
#### B0-03 · Format d'erreur, documentation API et CORS

*Tâche technique · Taille S · Priorité P0 · Phase 1 · Dépend de B0-01*

**Détails techniques**
- `EXCEPTION_HANDLER` DRF personnalisé → toujours `{"erreur": {"code": "...", "message": "..."}}`
- Exceptions métier : `PieceIndisponible` (409), `ReservationExpiree` (410)…
- `drf-spectacular` : schéma OpenAPI sur `/api/schema/` et documentation sur `/api/docs/` (le front s'en sert pour générer ses types, ticket E0-05)
- `django-cors-headers` : seule l'URL du front est autorisée

**Critères d'acceptation**
- [ ] 404, 409, 422 et 500 renvoient tous le format standard
- [ ] Une erreur 500 ne montre aucun détail technique et est journalisée
- [ ] La documentation de l'API est consultable

<a id="b0-04"></a>
#### B0-04 · Connexion Redis

*Tâche technique · Taille S · Priorité P0 · Phase 1 · Dépend de B0-01*

**Détails techniques**
- `django-redis` comme backend de cache Django (paniers, cache, compteurs de limitation)
- URL dans le `.env` : `redis://redis:6379/0`

**Critères d'acceptation**
- [ ] `/api/health` vérifie Redis
- [ ] Un test écrit et relit une clé avec expiration

<a id="b0-05"></a>
#### B0-05 · Tests automatisés et CI

*Tâche technique · Taille M · Priorité P1 · Phase 1 · Dépend de B0-02*

**Détails techniques**
- `pytest` + `pytest-django`, client de test DRF (`APIClient`)
- Les tests tournent sur MariaDB (pas SQLite) pour tester les vrais verrous et contraintes
- Données de test : un modèle, un produit Classic, un produit Premium, une série de pièces
- GitHub Actions : ruff + pytest à chaque pull request

**Critères d'acceptation**
- [ ] `pytest` passe en local et en CI
- [ ] Une PR dont les tests échouent ne peut pas être fusionnée

<a id="b0-06"></a>
#### B0-06 · Docker Compose complet

*Tâche technique · Taille S · Priorité P0 · Phase 1 · Dépend de B0-02, B0-04*

**Détails techniques**
- Containers : `mariadb`, `redis`, `back` (gunicorn), `front`, `worker` (tâches planifiées, B2-04)
- Au démarrage du back : `migrate` puis `collectstatic`
- `depends_on` avec `condition: service_healthy` sur MariaDB
- Volume pour les photos téléversées (`MEDIA_ROOT`)

**Critères d'acceptation**
- [ ] `docker compose up` démarre toute l'application sur une machine vierge
- [ ] Les photos et les données survivent à un redémarrage

<a id="b0-07"></a>
#### B0-07 · Ajouter le champ « mis en avant » au produit

*Tâche technique · Taille S · Priorité P1 · Phase 1 · Dépend de B0-02*

**Détails techniques**
- `Produit.mis_en_avant = BooleanField(default=False)` + migration
- Modifiable dans l'administration (B6-02)

**Critères d'acceptation**
- [ ] La migration s'applique sur une base existante sans perte de données

### B1 · Catalogue

Exposer les modèles, produits, matières et photos au front.

<a id="b1-01"></a>
#### B1-01 · Lister les produits

*User story · Taille M · Priorité P0 · Phase 2 · Dépend de B0-02, B0-03*

> En tant que **visiteur**, je veux voir la liste des lampes, filtrable par gamme, afin de choisir celle qui me plaît.

**Détails techniques**
- `GET /api/produits/?gamme=Classic|Premium&page=1`
- DRF `ListAPIView` + `django-filter`, pagination DRF (24 par page)
- Réponse : slug, nom du modèle, gamme, prix, photo principale avec son alt
- `select_related("modele", "gamme")` pour éviter une requête par produit

**Critères d'acceptation**
- [ ] Seuls les produits actifs apparaissent
- [ ] Le filtre gamme fonctionne, une valeur inconnue renvoie une erreur de validation
- [ ] La réponse contient le nombre total de résultats

<a id="b1-02"></a>
#### B1-02 · Consulter une fiche produit

*User story · Taille M · Priorité P0 · Phase 2 · Dépend de B1-01*

> En tant que **visiteur**, je veux voir le détail d'une lampe (photos, dimensions, matières, entretien, prix), afin de décider de l'acheter.

**Détails techniques**
- `GET /api/produits/{slug}/`
- Réponse : produit, modèle, gamme, `caracteristiques` (JSON), matières avec rôle et entretien, médias triés par ordre
- Champ `autre_gamme` : slug de l'autre version du même modèle, ou `null`
- `prefetch_related` sur médias et matières

**Critères d'acceptation**
- [ ] Slug inexistant ou produit inactif → 404
- [ ] `autre_gamme` relie Classic et Premium dans les deux sens
- [ ] Médias triés par ordre

<a id="b1-03"></a>
#### B1-03 · Consulter un modèle et ses deux versions

*User story · Taille S · Priorité P2 · Phase 2 · Dépend de B1-02*

> En tant que **visiteur**, je veux voir un modèle avec ses versions Classic et Premium côte à côte, afin de comparer les finitions.

**Détails techniques**
- `GET /api/modeles/{slug}/` → modèle + ses produits actifs

**Critères d'acceptation**
- [ ] Renvoie une ou deux versions selon les gammes existantes
- [ ] 404 si le modèle n'a aucun produit actif

<a id="b1-04"></a>
#### B1-04 · Produits mis en avant

*User story · Taille S · Priorité P1 · Phase 2 · Dépend de B1-01, B0-07*

> En tant que **visiteur**, je veux voir une sélection de lampes sur la page d'accueil, afin de découvrir la collection rapidement.

**Détails techniques**
- `GET /api/produits/?mis_en_avant=true` (réutilise B1-01)

**Critères d'acceptation**
- [ ] Seuls les produits actifs et mis en avant sont renvoyés

### B2 · Inventaire

Disponibilité, réservation et expiration. Une pièce Premium n'est jamais vendue deux fois.

<a id="b2-01"></a>
#### B2-01 · Connaître la disponibilité d'un produit

*User story · Taille M · Priorité P0 · Phase 2 · Dépend de B1-02*

> En tant que **visiteur**, je veux savoir si une lampe est disponible et, pour le Premium, combien de pièces numérotées il reste, afin de savoir si je peux l'acheter.

**Détails techniques**
- `GET /api/produits/{slug}/disponibilite/`
- Classic : `quantite_dispo - quantite_reservee`
- Premium : pièces restantes par série et liste des numéros disponibles
- Pas de cache long : le stock change vite

**Critères d'acceptation**
- [ ] Classic : quantité vendable correcte
- [ ] Premium : « X pièces restantes sur Y » et numéros disponibles
- [ ] Une pièce réservée n'est pas comptée comme disponible

<a id="b2-02"></a>
#### B2-02 · Réserver un article de façon sûre

*Tâche technique · Taille L · Priorité P0 · Phase 3 · Dépend de B2-01 · ⚠️ Bloqué : décision ouverte*

**Objectif.** Fonction de service `reserver(produit, quantite, panier_id, numero=None)`, utilisée par le panier. C'est la règle la plus critique du projet.

**Détails techniques**
- Tout dans `transaction.atomic()`
- Premium : `Piece.objects.select_for_update().get(...)`, vérifier `Disponible`, passer à `Reservee`, créer la `Reservation` avec expiration à 15 minutes ; sans numéro demandé, prendre le plus petit disponible
- Classic : verrouiller la ligne `Stock_Classic`, vérifier la quantité, incrémenter `quantite_reservee`
- Une `IntegrityError` sur la contrainte de réservation active est convertie en `PieceIndisponible` (409)

**Critères d'acceptation**
- [ ] Test de concurrence : deux réservations simultanées de la même pièce → une seule réussit
- [ ] Stock insuffisant → 409, rien n'est modifié
- [ ] En cas d'erreur, la transaction est entièrement annulée

<a id="b2-03"></a>
#### B2-03 · Libérer une réservation

*Tâche technique · Taille S · Priorité P0 · Phase 3 · Dépend de B2-02 · ⚠️ Bloqué : décision ouverte*

**Objectif.** Fonction `liberer(reservation)` : l'article redevient disponible.

**Détails techniques**
- Dans `transaction.atomic()` : réservation `Annulee`, pièce `Disponible` ou `quantite_reservee` décrémentée
- Idempotente : libérer deux fois ne fait rien la deuxième fois

**Critères d'acceptation**
- [ ] L'article réapparaît dans la disponibilité
- [ ] Une réservation confirmée (vendue) ne peut pas être libérée

<a id="b2-04"></a>
#### B2-04 · Expirer automatiquement les réservations

*Tâche technique · Taille M · Priorité P0 · Phase 3 · Dépend de B2-03, B0-06 · ⚠️ Bloqué : décision ouverte*

**Objectif.** Une réservation non payée à temps rend l'article disponible, sans intervention humaine.

**Détails techniques**
- Commande Django `python manage.py run_worker`, lancée par le container `worker`, qui planifie les tâches avec `APScheduler`
- Toutes les minutes : réservations `Active` dont `expire_le` est dépassé → `Expiree` + libération (B2-03)
- Chaque réservation dans sa propre transaction

**Critères d'acceptation**
- [ ] Une réservation expirée est libérée en moins de 2 minutes
- [ ] Une erreur sur une réservation n'empêche pas de traiter les autres

### B3 · Panier

Panier anonyme stocké dans Redis, qui réserve les articles.

<a id="b3-01"></a>
#### B3-01 · Avoir un panier sans compte

*User story · Taille M · Priorité P0 · Phase 3 · Dépend de B0-04 · ⚠️ Bloqué : décision ouverte*

> En tant que **visiteur**, je veux un panier qui se conserve quelques jours sans créer de compte, afin d'acheter simplement.

**Détails techniques**
- Panier dans Redis : clé `panier:{uuid}`, expiration 3 jours, prolongée à chaque modification
- Identifiant dans un cookie `HttpOnly` posé par le back (front et API sur le même domaine, ex. `noyer.ch` et `api.noyer.ch`)
- `GET /api/panier/` → lignes, sous-total, TVA incluse, total

**Critères d'acceptation**
- [ ] Un nouveau visiteur obtient un panier vide
- [ ] Le panier est retrouvé à la visite suivante tant qu'il n'a pas expiré

<a id="b3-02"></a>
#### B3-02 · Ajouter une lampe au panier

*User story · Taille M · Priorité P0 · Phase 3 · Dépend de B3-01, B2-02 · ⚠️ Bloqué : décision ouverte*

> En tant que **visiteur**, je veux ajouter une lampe à mon panier, avec le numéro de mon choix pour le Premium, afin qu'elle me soit réservée pendant ma commande.

**Détails techniques**
- `POST /api/panier/lignes/` `{produit_slug, quantite, numero?}`
- Appelle `reserver()` (B2-02) et renvoie l'heure d'expiration de la réservation

**Critères d'acceptation**
- [ ] Pièce déjà prise → 409 avec un message clair
- [ ] Premium : quantité limitée à 1 par ligne
- [ ] Le prix vient toujours de la base, jamais du front

<a id="b3-03"></a>
#### B3-03 · Modifier ou retirer un article

*User story · Taille S · Priorité P0 · Phase 3 · Dépend de B3-02, B2-03 · ⚠️ Bloqué : décision ouverte*

> En tant que **visiteur**, je veux changer la quantité d'une lampe Classic ou retirer un article, afin d'ajuster ma commande.

**Détails techniques**
- `PATCH /api/panier/lignes/{id}/` (Classic uniquement) et `DELETE /api/panier/lignes/{id}/` (libère la réservation)

**Critères d'acceptation**
- [ ] Un article retiré redevient immédiatement disponible pour les autres
- [ ] Dépasser le stock → 409, la ligne reste inchangée

<a id="b3-04"></a>
#### B3-04 · Calculer le récapitulatif du panier

*Tâche technique · Taille S · Priorité P1 · Phase 3 · Dépend de B3-01 · ⚠️ Bloqué : décision ouverte*

**Objectif.** Un seul endroit du code calcule les montants.

**Détails techniques**
- Fonction `calculer_totaux(lignes, mode_livraison)` : sous-total, livraison, TVA incluse, total
- Taux de TVA dans la configuration (8.1 %), jamais écrit en dur
- Montants en centimes entiers, jamais de `float`

**Critères d'acceptation**
- [ ] Tests unitaires : Classic seul, Premium seul, mixte, retrait à l'atelier

### B4 · Commande

Passage de commande, suivi et emails.

<a id="b4-01"></a>
#### B4-01 · Passer commande

*User story · Taille L · Priorité P0 · Phase 3 · Dépend de B3-04, B3-02 · ⚠️ Bloqué : décision ouverte*

> En tant que **client**, je veux valider mon panier en donnant mon email et mes adresses, afin de passer au paiement.

**Détails techniques**
- `POST /api/commandes/` `{email, adresse_livraison, adresse_facturation?, mode_livraison, cgv_acceptees}`
- Validation par le serializer : email, NPA suisse à 4 chiffres, CGV acceptées obligatoires
- Dans `transaction.atomic()` : `Commande` (EnAttente, référence type `NOY-2026-00042`, TVA figée), lignes avec nom, gamme et prix **copiés**, `id_piece` pour le Premium, adresses
- Vérifier que les réservations sont encore actives, puis les prolonger le temps du paiement (30 min)

**Critères d'acceptation**
- [ ] Réservation expirée → 410, aucune commande créée
- [ ] Les prix de la commande ne bougent pas si le catalogue change ensuite
- [ ] La référence est unique

<a id="b4-02"></a>
#### B4-02 · Suivre ma commande

*User story · Taille S · Priorité P1 · Phase 4 · Dépend de B4-01 · ⚠️ Bloqué : décision ouverte*

> En tant que **client**, je veux consulter le statut de ma commande sans compte, afin de savoir où elle en est.

**Détails techniques**
- `GET /api/commandes/{reference}/?email=...`
- Référence et email doivent correspondre, sinon 404 (ne jamais révéler qu'une référence existe)

**Critères d'acceptation**
- [ ] Bonne référence + bon email → statut, lignes, montants
- [ ] Mauvais email → même 404 qu'une référence inexistante

<a id="b4-03"></a>
#### B4-03 · Recevoir les emails de commande

*User story · Taille M · Priorité P1 · Phase 3 · Dépend de B4-01 · ⚠️ Bloqué : décision ouverte*

> En tant que **client**, je veux recevoir un email quand ma commande est payée puis expédiée, afin d'être rassuré et informé.

**Détails techniques**
- `send_mail` de Django via le SMTP d'un prestataire (Infomaniak, Brevo…), gabarits HTML Django
- Envoi déclenché après validation de la transaction (`transaction.on_commit`)
- Emails : paiement confirmé (avec numéro de pièce Premium), expédition, virement en attente

**Critères d'acceptation**
- [ ] Un échec d'envoi est journalisé et n'annule pas la commande
- [ ] Les emails s'affichent correctement sur mobile

<a id="b4-04"></a>
#### B4-04 · Annuler les commandes jamais payées

*Tâche technique · Taille S · Priorité P1 · Phase 3 · Dépend de B4-01, B2-04 · ⚠️ Bloqué : décision ouverte*

**Détails techniques**
- Tâche du worker : commandes `EnAttente` dont les réservations ont toutes expiré → `Annulee`
- Les commandes en attente de virement suivent leur propre délai (B5-04)

**Critères d'acceptation**
- [ ] Une commande abandonnée passe à « Annulée » et ses articles redeviennent disponibles

### B5 · Paiement

Stripe Checkout (TWINT + cartes), webhooks, virement Premium.

<a id="b5-01"></a>
#### B5-01 · Payer par TWINT ou carte

*User story · Taille L · Priorité P0 · Phase 3 · Dépend de B4-01 · ⚠️ Bloqué : décision ouverte*

> En tant que **client**, je veux payer par TWINT ou par carte, afin de finaliser mon achat avec mon moyen de paiement habituel.

**Détails techniques**
- SDK `stripe`. `POST /api/commandes/{reference}/paiement/` crée une session **Stripe Checkout** (page de paiement hébergée par Stripe) et renvoie son URL
- Crée une `Transaction_Paiement` (Creee, `ref_prestataire` = id de session)
- Montant toujours recalculé par le back depuis la commande, en CHF
- TWINT est à activer dans le dashboard Stripe ; Stripe vérifie l'entreprise (adresse complète requise) avant de l'autoriser

**Critères d'acceptation**
- [ ] Le client paie sur Stripe puis revient sur le site
- [ ] Aucune donnée de carte ne passe par notre back
- [ ] Une commande déjà payée ne peut pas être repayée (409)

<a id="b5-02"></a>
#### B5-02 · Recevoir les webhooks Stripe

*Tâche technique · Taille L · Priorité P0 · Phase 3 · Dépend de B5-01 · ⚠️ Bloqué : décision ouverte*

**Objectif.** Le webhook est la seule source fiable pour savoir qu'un paiement a abouti.

**Détails techniques**
- `POST /api/webhooks/stripe/`, sans authentification ni CSRF, mais signature vérifiée avec `stripe.Webhook.construct_event`
- Insertion dans `Webhook` : si `id_evenement` existe déjà → 200 et arrêt (doublon)
- Traite `checkout.session.completed`, `checkout.session.async_payment_failed` et `checkout.session.expired`
- Réponse 200 rapide ; `traite = True` une fois appliqué
- Tests en local avec la CLI Stripe (`stripe listen`)

**Critères d'acceptation**
- [ ] Une fausse signature est rejetée
- [ ] Un même événement reçu deux fois n'est appliqué qu'une fois
- [ ] Les événements non traités restent identifiables

<a id="b5-03"></a>
#### B5-03 · Confirmer la vente après paiement

*Tâche technique · Taille M · Priorité P0 · Phase 3 · Dépend de B5-02, B2-02 · ⚠️ Bloqué : décision ouverte*

**Objectif.** Quand le paiement est confirmé, tout passe à « vendu » d'un coup.

**Détails techniques**
- Dans une seule `transaction.atomic()` : transaction `Confirmee`, commande `Payee`, pièces `Vendue`, stock Classic décrémenté, réservations `Confirmee`
- Puis email de confirmation (B4-03)
- Cas limite : paiement reçu après expiration → vendre si la pièce est encore libre, sinon marquer la commande à rembourser et alerter l'atelier

**Critères d'acceptation**
- [ ] Après paiement, la pièce n'est plus disponible
- [ ] Une erreur au milieu annule toute l'opération
- [ ] Le cas limite est couvert par un test

<a id="b5-04"></a>
#### B5-04 · Payer un Premium par virement

*User story · Taille M · Priorité P2 · Phase 4 · Dépend de B5-01 · ⚠️ Bloqué : décision ouverte*

> En tant que **client Premium**, je veux pouvoir payer par virement bancaire, afin de régler un achat important avec mon moyen habituel.

**Détails techniques**
- Option proposée seulement si le panier contient du Premium
- Crée une `Transaction_Paiement` de type `Virement`, renvoie coordonnées bancaires et référence
- Réservation prolongée (5 jours ouvrés) ; validation par l'atelier (B6-06), qui déclenche B5-03

**Critères d'acceptation**
- [ ] Option absente pour un panier 100 % Classic
- [ ] Sans validation dans le délai, la commande est annulée et la pièce libérée

### B6 · Administration

Back-office de l'atelier dans l'admin Django.

<a id="b6-01"></a>
#### B6-01 · Se connecter à l'administration

*User story · Taille S · Priorité P0 · Phase 2 · Dépend de B0-02*

> En tant qu'**administrateur de l'atelier**, je veux me connecter de façon sécurisée, afin d'être le seul à pouvoir gérer la boutique.

**Détails techniques**
- Comptes et connexion de Django (`manage.py createsuperuser` pour le premier compte)
- Hachage Argon2 (`argon2-cffi` + `PASSWORD_HASHERS`)
- `django-axes` : blocage après plusieurs échecs de connexion
- Adresse de l'admin non devinable (pas `/admin/`), cookies `Secure` et `HttpOnly` en production

**Critères d'acceptation**
- [ ] Aucune page d'administration accessible sans connexion
- [ ] Après 5 échecs, la connexion est bloquée temporairement

<a id="b6-02"></a>
#### B6-02 · Gérer le catalogue

*User story · Taille M · Priorité P0 · Phase 2 · Dépend de B6-01, B1-02*

> En tant qu'**administrateur**, je veux créer et modifier modèles, produits, matières et prix, afin de faire vivre le catalogue sans développeur.

**Détails techniques**
- `ModelAdmin` pour Modèle, Produit, Matière ; Gamme en lecture seule
- Matières et photos éditables directement dans la fiche produit (`inlines`)
- Slug pré-rempli depuis le nom (`prepopulated_fields`), non modifiable une fois le produit actif
- Prix saisi en francs, stocké en centimes ; champ « mis en avant » éditable dans la liste

**Critères d'acceptation**
- [ ] Un produit créé apparaît dans l'API dès qu'il est actif
- [ ] Impossible de créer deux produits pour le même modèle et la même gamme

<a id="b6-03"></a>
#### B6-03 · Ajouter des photos produit

*User story · Taille M · Priorité P1 · Phase 2 · Dépend de B6-02*

> En tant qu'**administrateur**, je veux téléverser des photos avec leur texte alternatif, afin d'illustrer chaque lampe.

**Détails techniques**
- `ImageField` + `Pillow` ; à l'enregistrement, génération de versions WebP en plusieurs largeurs (480, 960, 1600 px) pour le `srcset` du front
- Stockage dans le volume `MEDIA_ROOT`, ou un stockage objet avec `django-storages`
- Texte alternatif obligatoire, ordre modifiable

**Critères d'acceptation**
- [ ] Une photo téléversée existe en plusieurs tailles WebP
- [ ] Un fichier qui n'est pas une image est refusé

<a id="b6-04"></a>
#### B6-04 · Créer une série Premium numérotée

*User story · Taille M · Priorité P0 · Phase 2 · Dépend de B6-02*

> En tant qu'**administrateur**, je veux créer une série limitée en indiquant sa taille, afin que les pièces numérotées soient générées automatiquement.

**Détails techniques**
- Action d'administration sur un produit Premium : saisir la taille → création de la `Serie` et des pièces 1 à N dans une transaction

**Critères d'acceptation**
- [ ] Une série de 50 crée exactement les pièces 1 à 50
- [ ] Impossible pour un produit Classic

<a id="b6-05"></a>
#### B6-05 · Gérer le stock Classic

*User story · Taille S · Priorité P1 · Phase 2 · Dépend de B6-02*

> En tant qu'**administrateur**, je veux mettre à jour le nombre de lampes Classic disponibles, afin que le site reflète la production de l'atelier.

**Critères d'acceptation**
- [ ] Quantité disponible modifiable, quantité réservée en lecture seule
- [ ] Impossible de descendre sous la quantité réservée

<a id="b6-06"></a>
#### B6-06 · Suivre et traiter les commandes

*User story · Taille M · Priorité P0 · Phase 3 · Dépend de B6-01, B4-01 · ⚠️ Bloqué : décision ouverte*

> En tant qu'**administrateur**, je veux voir les commandes, valider un virement reçu et marquer une commande comme expédiée, afin de gérer les ventes.

**Détails techniques**
- Liste filtrable par statut ; détail avec lignes, adresses, paiements
- Actions d'administration : « Virement reçu » (déclenche B5-03), « Expédiée » (email au client)
- L'historique des actions est enregistré par le journal intégré de l'admin Django

**Critères d'acceptation**
- [ ] Les transitions impossibles sont refusées (ex. annulée → expédiée)
- [ ] Chaque action est tracée avec l'administrateur qui l'a faite

### B7 · Conformité & sécurité

Contact, newsletter, limitation des abus, nLPD.

<a id="b7-01"></a>
#### B7-01 · Contacter l'atelier

*User story · Taille S · Priorité P1 · Phase 2 · Dépend de B0-03*

> En tant que **visiteur**, je veux écrire à l'atelier via un formulaire, afin de poser une question ou demander une visite du showroom.

**Détails techniques**
- `POST /api/contact/` → email à l'atelier, avec l'email du visiteur en adresse de réponse
- Champ caché anti-robot (honeypot) + limitation de débit (B7-03)
- Rien n'est stocké en base

**Critères d'acceptation**
- [ ] Le message arrive à l'atelier
- [ ] Un envoi avec le champ caché rempli est ignoré silencieusement

<a id="b7-02"></a>
#### B7-02 · S'inscrire à la newsletter

*User story · Taille S · Priorité P2 · Phase 2 · Dépend de B0-03*

> En tant que **visiteur**, je veux m'inscrire à la newsletter, afin d'être prévenu des nouvelles séries.

**Détails techniques**
- `POST /api/newsletter/` → transmis à un service d'emailing (Brevo, Mailchimp…) avec double confirmation

**Critères d'acceptation**
- [ ] L'inscription n'est effective qu'après confirmation par email
- [ ] Sans consentement → erreur de validation

<a id="b7-03"></a>
#### B7-03 · Limiter les abus

*Tâche technique · Taille S · Priorité P1 · Phase 2 · Dépend de B0-04*

**Détails techniques**
- Limitation de débit intégrée à DRF (`ScopedRateThrottle`), compteurs dans Redis
- Limites strictes sur contact, création de commande, ajout au panier
- Réglages de sécurité Django en production (`SECURE_*`, HSTS) ; vérification avec `manage.py check --deploy`

**Critères d'acceptation**
- [ ] Au-delà de la limite → 429 au format standard
- [ ] Les webhooks Stripe ne sont pas limités
- [ ] `check --deploy` ne remonte aucun avertissement

<a id="b7-04"></a>
#### B7-04 · Répondre aux demandes nLPD d'un client

*User story · Taille S · Priorité P2 · Phase 4 · Dépend de B6-06*

> En tant qu'**administrateur**, je veux exporter ou anonymiser les données d'un client à sa demande, afin de respecter la loi sur la protection des données.

**Détails techniques**
- Action d'administration par email : export JSON des commandes et adresses
- Anonymisation : email et adresses effacés, montants et lignes conservés (obligations comptables)

**Critères d'acceptation**
- [ ] Après anonymisation, plus rien ne permet d'identifier le client
- [ ] Les montants et statistiques restent intacts

## Frontend

### E0 · Fondations

Socle technique du frontend : projet Next.js, tokens, typographie, i18n, client API, CI.

<a id="e0-01"></a>
#### E0-01 · Initialiser le projet Next.js

*Ticket frontend · Taille S · Priorité P0 · Phase 1 · Aucune dépendance*

**Contexte**
Socle du frontend qui consomme l'API REST du back Django.

**À faire**
- Next.js (App Router) + TypeScript en mode `strict`
- ESLint, Prettier, Husky + lint-staged
- Arborescence : `app/`, `components/`, `lib/`, `styles/`, `content/`
- Fichier `.env.example` (URL de l'API)

**Critères d'acceptation**
- [ ] `npm run dev`, `build`, `lint` et `typecheck` passent sans erreur
- [ ] Un hook pre-commit bloque un commit qui ne passe pas le lint
- [ ] README de démarrage à jour

<a id="e0-02"></a>
#### E0-02 · Design tokens CSS de la charte

*Ticket frontend · Taille S · Priorité P0 · Phase 1 · Dépend de E0-01*

**Contexte**
Brief §02 et §04. Les tokens sont la source unique des couleurs, rayons et polices.

**À faire**
- Déclarer les tokens du brief dans `styles/tokens.css` (`--bg`, `--bg-alt`, `--text`, `--walnut`, `--brass`, `--dark-*`, `--border`, `--radius: 2px`, `--serif`, `--sans`)
- **Correction contraste** : `--text-muted` en `#604735` plein. À 75 % d'opacité sur l'ivoire, le contraste tombe vers 4.1:1, sous le seuil de 4.5:1 exigé par le brief §07
- Ne pas suivre `prefers-color-scheme` : le registre sombre est un choix de marque, pas un dark mode système

**Critères d'acceptation**
- [ ] Aucune couleur en dur dans les composants (règle lint ou revue)
- [ ] Contraste texte secondaire ≥ 4.5:1 sur `--bg` et `--bg-alt`
- [ ] Le site reste clair même avec un OS en mode sombre

<a id="e0-03"></a>
#### E0-03 · Typographie : Fraunces & Hanken Grotesk

*Ticket frontend · Taille S · Priorité P0 · Phase 1 · Dépend de E0-02*

**Contexte**
Brief §03.

**À faire**
- Charger les polices via `next/font/google` (auto-hébergées, pas de requête externe, meilleur pour la nLPD et la perf) : Fraunces 300-600 + italique 400-500, Hanken Grotesk 400-700
- Échelle typographique : h1 → h4 en Fraunces, corps 16-17px en Hanken Grotesk
- Largeur de lecture max ~70ch sur les blocs de texte

**Critères d'acceptation**
- [ ] Pas de flash de police visible (FOUT maîtrisé, `display: swap`)
- [ ] Aucun titre en majuscules systématiques
- [ ] Lignes de texte courant < 80 caractères sur desktop

<a id="e0-04"></a>
#### E0-04 · Routage i18n (FR par défaut, prêt pour EN/DE)

*Ticket frontend · Taille M · Priorité P1 · Phase 1 · Dépend de E0-01 · ⚠️ Bloqué : décision ouverte*

**Contexte**
Brief §07 Langues : décision encore ouverte, mais l'architecture multilingue doit être prévue dès le départ.

**À faire**
- Segment `[locale]` dans l'App Router, FR par défaut
- Dictionnaires de traduction pour les textes d'interface
- Slugs produits traduisibles, balises `hreflang`
- Sélecteur de langue masqué tant qu'une seule langue est active

**Critères d'acceptation**
- [ ] Ajouter une langue ne demande que des fichiers de traduction, pas de refonte
- [ ] `lang` correct sur `<html>`

> ⚠️ Bloqué partiellement : la liste des langues reste à trancher (brief §08).

<a id="e0-05"></a>
#### E0-05 · Client API typé vers le back + mocks

*Ticket frontend · Taille M · Priorité P0 · Phase 1 · Dépend de E0-01*

**Contexte**
Le frontend passe uniquement par l'API REST du back Django (DRF).

**À faire**
- Types partagés (générés depuis le schéma OpenAPI exposé par le back, B0-03)
- Client `lib/api` avec gestion d'erreurs uniforme, timeouts, retries sur GET
- Mocks MSW des endpoints principaux pour développer sans backend

**Critères d'acceptation**
- [ ] Le front tourne entièrement sur mocks avec `NEXT_PUBLIC_API_MOCKS=true`
- [ ] Une erreur réseau donne un état d'erreur affichable, jamais un crash

<a id="e0-06"></a>
#### E0-06 · CI : lint, tests, Lighthouse + déploiements de preview

*Ticket frontend · Taille M · Priorité P1 · Phase 1 · Dépend de E0-01*

**À faire**
- GitHub Actions : lint, typecheck, tests unitaires, build
- Lighthouse CI avec seuils (perf ≥ 90, a11y ≥ 95, SEO ≥ 95)
- Déploiement de preview par pull request

**Critères d'acceptation**
- [ ] Une PR qui casse le build ou passe sous les seuils est bloquée
- [ ] Le lien de preview apparaît sur chaque PR

### E1 · Design system

Composants réutilisables fidèles à la charte (brief §02-§04). À terminer avant les pages.

<a id="e1-01"></a>
#### E1-01 · Boutons primaire & secondaire (registres clair et sombre)

*Ticket frontend · Taille S · Priorité P0 · Phase 1 · Dépend de E0-02, E0-03*

**Contexte**
Brief §02 (tableau des boutons) et §04 (`--radius: 2px`, pas de boutons arrondis type SaaS).

**Variantes**
- Primaire clair : fond `#29251F`, texte `#F5F1E8`, hover `#3A3028`
- Primaire sombre : fond `#B08D57`, texte `#29251F`, hover `#DED3C2`
- Secondaire (outline) : bordure `#604735` en clair, `#B08D57` en sombre

**Critères d'acceptation**
- [ ] Rendu en `<button>` ou `<a>` selon l'usage
- [ ] États hover, focus-visible, disabled, loading
- [ ] Zone cliquable ≥ 44×44px sur mobile

<a id="e1-02"></a>
#### E1-02 · Composant Section (clair / alterné / sombre)

*Ticket frontend · Taille S · Priorité P0 · Phase 1 · Dépend de E0-02*

**Contexte**
Brief §02 : le registre sombre est réservé à 1-2 moments forts (atelier, carte Premium, footer éventuellement).

**À faire**
- `<Section tone="light" | "alt" | "dark">` qui bascule les tokens de couleur pour tous ses enfants
- Espacements verticaux responsive standardisés

**Critères d'acceptation**
- [ ] Un bouton ou un texte placé dans une section sombre prend automatiquement les bonnes couleurs
- [ ] Aucun aplat laiton possible via ce composant

<a id="e1-03"></a>
#### E1-03 · Composant image responsive (AVIF/WebP, srcset, lazy)

*Ticket frontend · Taille M · Priorité P0 · Phase 1 · Dépend de E0-01*

**Contexte**
Brief §06 et §07 Performance : le poids des photos est le premier facteur de lenteur ; le grain du bois ne doit pas être dégradé.

**À faire**
- Wrapper autour de `next/image` : AVIF puis WebP, `sizes` adaptés aux breakpoints (600 / 900px)
- Lazy loading par défaut, `priority` uniquement pour le hero
- Prop `alt` **obligatoire** au niveau du typage (alt vide seulement si image décorative explicite)
- Placeholder couleur ivoire (pas de flou gris)

**Critères d'acceptation**
- [ ] Aucune image sans `alt` ne compile
- [ ] Pas de décalage de mise en page (CLS ≈ 0)

<a id="e1-04"></a>
#### E1-04 · ProductCard Classic / Premium

*Ticket frontend · Taille M · Priorité P0 · Phase 1 · Dépend de E1-01, E1-02, E1-03*

**Contexte**
Brief §01, §02, §05.4 : même silhouette, le Premium se lit comme une montée en gamme, jamais comme une gamme à part.

**Critères d'acceptation**
- [ ] Variante Classic : fond clair, accent noyer `#604735`
- [ ] Variante Premium : registre sombre, filet laiton 1px, mot « Premium » en laiton (2-3 occurrences de laiton max par écran)
- [ ] Contenu : image, nom, gamme, prix, lien vers la fiche
- [ ] Toute la carte est cliquable avec un seul lien accessible (pas de liens imbriqués)
- [ ] Focus visible sur la carte entière
- [ ] Côte à côte > 900px, empilées < 600px

<a id="e1-05"></a>
#### E1-05 · Focus, skip link et utilitaires d'accessibilité

*Ticket frontend · Taille S · Priorité P0 · Phase 1 · Dépend de E0-02*

**Contexte**
Brief §07 : pas de `outline: none` sans remplacement.

**À faire**
- Style `:focus-visible` global cohérent avec la charte (lisible sur clair et sur sombre)
- Lien « Aller au contenu » en début de page
- Utilitaire `visually-hidden`
- Respect de `prefers-reduced-motion`

**Critères d'acceptation**
- [ ] Toute la homepage est navigable au clavier avec un focus toujours visible

<a id="e1-06"></a>
#### E1-06 · Champs de formulaire

*Ticket frontend · Taille M · Priorité P1 · Phase 1 · Dépend de E0-02, E0-03*

**À faire**
- Input, textarea, select, checkbox, radio
- Label toujours visible, message d'aide, message d'erreur relié via `aria-describedby`
- États : focus, erreur, disabled

**Critères d'acceptation**
- [ ] Erreurs annoncées par les lecteurs d'écran
- [ ] Utilisable pour newsletter, contact et checkout sans variante spécifique

<a id="e1-07"></a>
#### E1-07 · Affichage prix & badges

*Ticket frontend · Taille S · Priorité P1 · Phase 1 · Dépend de E0-02*

**À faire**
- Formatage CHF selon la locale (`Intl.NumberFormat`, ex. `CHF 1'240.–` en fr-CH)
- Mention « TVA incluse » (taux actuel 8.1 %, à recevoir de l'API, jamais codé en dur)
- Badge « Pièce n° X / Y » pour le Premium, badge « Épuisé »

**Critères d'acceptation**
- [ ] Le taux de TVA vient de l'API
- [ ] Rendu correct en fr, en et de

### E2 · Layout

Header, navigation, burger mobile, footer.

<a id="e2-01"></a>
#### E2-01 · Header & navigation desktop

*Ticket frontend · Taille S · Priorité P0 · Phase 1 · Dépend de E1-01, E0-03*

**Contexte**
Brief §05.1 : logo + 3 liens + CTA. Logo actuel : nom en Fraunces (placeholder « Noyer »).

**Critères d'acceptation**
- [ ] Logo en composant isolé, facile à remplacer quand le nom/logo final sera décidé
- [ ] Lien actif indiqué visuellement et via `aria-current`
- [ ] Header sticky sobre, sans ombre lourde

<a id="e2-02"></a>
#### E2-02 · Menu burger mobile (< 800px)

*Ticket frontend · Taille M · Priorité P0 · Phase 1 · Dépend de E2-01*

**Contexte**
Brief §07 Responsive : burger sous 800px.

**Critères d'acceptation**
- [ ] Bouton avec `aria-expanded` et `aria-controls`
- [ ] Focus piégé dans le menu ouvert, fermeture via Échap, focus rendu au bouton
- [ ] Scroll de la page bloqué pendant l'ouverture
- [ ] Animation désactivée si `prefers-reduced-motion`

<a id="e2-03"></a>
#### E2-03 · Footer : Genève, contact, newsletter, légal

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E1-02, E1-06*

**Contexte**
Brief §05.7. Le footer peut être en registre sombre.

**Critères d'acceptation**
- [ ] Adresse Genève, contact, liens Impressum / CGV / confidentialité
- [ ] Inscription newsletter avec consentement explicite (nLPD) et états succès/erreur
- [ ] Contrastes conformes en registre sombre

<a id="e2-04"></a>
#### E2-04 · Indicateur panier dans le header

*Ticket frontend · Taille S · Priorité P1 · Phase 3 · Dépend de E2-01 · ⚠️ Bloqué : décision ouverte*

**À faire**
- Icône panier avec nombre d'articles, mise à jour en direct
- Libellé accessible (« Panier, 2 articles »)

> ⚠️ Dépend de la décision vente en ligne directe (brief §08). Masqué si site vitrine.

### E3 · Homepage

Les 5 sections de la homepage (brief §05).

<a id="e3-01"></a>
#### E3-01 · Homepage : Hero

*Ticket frontend · Taille M · Priorité P0 · Phase 2 · Dépend de E1-01, E1-03, E2-01*

**Contexte**
Brief §05.2 et §06 : lumière naturelle, produit en contexte, jamais sur fond blanc.

**Critères d'acceptation**
- [ ] Accroche en Fraunces (italique ponctuel autorisé), CTA primaire
- [ ] Image hero chargée en `priority`, LCP < 2.5s en 4G simulée
- [ ] Contenu (texte, image) éditable depuis le back-office (voir point ouvert n° 3)

<a id="e3-02"></a>
#### E3-02 · Homepage : La matière (4 gros plans)

*Ticket frontend · Taille S · Priorité P1 · Phase 2 · Dépend de E1-03, E1-02*

**Contexte**
Brief §05.3 : 4 gros plans texture bois / laiton.

**Critères d'acceptation**
- [ ] Grille 4 colonnes desktop, 2 tablette, 1 ou défilement horizontal mobile
- [ ] Alt text descriptif de la matière (ex. « Grain de noyer huilé, gros plan »)
- [ ] Images en lazy loading

<a id="e3-03"></a>
#### E3-03 · Homepage : Deux gammes

*Ticket frontend · Taille S · Priorité P0 · Phase 2 · Dépend de E1-04*

**Contexte**
Brief §05.4 : cartes Classic / Premium côte à côte.

**Critères d'acceptation**
- [ ] Utilise exclusivement `ProductCard` (pas de variante locale)
- [ ] Le message « mêmes formes, matières différentes » est clair
- [ ] Empilement mobile vérifié

<a id="e3-04"></a>
#### E3-04 · Homepage : L'atelier (registre sombre)

*Ticket frontend · Taille S · Priorité P1 · Phase 2 · Dépend de E1-02, E1-03*

**Contexte**
Brief §05.5 et §06 : storytelling fabrication, photos documentaires (gestes, outils, mains).

**Critères d'acceptation**
- [ ] Section en `tone="dark"`
- [ ] Lien vers la page L'atelier
- [ ] Laiton limité aux accents (filet, soulignement au survol)

<a id="e3-05"></a>
#### E3-05 · Homepage : Sélection produits

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E1-04, E0-05*

**Contexte**
Brief §05.6. Données issues de l'API catalogue (B1-04).

**Critères d'acceptation**
- [ ] Rendu serveur avec revalidation (ISR) pour le SEO
- [ ] États chargement / vide / erreur gérés
- [ ] Sélection pilotée par le champ « mis en avant » (B0-07)

### E4 · Catalogue & fiches produit

Listing, fiches Classic et Premium, SEO et données structurées.

<a id="e4-01"></a>
#### E4-01 · Page listing produits avec filtre par gamme

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E1-04, E0-05*

**Critères d'acceptation**
- [ ] Filtre Classic / Premium reflété dans l'URL (partageable, bouton retour fonctionnel)
- [ ] Rendu serveur, pagination si > 24 produits
- [ ] Annonce du nombre de résultats pour les lecteurs d'écran

<a id="e4-02"></a>
#### E4-02 · Template fiche produit

*Ticket frontend · Taille L · Priorité P0 · Phase 2 · Dépend de E1-03, E1-07, E0-05*

**Contexte**
Brief §05 : dimensions, matières, entretien, prix.

**À faire**
- Galerie (plein écran, swipe mobile, navigation clavier)
- Bloc infos : dimensions, matières, entretien, prix, disponibilité
- Bascule vers la même forme dans l'autre gamme (Classic ↔ Premium)
- CTA ajout au panier ou « Nous contacter » selon la décision e-commerce

**Critères d'acceptation**
- [ ] URL `/produits/[slug]` (ex. `/produits/lucerne-classic`)
- [ ] Galerie accessible et alt text par photo
- [ ] Produit inexistant → 404

<a id="e4-03"></a>
#### E4-03 · Spécificités fiche Premium : processus et numérotation

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E4-02*

**Contexte**
Brief §05 : insister sur le processus de fabrication et la numérotation.

**À faire**
- Section processus de fabrication en registre sombre
- Affichage des numéros disponibles de la série (API B2-01)
- Choix d'un numéro si le métier le prévoit, sinon attribution automatique

**Critères d'acceptation**
- [ ] Disponibilité rafraîchie côté client (stock limité, pas de cache long)
- [ ] Série épuisée → état clair et proposition d'être prévenu

<a id="e4-04"></a>
#### E4-04 · SEO : metadata, sitemap, robots

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E4-02*

**Contexte**
Brief §07 SEO.

**Critères d'acceptation**
- [ ] `title` et `meta description` uniques par page produit (via `generateMetadata`)
- [ ] Open Graph avec image produit
- [ ] `sitemap.xml` et `robots.txt` générés, avec `hreflang` si multilingue
- [ ] URLs canoniques

<a id="e4-05"></a>
#### E4-05 · Données structurées schema.org Product

*Ticket frontend · Taille S · Priorité P2 · Phase 2 · Dépend de E4-02*

**Critères d'acceptation**
- [ ] JSON-LD `Product` avec nom, images, marque, `offers` (prix CHF, disponibilité)
- [ ] Valide dans le test des résultats enrichis de Google

### E5 · Panier & checkout

Panier, réservation des pièces numérotées, paiement TWINT/carte/virement. Bloqué tant que la vente en ligne directe n'est pas confirmée.

<a id="e5-01"></a>
#### E5-01 · Panier : état, persistance, page panier

*Ticket frontend · Taille M · Priorité P0 · Phase 3 · Dépend de E1-07, E0-05 · ⚠️ Bloqué : décision ouverte*

**Critères d'acceptation**
- [ ] Panier persistant côté back (Redis, B3-01), pas seulement en local
- [ ] Modifier la quantité (Classic) / retirer un article
- [ ] Récapitulatif HT, TVA, livraison, total
- [ ] Panier vide → état dédié

> ⚠️ Bloqué : vente en ligne directe à confirmer (brief §08).

<a id="e5-02"></a>
#### E5-02 · Réservation temporaire d'une pièce numérotée

*Ticket frontend · Taille M · Priorité P0 · Phase 3 · Dépend de E5-01, E4-03 · ⚠️ Bloqué : décision ouverte*

**Contexte**
Les pièces Premium sont uniques : deux clients ne doivent pas payer le même numéro. Le back gère un verrou temporaire (B2-02).

**Critères d'acceptation**
- [ ] Ajout au panier d'un Premium → réservation, avec durée restante affichée
- [ ] Expiration → message clair et retrait de l'article
- [ ] Conflit (numéro pris entre-temps) → proposition d'un autre numéro

<a id="e5-03"></a>
#### E5-03 · Checkout : coordonnées & livraison

*Ticket frontend · Taille M · Priorité P0 · Phase 3 · Dépend de E5-01, E1-06 · ⚠️ Bloqué : décision ouverte*

**Critères d'acceptation**
- [ ] Formulaire adresse au format suisse (NPA, localité), autocomplétion navigateur
- [ ] Choix livraison / retrait à l'atelier, frais affichés avant paiement
- [ ] Acceptation des CGV avec lien (droit de rétractation)
- [ ] Validation en ligne, erreurs accessibles

<a id="e5-04"></a>
#### E5-04 · Paiement TWINT et carte bancaire

*Ticket frontend · Taille L · Priorité P0 · Phase 3 · Dépend de E5-03 · ⚠️ Bloqué : décision ouverte*

**Contexte**
Brief §07 E-commerce : TWINT est indispensable en Suisse. Le back crée une session Stripe Checkout (B5-01) ; le front redirige le client vers la page de paiement Stripe.

**Critères d'acceptation**
- [ ] Redirection vers Stripe Checkout ; TWINT (QR code sur ordinateur, app sur mobile) est géré par Stripe
- [ ] Carte via le formulaire hébergé du prestataire (aucune donnée de carte ne transite par notre front)
- [ ] Gestion annulation / échec / timeout, avec reprise possible
- [ ] Aucune double commande en cas de double clic ou de retour arrière

<a id="e5-05"></a>
#### E5-05 · Virement bancaire pour le Premium

*Ticket frontend · Taille S · Priorité P2 · Phase 3 · Dépend de E5-04 · ⚠️ Bloqué : décision ouverte*

**Critères d'acceptation**
- [ ] Option visible uniquement si le panier contient du Premium
- [ ] Page de confirmation avec coordonnées bancaires et référence de commande
- [ ] Délai de réservation de la pièce prolongé et affiché

<a id="e5-06"></a>
#### E5-06 · Pages confirmation, échec et suivi de commande

*Ticket frontend · Taille S · Priorité P1 · Phase 3 · Dépend de E5-04 · ⚠️ Bloqué : décision ouverte*

**Critères d'acceptation**
- [ ] Confirmation : récapitulatif, numéro de pièce Premium, prochaine étape
- [ ] Échec : explication et retour au paiement sans perte du panier
- [ ] Page non indexée (`noindex`)

### E6 · Pages de contenu

Contenus éditoriaux, atelier, contact/showroom, pages légales.

<a id="e6-01"></a>
#### E6-01 · Récupérer les contenus éditoriaux

*Ticket frontend · Taille M · Priorité P0 · Phase 2 · Dépend de E0-05*

**Contexte**
Brief §07 CMS : l'atelier doit pouvoir modifier ses contenus sans développeur. La source (CMS headless ou admin Django) reste à trancher, voir point ouvert n° 3.

**Critères d'acceptation**
- [ ] Récupération des contenus avec revalidation à la publication (webhook)
- [ ] Mode aperçu pour voir un brouillon avant publication
- [ ] Rendu du texte riche mappé sur nos composants typographiques

<a id="e6-02"></a>
#### E6-02 · Page L'atelier / Notre histoire

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E6-01, E1-02, E1-03*

**Critères d'acceptation**
- [ ] Mise en page éditoriale alternant texte et photos documentaires
- [ ] Au moins une section en registre sombre
- [ ] Contenu entièrement géré dans le back-office

<a id="e6-03"></a>
#### E6-03 · Page contact / showroom

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E1-06, E0-05*

**Critères d'acceptation**
- [ ] Formulaire avec protection anti-spam sans CAPTCHA visuel (honeypot ou équivalent)
- [ ] Consentement au traitement des données (nLPD)
- [ ] Adresse et horaires du showroom si applicable ; carte chargée seulement après consentement

<a id="e6-04"></a>
#### E6-04 · Pages légales : Impressum, CGV, confidentialité

*Ticket frontend · Taille S · Priorité P0 · Phase 2 · Dépend de E6-01*

**Contexte**
Brief §07 Suisse : Impressum obligatoire (raison sociale, adresse, IDE), CGV si vente en ligne, politique de confidentialité nLPD.

**Critères d'acceptation**
- [ ] Trois pages gérées dans le back-office, liées depuis le footer
- [ ] Date de dernière mise à jour affichée

### E7 · Conformité & qualité

Cookies nLPD, accessibilité, performance, pages d'erreur.

<a id="e7-01"></a>
#### E7-01 · Bannière de consentement cookies (nLPD)

*Ticket frontend · Taille M · Priorité P0 · Phase 2 · Dépend de E1-01*

**Contexte**
Brief §07 : bannière si trackers présents.

**Critères d'acceptation**
- [ ] Aucun tracker chargé avant consentement
- [ ] Choix « Refuser » aussi accessible que « Accepter »
- [ ] Préférences modifiables depuis le footer
- [ ] Bannière accessible au clavier et sobre visuellement (charte respectée)

<a id="e7-02"></a>
#### E7-02 · Audit accessibilité

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E3-05, E4-02*

**À faire**
- Tests automatisés axe sur les pages clés (en CI)
- Parcours clavier complet : accueil → fiche → panier → paiement
- Test lecteur d'écran (VoiceOver, NVDA) sur la fiche produit
- Vérification des contrastes en registre sombre

**Critères d'acceptation**
- [ ] Zéro violation axe critique ou sérieuse
- [ ] Rapport des écarts restants avec tickets associés

<a id="e7-03"></a>
#### E7-03 · Budget performance & optimisation des images

*Ticket frontend · Taille M · Priorité P1 · Phase 2 · Dépend de E1-03, E3-01*

**Critères d'acceptation**
- [ ] LCP < 2.5s, CLS < 0.1, INP < 200ms sur mobile (homepage et fiche produit)
- [ ] Poids de la homepage < 1.5 Mo au premier chargement
- [ ] Comparaison visuelle du grain du bois avant/après compression validée

<a id="e7-04"></a>
#### E7-04 · Pages 404 et erreur

*Ticket frontend · Taille S · Priorité P2 · Phase 2 · Dépend de E1-01, E1-02*

**Critères d'acceptation**
- [ ] 404 dans le ton de la marque, avec liens vers les gammes
- [ ] Page d'erreur générique sans détail technique exposé

## Correspondance frontend ↔ backend

Quels tickets backend fournissent les données de chaque écran.

| Frontend | Écran ou fonction | Backend |
|---|---|---|
| E3-05 | Sélection produits de la homepage | B1-04 |
| E4-01 | Listing produits | B1-01 |
| E4-02 | Fiche produit | B1-02, B2-01 |
| E4-03 | Fiche Premium et numérotation | B2-01 |
| E2-04 | Indicateur panier | B3-01 |
| E5-01 | Page panier | B3-01, B3-03, B3-04 |
| E5-02 | Réservation d'une pièce numérotée | B2-02, B3-02 |
| E5-03 | Coordonnées et livraison | B4-01 |
| E5-04 | Paiement TWINT et carte | B5-01, B5-02, B5-03 |
| E5-05 | Virement Premium | B5-04 |
| E5-06 | Confirmation et suivi de commande | B4-02 |
| E2-03 | Newsletter du footer | B7-02 |
| E6-03 | Formulaire de contact | B7-01 |
| E0-05 | Client API typé | B0-03 |

Les tickets B6 (administration) n'ont pas d'équivalent frontend : l'atelier travaille dans l'admin Django.

## Points ouverts

1. **Vente en ligne directe ou site vitrine.** Bloque toute la phase 3, soit les tickets marqués ⚠️. Sans vente en ligne, la phase 2 suffit pour lancer le site.
2. **Langues du site.** FR seul ou FR/EN/DE. E0-04 prépare le routage côté front ; côté back, un site multilingue demanderait de traduire noms et descriptions des produits, ce qui n'est pas encore planifié.
3. **Source des contenus éditoriaux.** Le brief prévoit un CMS headless pour les textes de l'atelier, de la homepage et des pages légales. Avec Django, l'admin peut aussi les gérer (un modèle « Page »), ce qui évite un outil de plus. À trancher : la seconde option ajouterait un ticket backend et simplifierait E6-01.
4. **Rééditions des séries Premium.** Si une série n'est jamais rééditée, la table `Serie` peut être simplifiée.
5. **Nom de marque et logo définitifs.** « Noyer » reste un nom provisoire ; le logo est isolé dans un composant (E2-01) pour être remplacé facilement.