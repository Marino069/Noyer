from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation


class DisponibiliteTests(TestCase):
    def setUp(self):
        self.d = creer_catalogue()

    def get(self, slug):
        return self.client.get("/api/produits/" + slug + "/disponibilite/")

    def test_classic_quantite_vendable(self):
        stock = self.d["classic"].stock
        stock.quantite_reservee = 2
        stock.save()
        r = self.get("lampe-test-classic")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"gamme": "Classic", "quantite_disponible": 3})
        self.assertEqual(r["Cache-Control"], "no-store")

    def test_premium_pieces_et_numeros(self):
        r = self.get("lampe-test-premium")
        s = r.json()["series"][0]
        self.assertEqual(r.json()["gamme"], "Premium")
        self.assertEqual(s["taille_serie"], 3)
        self.assertEqual(s["pieces_restantes"], 3)
        self.assertEqual(s["numeros_disponibles"], [1, 2, 3])

    def test_piece_reservee_ou_vendue_non_comptee(self):
        p1, p2, _ = self.d["pieces"]
        p1.statut = Piece.Statut.RESERVEE
        p1.save()
        p2.statut = Piece.Statut.VENDUE
        p2.save()
        s = self.get("lampe-test-premium").json()["series"][0]
        self.assertEqual(s["pieces_restantes"], 1)
        self.assertEqual(s["numeros_disponibles"], [3])

    def test_reservation_active_exclut_la_piece(self):
        Reservation.objects.create(
            produit=self.d["premium"],
            panier_id="p",
            piece=self.d["pieces"][0],
            expire_le=timezone.now() + timedelta(minutes=10),
        )
        s = self.get("lampe-test-premium").json()["series"][0]
        self.assertEqual(s["numeros_disponibles"], [2, 3])

    def test_produit_inconnu_ou_inactif(self):
        self.assertEqual(self.get("nope").status_code, 404)
        self.d["classic"].actif = False
        self.d["classic"].save()
        self.assertEqual(self.get("lampe-test-classic").status_code, 404)
