from django.core.cache import cache
from django.test import TestCase, override_settings

from config.factories import creer_catalogue

from .test_passer_commande import CORPS, LOCMEM


@override_settings(CACHES=LOCMEM, TVA_TAUX_CENTIEMES=810, FRAIS_LIVRAISON_CENTIMES=1500)
class SuiviCommandeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cat = creer_catalogue()
        self.client.post(
            "/api/panier/lignes/",
            {"produit_slug": self.cat["premium"].slug, "quantite": 1, "numero": 2},
            content_type="application/json",
        )
        self.client.post(
            "/api/panier/lignes/",
            {"produit_slug": self.cat["classic"].slug, "quantite": 2},
            content_type="application/json",
        )
        r = self.client.post("/api/commandes/", CORPS, content_type="application/json")
        self.assertEqual(r.status_code, 201, r.content)
        self.reference = r.json()["reference"]
        self.total = r.json()["total_centimes"]

    def test_bonne_reference_et_bon_email(self):
        r = self.client.get(f"/api/commandes/{self.reference}/", {"email": CORPS["email"]})
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()
        self.assertEqual(data["reference"], self.reference)
        self.assertEqual(data["statut"], "EnAttente")
        self.assertEqual(data["total_centimes"], self.total)
        self.assertIn("cree_le", data)
        lignes = {ligne["nom_produit"]: ligne for ligne in data["lignes"]}
        self.assertEqual(lignes["Lampe test Premium"]["numero_piece"], 2)
        self.assertEqual(lignes["Lampe test Premium"]["gamme"], "Premium")
        self.assertEqual(lignes["Lampe test Classic"]["quantite"], 2)
        self.assertIsNone(lignes["Lampe test Classic"]["numero_piece"])
        self.assertIsInstance(lignes["Lampe test Classic"]["prix_unitaire_centimes"], int)

    def test_email_insensible_a_la_casse(self):
        r = self.client.get(f"/api/commandes/{self.reference}/", {"email": "Client@Exemple.CH"})
        self.assertEqual(r.status_code, 200)

    def test_mauvais_email_meme_404_que_reference_inexistante(self):
        mauvais = self.client.get(
            f"/api/commandes/{self.reference}/", {"email": "autre@exemple.ch"}
        )
        inconnue = self.client.get("/api/commandes/NOY-2000-99999/", {"email": CORPS["email"]})
        self.assertEqual(mauvais.status_code, 404)
        self.assertEqual(inconnue.status_code, 404)
        self.assertEqual(mauvais.json(), inconnue.json())

    def test_email_absent_ou_vide_404(self):
        self.assertEqual(self.client.get(f"/api/commandes/{self.reference}/").status_code, 404)
        r = self.client.get(f"/api/commandes/{self.reference}/", {"email": ""})
        self.assertEqual(r.status_code, 404)
