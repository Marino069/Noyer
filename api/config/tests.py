from django.db import connection
from django.test import TestCase

TABLES = {
    "Modele", "Gamme", "Produit", "Matiere", "Produit_Matiere", "Media",
    "Stock_Classic", "Serie", "Piece", "Reservation",
    "Commande", "Ligne_Commande", "Adresse",
    "Transaction_Paiement", "Webhook",
}  # fmt: skip


class SchemaTests(TestCase):
    def test_toutes_les_tables_metier_existent(self):
        with connection.cursor() as cursor:
            presentes = set(connection.introspection.table_names(cursor))
        self.assertLessEqual(TABLES, presentes)

    def _contraintes(self, table):
        with connection.cursor() as cursor:
            return connection.introspection.get_constraints(cursor, table)

    def _colonnes_uniques(self, table):
        return {
            tuple(c["columns"]) for c in self._contraintes(table).values() if c["unique"]
        }

    def test_contraintes_d_unicite(self):
        self.assertIn(("id_modele", "id_gamme"), self._colonnes_uniques("Produit"))
        self.assertIn(("id_serie", "numero"), self._colonnes_uniques("Piece"))
        self.assertIn(("id_commande", "type"), self._colonnes_uniques("Adresse"))
        self.assertIn(("id_piece_active",), self._colonnes_uniques("Reservation"))

    def test_cles_etrangeres(self):
        attendues = {
            "Produit": {"id_modele": "Modele", "id_gamme": "Gamme"},
            "Piece": {"id_serie": "Serie"},
            "Reservation": {"id_piece": "Piece", "id_produit": "Produit"},
            "Ligne_Commande": {"id_commande": "Commande", "id_produit": "Produit",
                               "id_piece": "Piece"},
            "Adresse": {"id_commande": "Commande"},
            "Transaction_Paiement": {"id_commande": "Commande"},
            "Webhook": {"id_transaction": "Transaction_Paiement"},
        }  # fmt: skip
        for table, fks in attendues.items():
            trouvees = {
                c["columns"][0]: c["foreign_key"][0]
                for c in self._contraintes(table).values()
                if c["foreign_key"]
            }
            for colonne, cible in fks.items():
                self.assertEqual(trouvees.get(colonne), cible, f"{table}.{colonne}")
