from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase

from catalogue.models import Gamme, Modele, Produit
from config.exceptions import DonneesInvalides, StockInsuffisant
from inventaire.admin import StockClassicAdmin
from inventaire.models import StockClassic
from inventaire.services import definir_stock_classic


class StockAdminTests(TestCase):
    def setUp(self):
        self.base = "/" + settings.ADMIN_URL + "inventaire/stockclassic/"
        utilisateur = get_user_model().objects.create_superuser(
            "atelier", "a@noyer.ch", "mdp-solide-42"
        )
        self.client.force_login(
            utilisateur, backend="django.contrib.auth.backends.ModelBackend"
        )
        modele = Modele.objects.create(slug="lampe-a", nom="Lampe A")
        gamme = Gamme.objects.create(code="Classic", nom="Classic")
        produit = Produit.objects.create(
            modele=modele, gamme=gamme, slug="lampe-a-classic", prix_ttc_centimes=18000
        )
        self.stock = StockClassic.objects.create(
            produit=produit, quantite_dispo=10, quantite_reservee=3
        )

    def modifier(self, **data):
        return self.client.post(self.base + f"{self.stock.pk}/change/", data)

    def test_quantite_disponible_modifiable(self):
        reponse = self.modifier(quantite_dispo=15)
        self.assertEqual(reponse.status_code, 302)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_dispo, 15)

    def test_quantite_reservee_en_lecture_seule(self):
        self.modifier(quantite_dispo=12, quantite_reservee=0)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_reservee, 3)
        self.assertIn("quantite_reservee", StockClassicAdmin.readonly_fields)

    def test_impossible_sous_la_quantite_reservee(self):
        reponse = self.modifier(quantite_dispo=2)
        self.assertEqual(reponse.status_code, 200)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_dispo, 10)

    def test_egal_a_la_quantite_reservee_accepte(self):
        self.assertEqual(self.modifier(quantite_dispo=3).status_code, 302)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_dispo, 3)

    def test_service_refuse_sous_le_reserve(self):
        with self.assertRaises(StockInsuffisant):
            definir_stock_classic(self.stock, 2)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantite_dispo, 10)

    def test_service_refuse_valeur_invalide(self):
        for valeur in (-1, "5", True, None):
            with self.assertRaises(DonneesInvalides):
                definir_stock_classic(self.stock, valeur)

    def test_pas_d_ajout_ni_suppression(self):
        self.assertEqual(self.client.get(self.base + "add/").status_code, 403)
        reponse = self.client.post(self.base + f"{self.stock.pk}/delete/", {"post": "yes"})
        self.assertEqual(reponse.status_code, 403)
        self.assertTrue(StockClassic.objects.filter(pk=self.stock.pk).exists())
