import json
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

from commande.models import Commande
from commande.test_passer_commande import CORPS, LOCMEM
from config.factories import creer_catalogue
from inventaire import services as inventaire
from inventaire.models import Piece, Reservation, StockClassic

from .models import TransactionPaiement
from .test_webhooks_stripe import CREATE, SECRET, signer


@override_settings(
    CACHES=LOCMEM,
    STRIPE_SECRET_KEY="sk_test_x",
    STRIPE_WEBHOOK_SECRET=SECRET,
    FRONT_URL="http://front.test",
    ATELIER_EMAIL="atelier@test.ch",
)
class ConfirmerVenteTests(TestCase):
    def commander(self, produit):
        cache.clear()
        self.client.post(
            "/api/panier/lignes/",
            {"produit_slug": produit.slug, "quantite": 1},
            content_type="application/json",
        )
        r = self.client.post("/api/commandes/", CORPS, content_type="application/json")
        self.total = r.json()["total_centimes"]
        with mock.patch(CREATE) as create:
            create.return_value = mock.Mock(id="cs_test_1", url="https://x")
            self.client.post(
                f"/api/commandes/{r.json()['reference']}/paiement/",
                {"methode": "stripe"},
                content_type="application/json",
            )

    def payer(self):
        evt = {
            "id": "evt_1",
            "object": "event",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_1",
                    "object": "checkout.session",
                    "payment_status": "paid",
                    "amount_total": self.total,
                }
            },
        }
        corps = json.dumps(evt).encode()
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(
                "/api/webhooks/stripe/",
                corps,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE=signer(corps),
            )

    def test_premium_apres_paiement_la_piece_n_est_plus_disponible(self):
        cat = creer_catalogue()
        self.commander(cat["premium"])
        piece = Reservation.objects.get().piece
        self.assertEqual(piece.statut, "Reservee")
        self.assertEqual(self.payer().status_code, 200)
        piece.refresh_from_db()
        self.assertEqual(piece.statut, "Vendue")
        self.assertEqual(Reservation.objects.get().statut, "Confirmee")
        self.assertEqual(Commande.objects.get().statut, "Payee")
        self.assertEqual(TransactionPaiement.objects.get().statut, "Confirmee")
        self.assertEqual(len(mail.outbox), 1)

    def test_classic_decremente_le_stock(self):
        cat = creer_catalogue()
        self.commander(cat["classic"])
        self.payer()
        stock = StockClassic.objects.get(produit=cat["classic"])
        self.assertEqual((stock.quantite_dispo, stock.quantite_reservee), (4, 0))

    def test_erreur_au_milieu_annule_toute_l_operation(self):
        cat = creer_catalogue()
        self.commander(cat["premium"])
        piece_id = Reservation.objects.get().piece_id
        vraie = inventaire.vendre_apres_expiration

        def puis_echoue(reservation):
            vraie(reservation)
            raise RuntimeError("panne")

        self.client.raise_request_exception = False
        with mock.patch("paiement.vente.inventaire.vendre_apres_expiration", puis_echoue):
            r = self.payer()
        self.assertEqual(r.status_code, 500)
        self.assertEqual(Piece.objects.get(pk=piece_id).statut, "Reservee")
        self.assertEqual(Reservation.objects.get().statut, "Active")
        self.assertEqual(Commande.objects.get().statut, "EnAttente")
        self.assertEqual(TransactionPaiement.objects.get().statut, "Creee")
        self.assertEqual(len(mail.outbox), 0)

    def test_paiement_tardif_piece_encore_libre_est_vendue(self):
        cat = creer_catalogue()
        self.commander(cat["premium"])
        reservation = Reservation.objects.get()
        inventaire.liberer(reservation, Reservation.Statut.EXPIREE)
        Commande.objects.update(statut="Annulee")
        self.payer()
        self.assertEqual(Piece.objects.get(pk=reservation.piece_id).statut, "Vendue")
        commande = Commande.objects.get()
        self.assertEqual(commande.statut, "Payee")
        self.assertFalse(commande.a_rembourser)

    def test_paiement_tardif_piece_prise_marque_a_rembourser_et_alerte(self):
        cat = creer_catalogue()
        self.commander(cat["premium"])
        reservation = Reservation.objects.get()
        numero = reservation.piece.numero
        inventaire.liberer(reservation, Reservation.Statut.EXPIREE)
        # un autre client a réservé la même pièce entre-temps
        inventaire.reserver(cat["premium"], 1, "autre-panier", numero=numero)
        self.payer()
        commande = Commande.objects.get()
        self.assertTrue(commande.a_rembourser)
        self.assertEqual(commande.statut, "Annulee")
        self.assertEqual(TransactionPaiement.objects.get().statut, "Confirmee")
        self.assertEqual(Piece.objects.get(pk=reservation.piece_id).statut, "Reservee")
        self.assertEqual([m.to for m in mail.outbox], [["atelier@test.ch"]])

    def test_paiement_tardif_stock_epuise_marque_a_rembourser(self):
        cat = creer_catalogue()
        self.commander(cat["classic"])
        inventaire.liberer(Reservation.objects.get(), Reservation.Statut.EXPIREE)
        StockClassic.objects.update(quantite_dispo=0)
        self.payer()
        self.assertTrue(Commande.objects.get().a_rembourser)
        self.assertEqual(StockClassic.objects.get(produit=cat["classic"]).quantite_dispo, 0)
