from django.db import connection
from django.test import TestCase

TABLES = {
    "Modele", "Gamme", "Produit", "Matiere", "Produit_Matiere", "Media",
    "Stock_Classic", "Serie", "Piece", "Reservation",
    "Commande", "Ligne_Commande", "Adresse",
    "Transaction_Paiement", "Webhook",
}

# (table, colonnes) des contraintes d'unicité attendues en base
UNICITES = [
    ("Produit", ["id_modele", "id_gamme"]),
    ("Piece", ["id_serie", "numero"]),
    ("Adresse", ["id_commande", "type"]),
    ("Produit_Matiere", ["id_produit", "id_matiere"]),
    ("Reservation", ["id_piece_active"]),
]

# (table, colonne, table référencée)
CLES_ETRANGERES = [
    ("Produit", "id_modele", "Modele"),
    ("Produit", "id_gamme", "Gamme"),
    ("Produit_Matiere", "id_produit", "Produit"),
    ("Produit_Matiere", "id_matiere", "Matiere"),
    ("Media", "id_produit", "Produit"),
    ("Stock_Classic", "id_produit", "Produit"),
    ("Serie", "id_produit", "Produit"),
    ("Piece", "id_serie", "Serie"),
    ("Reservation", "id_produit", "Produit"),
    ("Reservation", "id_piece", "Piece"),
    ("Ligne_Commande", "id_commande", "Commande"),
    ("Ligne_Commande", "id_produit", "Produit"),
    ("Ligne_Commande", "id_piece", "Piece"),
    ("Adresse", "id_commande", "Commande"),
    ("Transaction_Paiement", "id_commande", "Commande"),
    ("Webhook", "id_transaction", "Transaction_Paiement"),
]


class SchemaTests(TestCase):
    def test_toutes_les_tables_metier_existent(self):
        existantes = set(connection.introspection.table_names())
        self.assertLessEqual(TABLES, existantes)

    def test_contraintes_d_unicite_presentes(self):
        with connection.cursor() as cursor:
            for table, colonnes in UNICITES:
                contraintes = connection.introspection.get_constraints(cursor, table)
                trouvees = [
                    c["columns"] for c in contraintes.values() if c["unique"]
                ]
                self.assertIn(colonnes, trouvees, f"unicité manquante sur {table}{colonnes}")

    def test_cles_etrangeres_presentes(self):
        with connection.cursor() as cursor:
            for table, colonne, cible in CLES_ETRANGERES:
                contraintes = connection.introspection.get_constraints(cursor, table)
                trouvees = [
                    (c["columns"], c["foreign_key"][0])
                    for c in contraintes.values()
                    if c["foreign_key"]
                ]
                self.assertIn(([colonne], cible), trouvees, f"FK manquante {table}.{colonne}")
