# Back Noyer (Django)

## Structure
- config/ : réglages et routes principales. Toutes les routes de l'API commencent par /api/.
- Une app par domaine : catalogue, inventaire, panier (Redis, pas de modèle), commande, paiement.
- Modèles : garder les noms du schéma avec db_table et db_column (ex. db_table = "Produit", db_column = "id_modele").

## Règles
- Le contrat est docs/api.md : réponses JSON en snake_case, montants en centimes entiers,
  erreurs au format {"erreur": {"code": "...", "message": "..."}}.
- Toute opération qui touche au stock, aux réservations, aux commandes ou aux paiements se fait dans
  transaction.atomic(), avec select_for_update() sur les lignes concernées.
- Ne jamais faire confiance à un prix envoyé par le front : toujours le recalculer depuis la base.
- Nouvelle colonne ou table → python manage.py makemigrations, et commiter la migration.
- Réglages lus avec django-environ depuis les variables d'environnement (DATABASE_URL, DJANGO_SECRET_KEY…).

## Vérifications (depuis api/)
- pip install -r requirements.txt
- ruff check .
- python manage.py makemigrations --check --dry-run
- python manage.py test
Une nouvelle librairie va dans requirements.txt avec sa version exacte.
