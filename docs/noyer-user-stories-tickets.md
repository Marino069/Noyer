# Noyer · User stories et tickets

37 tickets backend et 41 tickets frontend.

## Backend (37)

### B0 · Socle technique

- **B0-01** · Initialiser le projet Django + DRF
- **B0-02** · Modèles Django et migrations du schéma
- **B0-03** · Format d'erreur, documentation API et CORS
- **B0-04** · Connexion Redis
- **B0-05** · Tests automatisés et CI
- **B0-06** · Docker Compose complet
- **B0-07** · Ajouter le champ « mis en avant » au produit

### B1 · Catalogue

- **B1-01** · *Visiteur* : voir la liste des lampes, filtrable par gamme
- **B1-02** · *Visiteur* : consulter la fiche d'une lampe
- **B1-03** · *Visiteur* : comparer les versions Classic et Premium d'un modèle
- **B1-04** · *Visiteur* : voir les lampes mises en avant sur la homepage

### B2 · Inventaire

- **B2-01** · *Visiteur* : savoir si une lampe est disponible et combien de pièces Premium il reste
- **B2-02** · Réserver un article de façon sûre ⚠️
- **B2-03** · Libérer une réservation ⚠️
- **B2-04** · Expirer automatiquement les réservations ⚠️

### B3 · Panier ⚠️

- **B3-01** · *Visiteur* : avoir un panier sans créer de compte
- **B3-02** · *Visiteur* : ajouter une lampe au panier, avec choix du numéro en Premium
- **B3-03** · *Visiteur* : modifier ou retirer un article
- **B3-04** · Calculer le récapitulatif du panier

### B4 · Commande ⚠️

- **B4-01** · *Client* : passer commande
- **B4-02** · *Client* : suivre ma commande
- **B4-03** · *Client* : recevoir les emails de commande
- **B4-04** · Annuler les commandes jamais payées

### B5 · Paiement ⚠️

- **B5-01** · *Client* : payer par TWINT ou carte
- **B5-02** · Recevoir les webhooks Stripe
- **B5-03** · Confirmer la vente après paiement
- **B5-04** · *Client Premium* : payer par virement

### B6 · Administration

- **B6-01** · *Admin* : se connecter de façon sécurisée
- **B6-02** · *Admin* : gérer le catalogue
- **B6-03** · *Admin* : ajouter des photos produit
- **B6-04** · *Admin* : créer une série Premium numérotée
- **B6-05** · *Admin* : gérer le stock Classic
- **B6-06** · *Admin* : suivre et traiter les commandes ⚠️

### B7 · Conformité & sécurité

- **B7-01** · *Visiteur* : contacter l'atelier
- **B7-02** · *Visiteur* : s'inscrire à la newsletter
- **B7-03** · Limiter les abus
- **B7-04** · *Admin* : exporter ou anonymiser les données d'un client

## Frontend (41)

### E0 · Fondations

- **E0-01** · Initialiser le projet Next.js
- **E0-02** · Design tokens CSS de la charte
- **E0-03** · Typographie Fraunces et Hanken Grotesk
- **E0-04** · Routage multilingue ⚠️
- **E0-05** · Client API typé + mocks
- **E0-06** · CI et déploiements de preview

### E1 · Design system

- **E1-01** · Boutons
- **E1-02** · Sections claires, alternées et sombres
- **E1-03** · Images responsive
- **E1-04** · Carte produit Classic / Premium
- **E1-05** · Focus clavier et accessibilité
- **E1-06** · Champs de formulaire
- **E1-07** · Prix et badges

### E2 · Layout

- **E2-01** · Header et navigation
- **E2-02** · Menu burger mobile
- **E2-03** · Footer avec newsletter
- **E2-04** · Indicateur panier ⚠️

### E3 · Homepage

- **E3-01** · Hero
- **E3-02** · La matière
- **E3-03** · Deux gammes
- **E3-04** · L'atelier
- **E3-05** · Sélection produits

### E4 · Catalogue

- **E4-01** · Page listing produits
- **E4-02** · Fiche produit
- **E4-03** · Spécificités de la fiche Premium
- **E4-04** · SEO : metadata, sitemap, robots
- **E4-05** · Données structurées schema.org

### E5 · Panier & checkout ⚠️

- **E5-01** · Page panier
- **E5-02** · Réservation d'une pièce numérotée
- **E5-03** · Coordonnées et livraison
- **E5-04** · Paiement TWINT et carte
- **E5-05** · Virement Premium
- **E5-06** · Confirmation et suivi de commande

### E6 · Pages de contenu

- **E6-01** · Récupérer les contenus éditoriaux
- **E6-02** · Page L'atelier
- **E6-03** · Page contact / showroom
- **E6-04** · Pages légales

### E7 · Conformité & qualité

- **E7-01** · Bannière cookies
- **E7-02** · Audit accessibilité
- **E7-03** · Performance
- **E7-04** · Pages 404 et erreur
