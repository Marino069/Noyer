from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TransactionTestCase
from django.utils import timezone

from catalogue.models import Gamme, Modele, Produit

from .models import Piece, Reservation, Serie


class ReservationActiveUniqueTests(TransactionTestCase):
    def setUp(self):
        modele = Modele.objects.create(slug="aube", nom="Aube")
        gamme = Gamme.objects.create(code=Gamme.Code.PREMIUM, nom="Premium")
        self.produit = Produit.objects.create(
            slug="aube-premium", prix_ttc_centimes=48000, modele=modele, gamme=gamme
        )
        serie = Serie.objects.create(produit=self.produit, taille_serie=10)
        self.piece = Piece.objects.create(serie=serie, numero=1)

    def reserver(self, statut=Reservation.Statut.ACTIVE, panier="p1"):
        return Reservation.objects.create(
            produit=self.produit,
            piece=self.piece,
            panier_id=panier,
            expire_le=timezone.now() + timedelta(minutes=15),
            statut=statut,
        )

    def test_deux_reservations_actives_sur_la_meme_piece_sont_refusees(self):
        self.reserver(panier="p1")
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.reserver(panier="p2")
        self.assertEqual(Reservation.objects.count(), 1)

    def test_reservation_possible_apres_expiration_de_la_precedente(self):
        premiere = self.reserver(panier="p1")
        premiere.statut = Reservation.Statut.EXPIREE
        premiere.save()
        self.reserver(panier="p2")
        self.assertEqual(Reservation.objects.filter(statut="Active").count(), 1)

    def test_plusieurs_reservations_non_actives_sur_la_meme_piece(self):
        self.reserver(Reservation.Statut.ANNULEE, panier="p1")
        self.reserver(Reservation.Statut.EXPIREE, panier="p2")
        self.assertEqual(Reservation.objects.count(), 2)
