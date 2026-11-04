import threading
from unittest import mock

from django.db import connection
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from config.exceptions import DonneesInvalides, PieceIndisponible, StockInsuffisant
from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation
from inventaire.services import reserver


class ReserverPremiumTests(TestCase):
    def setUp(self):
        self.d = creer_catalogue()

    def test_sans_numero_prend_le_plus_petit(self):
        r = reserver(self.d["premium"], 1, "panier-a")
        self.assertEqual(r.piece.numero, 1)
        self.assertEqual(r.statut, Reservation.Statut.ACTIVE)
        delta = (r.expire_le - timezone.now()).total_seconds()
        self.assertTrue(14 * 60 < delta <= 15 * 60)
        self.d["pieces"][0].refresh_from_db()
        self.assertEqual(self.d["pieces"][0].statut, Piece.Statut.RESERVEE)

    def test_numero_demande(self):
        r = reserver(self.d["premium"], 1, "panier-a", numero=3)
        self.assertEqual(r.piece.numero, 3)

    def test_piece_deja_reservee(self):
        reserver(self.d["premium"], 1, "panier-a", numero=2)
        with self.assertRaises(PieceIndisponible) as ctx:
            reserver(self.d["premium"], 1, "panier-b", numero=2)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(Reservation.objects.count(), 1)

    def test_contrainte_unique_convertie_en_piece_indisponible(self):
        # statut de la pièce incohérent (Disponible) mais réservation active présente
        Reservation.objects.create(
            produit=self.d["premium"],
            panier_id="x",
            piece=self.d["pieces"][0],
            expire_le=timezone.now(),
        )
        with self.assertRaises(PieceIndisponible):
            reserver(self.d["premium"], 1, "panier-b", numero=1)
        self.d["pieces"][0].refresh_from_db()
        self.assertEqual(self.d["pieces"][0].statut, Piece.Statut.DISPONIBLE)
        self.assertEqual(Reservation.objects.count(), 1)

    def test_plus_aucune_piece(self):
        for _ in range(3):
            reserver(self.d["premium"], 1, "p")
        with self.assertRaises(PieceIndisponible):
            reserver(self.d["premium"], 1, "p")

    def test_quantite_invalide(self):
        with self.assertRaises(DonneesInvalides):
            reserver(self.d["premium"], 2, "p")
        with self.assertRaises(DonneesInvalides):
            reserver(self.d["premium"], 0, "p")


class ReserverClassicTests(TestCase):
    def setUp(self):
        self.d = creer_catalogue()

    def test_incremente_quantite_reservee(self):
        r = reserver(self.d["classic"], 2, "panier-a")
        self.assertEqual(r.quantite, 2)
        stock = self.d["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, 2)
        self.assertEqual(stock.quantite_dispo, 5)

    def test_stock_insuffisant_ne_modifie_rien(self):
        reserver(self.d["classic"], 4, "panier-a")
        with self.assertRaises(StockInsuffisant) as ctx:
            reserver(self.d["classic"], 2, "panier-b")
        self.assertEqual(ctx.exception.status_code, 409)
        stock = self.d["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, 4)
        self.assertEqual(Reservation.objects.count(), 1)

    def test_erreur_annule_toute_la_transaction(self):
        with mock.patch(
            "inventaire.services.Reservation.objects.create", side_effect=RuntimeError("boom")
        ), self.assertRaises(RuntimeError):
            reserver(self.d["classic"], 1, "panier-a")
        stock = self.d["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, 0)


class ReserverConcurrenceTests(TransactionTestCase):
    def lancer(self, n, premium):
        d = creer_catalogue()
        produit = d["premium"] if premium else d["classic"]
        kwargs = {"numero": 1} if premium else {}
        barriere = threading.Barrier(n)
        resultats = []

        def tache(i):
            try:
                barriere.wait()
                reserver(produit, 1, f"panier-{i}", **kwargs)
                resultats.append("ok")
            except (PieceIndisponible, StockInsuffisant):
                resultats.append("409")
            finally:
                connection.close()

        threads = [threading.Thread(target=tache, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        return d, resultats

    def test_meme_piece_une_seule_reussit(self):
        d, resultats = self.lancer(2, premium=True)
        self.assertEqual(sorted(resultats), ["409", "ok"])
        self.assertEqual(Reservation.objects.filter(piece=d["pieces"][0]).count(), 1)

    def test_classic_pas_de_survente(self):
        d, resultats = self.lancer(8, premium=False)
        self.assertEqual(resultats.count("ok"), 5)
        self.assertEqual(resultats.count("409"), 3)
        stock = d["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, 5)
