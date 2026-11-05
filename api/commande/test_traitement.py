from django.conf import settings
from django.contrib.admin.models import LogEntry
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings

from commande.models import Commande
from commande.test_passer_commande import CORPS, LOCMEM
from commande.traitement import marquer_expediee, marquer_virement_recu
from config.exceptions import TransitionImpossible
from config.factories import creer_catalogue
from paiement.models import TransactionPaiement


@override_settings(CACHES=LOCMEM, VIREMENT_IBAN="CH9300762011623852957", VIREMENT_DELAI_JOURS=5)
class TraitementTests(TestCase):
    def setUp(self):
        self.cat = creer_catalogue()
        self.base = "/" + settings.ADMIN_URL + "commande/commande/"
        self.admin = get_user_model().objects.create_superuser("atelier", "a@noyer.ch", "mdp-42-x")
        self.client.force_login(self.admin, backend="django.contrib.auth.backends.ModelBackend")
        self.client.post(
            "/api/panier/lignes/",
            {"produit_slug": self.cat["premium"].slug, "quantite": 1, "numero": 1},
            content_type="application/json",
        )
        r = self.client.post("/api/commandes/", CORPS, content_type="application/json")
        self.reference = r.json()["reference"]
        self.client.post(
            f"/api/commandes/{self.reference}/paiement/",
            {"methode": "virement"},
            content_type="application/json",
        )
        self.commande = Commande.objects.get(reference=self.reference)

    def action(self, nom):
        return self.client.post(
            self.base, {"action": nom, "_selected_action": [self.commande.pk]}, follow=True
        )

    def test_liste_filtrable_par_statut(self):
        r = self.client.get(self.base + "?statut__exact=EnAttente")
        self.assertContains(r, self.reference)
        r = self.client.get(self.base + "?statut__exact=Expediee")
        self.assertNotContains(r, self.reference)

    def test_detail_affiche_lignes_adresses_paiements(self):
        r = self.client.get(self.base + f"{self.commande.pk}/change/")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Lampe test")
        self.assertContains(r, "Livraison")
        self.assertContains(r, "Virement")

    def test_virement_recu_vend_et_trace(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.action("virement_recu")
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, "Payee")
        self.assertEqual(TransactionPaiement.objects.get().statut, "Confirmee")
        entree = LogEntry.objects.get()
        self.assertEqual(entree.user, self.admin)
        self.assertEqual(entree.object_id, str(self.commande.pk))

    def test_expediee_envoie_email_et_trace(self):
        marquer_virement_recu(self.commande.pk)
        with self.captureOnCommitCallbacks(execute=True):
            self.action("expediee")
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, "Expediee")
        self.assertIn("expédiée", mail.outbox[-1].subject)
        self.assertEqual(LogEntry.objects.get().user, self.admin)

    def test_annulee_vers_expediee_refusee(self):
        Commande.objects.filter(pk=self.commande.pk).update(statut="Annulee")
        with self.assertRaises(TransitionImpossible):
            marquer_expediee(self.commande.pk)
        self.action("expediee")
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, "Annulee")
        self.assertFalse(LogEntry.objects.exists())

    def test_en_attente_vers_expediee_refusee(self):
        with self.assertRaises(TransitionImpossible):
            marquer_expediee(self.commande.pk)

    def test_virement_recu_deux_fois_refuse(self):
        marquer_virement_recu(self.commande.pk)
        with self.assertRaises(TransitionImpossible):
            marquer_virement_recu(self.commande.pk)

    def test_virement_recu_sans_virement_refuse(self):
        TransactionPaiement.objects.all().delete()
        with self.assertRaises(TransitionImpossible):
            marquer_virement_recu(self.commande.pk)
