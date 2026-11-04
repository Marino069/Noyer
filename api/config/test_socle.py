from django.db import connection, transaction
from rest_framework.test import APITestCase

from catalogue.models import Gamme, Produit
from config.factories import creer_catalogue
from inventaire.models import Piece


class SocleDeTestsTests(APITestCase):
    def test_les_tests_tournent_sur_mariadb(self):
        self.assertEqual(connection.vendor, "mysql")
        self.assertTrue(connection.mysql_is_mariadb)

    def test_donnees_de_test(self):
        data = creer_catalogue()
        self.assertEqual(data["classic"].gamme.code, Gamme.Code.CLASSIC)
        self.assertEqual(data["premium"].gamme.code, Gamme.Code.PREMIUM)
        self.assertEqual(Produit.objects.count(), 2)
        self.assertEqual(Piece.objects.filter(serie=data["serie"]).count(), 3)

    def test_select_for_update_dans_une_transaction(self):
        data = creer_catalogue()
        with transaction.atomic():
            piece = Piece.objects.select_for_update().get(pk=data["pieces"][0].pk)
        self.assertEqual(piece.numero, 1)

    def test_client_api_joint_la_route_de_sante(self):
        r = self.client.get("/api/health/")
        self.assertIn(r.status_code, (200, 503))
        self.assertIn("statut", r.json())
