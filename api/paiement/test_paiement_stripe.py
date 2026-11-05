from unittest import mock

import stripe
from django.core.cache import cache
from django.test import TestCase, override_settings

from commande.models import Commande
from commande.test_passer_commande import CORPS, LOCMEM
from config.factories import creer_catalogue

from .models import TransactionPaiement

CREATE = "paiement.services.stripe.checkout.Session.create"


@override_settings(CACHES=LOCMEM, STRIPE_SECRET_KEY="sk_test_x", FRONT_URL="http://front.test")
class PaiementStripeTests(TestCase):
    def setUp(self):
        cache.clear()
        cat = creer_catalogue()
        self.client.post(
            "/api/panier/lignes/",
            {"produit_slug": cat["classic"].slug, "quantite": 2},
            content_type="application/json",
        )
        r = self.client.post("/api/commandes/", CORPS, content_type="application/json")
        self.reference = r.json()["reference"]
        self.total = r.json()["total_centimes"]
        self.url = f"/api/commandes/{self.reference}/paiement/"

    def payer(self, corps=None):
        return self.client.post(
            self.url, corps or {"methode": "stripe"}, content_type="application/json"
        )

    @mock.patch(CREATE)
    def test_cree_session_et_transaction(self, create):
        create.return_value = mock.Mock(id="cs_test_1", url="https://checkout.stripe.com/pay/1")
        r = self.payer()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(
            r.json(),
            {"methode": "stripe", "url_paiement": "https://checkout.stripe.com/pay/1"},
        )
        kwargs = create.call_args.kwargs
        prix = kwargs["line_items"][0]["price_data"]
        self.assertEqual(prix["currency"], "chf")
        self.assertEqual(prix["unit_amount"], self.total)
        self.assertIn("twint", kwargs["payment_method_types"])
        self.assertTrue(kwargs["success_url"].startswith("http://front.test/"))
        t = TransactionPaiement.objects.get()
        self.assertEqual(t.statut, "Creee")
        self.assertEqual(t.ref_prestataire, "cs_test_1")
        self.assertEqual(t.montant_centimes, self.total)
        self.assertEqual(t.commande.reference, self.reference)

    @mock.patch(CREATE)
    def test_montant_du_front_ignore(self, create):
        create.return_value = mock.Mock(id="cs_test_2", url="https://checkout.stripe.com/x")
        self.payer({"methode": "stripe", "montant_centimes": 1})
        prix = create.call_args.kwargs["line_items"][0]["price_data"]
        self.assertEqual(prix["unit_amount"], self.total)

    @mock.patch(CREATE)
    def test_commande_payee_refusee_409(self, create):
        Commande.objects.update(statut=Commande.Statut.PAYEE)
        r = self.payer()
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["erreur"]["code"], "deja_payee")
        create.assert_not_called()
        self.assertEqual(TransactionPaiement.objects.count(), 0)

    @mock.patch(CREATE)
    def test_transaction_confirmee_refusee_409(self, create):
        create.return_value = mock.Mock(id="cs_test_3", url="https://checkout.stripe.com/x")
        self.payer()
        TransactionPaiement.objects.update(statut="Confirmee")
        r = self.payer()
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["erreur"]["code"], "deja_payee")

    @mock.patch(CREATE)
    def test_commande_annulee_409(self, create):
        Commande.objects.update(statut=Commande.Statut.ANNULEE)
        r = self.payer()
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["erreur"]["code"], "commande_annulee")

    def test_reference_inconnue_404(self):
        r = self.client.post(
            "/api/commandes/NOY-0000-00000/paiement/",
            {"methode": "stripe"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 404)

    def test_methode_invalide(self):
        r = self.payer({"methode": "bitcoin"})
        self.assertIn(r.status_code, (400, 422))
        self.assertEqual(r.json()["erreur"]["code"], "validation")

    @mock.patch(CREATE, side_effect=stripe.APIConnectionError("hors ligne"))
    def test_erreur_stripe_502_sans_transaction(self, create):
        r = self.payer()
        self.assertEqual(r.status_code, 502)
        self.assertEqual(r.json()["erreur"]["code"], "erreur_interne")
        self.assertEqual(TransactionPaiement.objects.count(), 0)
