from datetime import timedelta

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation
from paiement.models import TransactionPaiement

from .models import Commande
from .services import annuler_commandes_abandonnees
from .test_passer_commande import CORPS, LOCMEM


@override_settings(CACHES=LOCMEM, TVA_TAUX_CENTIEMES=810, FRAIS_LIVRAISON_CENTIMES=1500)
class AnnulationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cat = creer_catalogue()
        for corps in (
            {"produit_slug": self.cat["premium"].slug, "quantite": 1, "numero": 2},
            {"produit_slug": self.cat["classic"].slug, "quantite": 2},
        ):
            self.client.post("/api/panier/lignes/", corps, content_type="application/json")
        r = self.client.post("/api/commandes/", CORPS, content_type="application/json")
        self.assertEqual(r.status_code, 201, r.content)
        self.commande = Commande.objects.get(reference=r.json()["reference"])

    def perimer(self):
        Reservation.objects.update(expire_le=timezone.now() - timedelta(minutes=1))

    def test_commande_abandonnee_annulee_et_articles_disponibles(self):
        self.perimer()
        self.assertEqual(annuler_commandes_abandonnees(), 1)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.ANNULEE)
        self.assertEqual(Piece.objects.get(numero=2).statut, Piece.Statut.DISPONIBLE)
        stock = self.cat["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, 0)

    def test_commande_dans_son_delai_intacte(self):
        self.assertEqual(annuler_commandes_abandonnees(), 0)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.EN_ATTENTE)

    def test_une_reservation_encore_valable_empeche_l_annulation(self):
        Reservation.objects.filter(piece__isnull=True).update(
            expire_le=timezone.now() - timedelta(minutes=1)
        )
        self.assertEqual(annuler_commandes_abandonnees(), 0)

    def test_commande_payee_intacte(self):
        Commande.objects.filter(pk=self.commande.pk).update(statut=Commande.Statut.PAYEE)
        Reservation.objects.update(statut=Reservation.Statut.CONFIRMEE)
        self.perimer()
        self.assertEqual(annuler_commandes_abandonnees(), 0)

    def test_virement_non_valide_dans_le_delai_annule_la_commande(self):
        t = TransactionPaiement.objects.create(
            commande=self.commande,
            methode="Virement",
            prestataire="banque",
            montant_centimes=self.commande.total_ttc_centimes,
        )
        self.perimer()
        self.assertEqual(annuler_commandes_abandonnees(), 1)
        t.refresh_from_db()
        self.assertEqual(t.statut, TransactionPaiement.Statut.ECHOUEE)
        self.assertEqual(Piece.objects.get(numero=2).statut, Piece.Statut.DISPONIBLE)

    def test_virement_dans_le_delai_intact(self):
        TransactionPaiement.objects.create(
            commande=self.commande,
            methode="Virement",
            prestataire="banque",
            montant_centimes=self.commande.total_ttc_centimes,
        )
        Reservation.objects.update(expire_le=timezone.now() + timedelta(days=3))
        self.assertEqual(annuler_commandes_abandonnees(), 0)

    def test_tache_du_worker(self):
        self.perimer()
        call_command("worker", "--une-fois")
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.ANNULEE)
