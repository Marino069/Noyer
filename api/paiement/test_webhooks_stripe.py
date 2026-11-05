import hashlib
import hmac
import json
import time
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

from commande.models import Commande
from commande.test_passer_commande import CORPS, LOCMEM
from config.factories import creer_catalogue
from inventaire.models import Reservation

from .models import TransactionPaiement, Webhook

SECRET = "whsec_test"
CREATE = "paiement.services.stripe.checkout.Session.create"


def signer(corps: bytes, secret=SECRET) -> str:
    t = int(time.time())
    sig = hmac.new(secret.encode(), f"{t}.".encode() + corps, hashlib.sha256).hexdigest()
    return f"t={t},v1={sig}"


@override_settings(
    CACHES=LOCMEM,
    STRIPE_SECRET_KEY="sk_test_x",
    STRIPE_WEBHOOK_SECRET=SECRET,
    FRONT_URL="http://front.test",
)
class WebhookStripeTests(TestCase):
    def setUp(self):
        cache.clear()
        cat = creer_catalogue()
        self.client.post(
            "/api/panier/lignes/",
            {"produit_slug": cat["classic"].slug, "quantite": 1},
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

    def evenement(self, id_="evt_1", type_="checkout.session.completed", **session):
        objet = {
            "id": "cs_test_1",
            "object": "checkout.session",
            "payment_status": "paid",
            "amount_total": self.total,
        }
        objet.update(session)
        return {
            "id": id_,
            "object": "event",
            "type": type_,
            "data": {"object": objet},
        }

    def envoyer(self, evt, signature=None):
        corps = json.dumps(evt).encode()
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(
                "/api/webhooks/stripe/",
                corps,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE=signature or signer(corps),
            )

    def test_fausse_signature_rejetee(self):
        corps = json.dumps(self.evenement()).encode()
        r = self.client.post(
            "/api/webhooks/stripe/",
            corps,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=signer(corps, "whsec_autre"),
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Webhook.objects.count(), 0)
        self.assertEqual(Commande.objects.get().statut, "EnAttente")

    def test_signature_absente_rejetee(self):
        r = self.client.post(
            "/api/webhooks/stripe/", "{}", content_type="application/json"
        )
        self.assertEqual(r.status_code, 400)

    def test_paiement_confirme_la_commande(self):
        r = self.envoyer(self.evenement())
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Commande.objects.get().statut, "Payee")
        self.assertEqual(TransactionPaiement.objects.get().statut, "Confirmee")
        self.assertEqual(Reservation.objects.get().statut, "Confirmee")
        self.assertTrue(Webhook.objects.get(pk="evt_1").traite)
        self.assertEqual(len(mail.outbox), 1)

    def test_meme_evenement_applique_une_seule_fois(self):
        self.assertEqual(self.envoyer(self.evenement()).status_code, 200)
        self.assertEqual(self.envoyer(self.evenement()).status_code, 200)
        self.assertEqual(Webhook.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_session_expiree_marque_la_transaction_echouee(self):
        r = self.envoyer(self.evenement(type_="checkout.session.expired", payment_status="unpaid"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(TransactionPaiement.objects.get().statut, "Echouee")
        self.assertEqual(Commande.objects.get().statut, "EnAttente")
        self.assertTrue(Webhook.objects.get().traite)

    def test_paiement_asynchrone_echoue(self):
        r = self.envoyer(self.evenement(type_="checkout.session.async_payment_failed"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(TransactionPaiement.objects.get().statut, "Echouee")

    def test_evenement_non_applique_reste_identifiable(self):
        self.envoyer(self.evenement(payment_status="unpaid"))
        webhook = Webhook.objects.get()
        self.assertFalse(webhook.traite)
        self.assertEqual(Commande.objects.get().statut, "EnAttente")

    def test_montant_inattendu_non_applique(self):
        self.envoyer(self.evenement(amount_total=1))
        self.assertFalse(Webhook.objects.get().traite)
        self.assertEqual(Commande.objects.get().statut, "EnAttente")

    def test_type_non_gere_ignore(self):
        r = self.envoyer(self.evenement(type_="charge.succeeded"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Webhook.objects.count(), 0)

    def test_session_inconnue_repond_200(self):
        r = self.envoyer(self.evenement(id="cs_inconnue"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Webhook.objects.count(), 0)
