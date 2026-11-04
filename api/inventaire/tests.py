from datetime import timedelta

from django.db import IntegrityError, connection, transaction
from django.test import TestCase
from django.utils import timezone

from catalogue.models import Gamme, Modele, Produit
from inventaire.models import Piece, Reservation, Serie


class ReservationActiveUniqueTests(TestCase):
    def setUp(self):
        modele = Modele.objects.create(slug="lampe", nom="Lampe")
        gamme = Gamme.objects.create(code="Premium", nom="Premium")
        self.produit = Produit.objects.create(
            slug="lampe-premium", prix_ttc_centimes=48000, modele=modele, gamme=gamme
        )
        serie = Serie.objects.create(produit=self.produit, taille_serie=10)
        self.piece = Piece.objects.create(serie=serie, numero=1)

    def reserver(self, statut="Active", panier_id="a" * 36):
        return Reservation.objects.create(
            produit=self.produit,
            piece=self.piece,
            panier_id=panier_id,
            expire_le=timezone.now() + timedelta(minutes=15),
            statut=statut,
        )

    def test_deux_reservations_actives_sur_la_meme_piece_sont_refusees(self):
        self.reserver()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.reserver(panier_id="b" * 36)

    def test_une_reservation_active_apres_une_expiree_est_acceptee(self):
        self.reserver(statut="Expiree")
        self.reserver(panier_id="b" * 36)
        self.assertEqual(Reservation.objects.filter(piece=self.piece).count(), 2)

    def test_plusieurs_reservations_inactives_sur_la_meme_piece_sont_acceptees(self):
        self.reserver(statut="Annulee")
        self.reserver(statut="Expiree", panier_id="b" * 36)
        self.assertEqual(Reservation.objects.filter(piece=self.piece).count(), 2)

    def test_la_colonne_generee_existe(self):
        with connection.cursor() as cursor:
            colonnes = [c.name for c in connection.introspection.get_table_description(
                cursor, "Reservation")]
        self.assertIn("id_piece_active", colonnes)
