from django.test import TestCase

from config.exceptions import ReservationNonLiberable
from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation
from inventaire.services import liberer, reserver


class LibererTests(TestCase):
    def setUp(self):
        self.d = creer_catalogue()

    def test_premium_piece_redevient_disponible(self):
        r = reserver(self.d["premium"], 1, "p", numero=2)
        liberer(r)
        r.refresh_from_db()
        self.assertEqual(r.statut, Reservation.Statut.ANNULEE)
        r.piece.refresh_from_db()
        self.assertEqual(r.piece.statut, Piece.Statut.DISPONIBLE)
        # la pièce peut de nouveau être réservée
        self.assertEqual(reserver(self.d["premium"], 1, "q", numero=2).piece.numero, 2)

    def test_classic_decremente(self):
        r = reserver(self.d["classic"], 3, "p")
        liberer(r)
        stock = self.d["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, 0)

    def test_idempotente(self):
        autre = reserver(self.d["classic"], 1, "autre")
        r = reserver(self.d["classic"], 2, "p")
        liberer(r)
        liberer(r)
        stock = self.d["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, autre.quantite)

    def test_confirmee_non_liberable(self):
        r = reserver(self.d["premium"], 1, "p", numero=1)
        Reservation.objects.filter(pk=r.pk).update(statut=Reservation.Statut.CONFIRMEE)
        with self.assertRaises(ReservationNonLiberable) as ctx:
            liberer(r)
        self.assertEqual(ctx.exception.status_code, 409)
        r.piece.refresh_from_db()
        self.assertEqual(r.piece.statut, Piece.Statut.RESERVEE)
