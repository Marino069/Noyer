import json
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.test import TestCase, override_settings
from django.utils import timezone

from commande.models import Adresse, Commande, LigneCommande
from commande.test_passer_commande import CORPS, LOCMEM
from config.factories import creer_catalogue
from newsletter.models import Abonne
from paiement.models import TransactionPaiement, Webhook


@override_settings(CACHES=LOCMEM, VIREMENT_IBAN="CH9300762011623852957", VIREMENT_DELAI_JOURS=5)
class NlpdTests(TestCase):
    def setUp(self):
        self.cat = creer_catalogue()
        self.base = "/" + settings.ADMIN_URL + "commande/commande/"
        admin = get_user_model().objects.create_superuser("atelier", "a@noyer.ch", "mdp-42-x")
        self.client.force_login(admin, backend="django.contrib.auth.backends.ModelBackend")
        self.commande = self.commander("client@exemple.ch", 1)
        self.autre = self.commander("autre@exemple.ch", 2)
        Abonne.objects.create(
            email="client@exemple.ch", consentement_le=timezone.now() - timedelta(days=1)
        )
        Abonne.objects.create(email="autre@exemple.ch", consentement_le=timezone.now())
        transaction = TransactionPaiement.objects.get(commande=self.commande)
        transaction.ref_prestataire = "pi_secret_1"
        transaction.save()
        Webhook.objects.create(
            id_evenement="evt_1",
            payload={"data": {"customer_email": "client@exemple.ch"}},
            transaction=transaction,
        )

    def commander(self, email, numero):
        self.client.post(
            "/api/panier/lignes/",
            {"produit_slug": self.cat["premium"].slug, "quantite": 1, "numero": numero},
            content_type="application/json",
        )
        r = self.client.post(
            "/api/commandes/", {**CORPS, "email": email}, content_type="application/json"
        )
        reference = r.json()["reference"]
        self.client.post(
            f"/api/commandes/{reference}/paiement/",
            {"methode": "virement"},
            content_type="application/json",
        )
        return Commande.objects.get(reference=reference)

    def action(self, nom, commandes, **extra):
        return self.client.post(
            self.base,
            {"action": nom, "_selected_action": [c.pk for c in commandes], **extra},
        )

    def test_export_json_commandes_et_adresses(self):
        r = self.action("exporter_nlpd", [self.commande])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/json; charset=utf-8")
        donnees = json.loads(r.content)
        self.assertEqual(donnees["email"], "client@exemple.ch")
        self.assertEqual(len(donnees["commandes"]), 1)
        commande = donnees["commandes"][0]
        self.assertEqual(commande["reference"], self.commande.reference)
        self.assertEqual(commande["total_ttc_centimes"], self.commande.total_ttc_centimes)
        self.assertEqual(len(commande["lignes"]), 1)
        self.assertIn("Livraison", {a["type"] for a in commande["adresses"]})
        self.assertTrue(all(a["rue"] for a in commande["adresses"]))
        self.assertIsNotNone(donnees["newsletter"])
        self.assertNotIn("autre@exemple.ch", r.content.decode())

    def test_export_refuse_plusieurs_clients(self):
        r = self.action("exporter_nlpd", [self.commande, self.autre])
        self.assertEqual(r.status_code, 302)
        self.assertNotEqual(r.get("Content-Type"), "application/json; charset=utf-8")

    def test_anonymiser_demande_confirmation(self):
        r = self.action("anonymiser_nlpd", [self.commande])
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "irréversible")
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.client_email, "client@exemple.ch")

    def test_anonymiser_efface_toute_identite(self):
        self.action("anonymiser_nlpd", [self.commande], confirmer="1")
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.client_email, f"anonyme-{self.commande.pk}@anonyme.invalid")
        for adresse in Adresse.objects.filter(commande=self.commande):
            self.assertEqual((adresse.nom, adresse.rue, adresse.npa, adresse.localite), ("",) * 4)
        self.assertFalse(Abonne.objects.filter(email="client@exemple.ch").exists())
        self.assertEqual(Webhook.objects.get().payload, {"anonymise": True})
        self.assertIsNone(TransactionPaiement.objects.get(commande=self.commande).ref_prestataire)
        # Rien d'identifiant ne subsiste dans les tables du client
        self.assertFalse(Commande.objects.filter(client_email__icontains="client@").exists())
        self.assertNotIn("client@exemple.ch", str(Webhook.objects.get().payload))

    def test_anonymiser_conserve_montants_et_lignes(self):
        avant = (
            Commande.objects.aggregate(t=Sum("total_ttc_centimes"), n=Count("id")),
            list(LigneCommande.objects.values_list("prix_unitaire_centimes", "quantite")),
            list(TransactionPaiement.objects.values_list("montant_centimes", "statut")),
            list(Commande.objects.values_list("statut", "frais_livraison_centimes")),
        )
        self.action("anonymiser_nlpd", [self.commande], confirmer="1")
        apres = (
            Commande.objects.aggregate(t=Sum("total_ttc_centimes"), n=Count("id")),
            list(LigneCommande.objects.values_list("prix_unitaire_centimes", "quantite")),
            list(TransactionPaiement.objects.values_list("montant_centimes", "statut")),
            list(Commande.objects.values_list("statut", "frais_livraison_centimes")),
        )
        self.assertEqual(avant, apres)
        self.assertEqual(Adresse.objects.filter(commande=self.commande).first().pays, "CH")

    def test_anonymiser_ne_touche_pas_les_autres_clients(self):
        self.action("anonymiser_nlpd", [self.commande], confirmer="1")
        self.autre.refresh_from_db()
        self.assertEqual(self.autre.client_email, "autre@exemple.ch")
        self.assertTrue(Adresse.objects.filter(commande=self.autre).exclude(rue="").exists())
        self.assertTrue(Abonne.objects.filter(email="autre@exemple.ch").exists())

    def test_anonymiser_toutes_les_commandes_du_client_meme_non_selectionnees(self):
        deuxieme = self.commander("Client@Exemple.ch", 3)
        self.action("anonymiser_nlpd", [self.commande], confirmer="1")
        deuxieme.refresh_from_db()
        self.assertEqual(deuxieme.client_email, f"anonyme-{deuxieme.pk}@anonyme.invalid")

    def test_journal_ne_contient_pas_l_email(self):
        from django.contrib.admin.models import LogEntry

        self.action("anonymiser_nlpd", [self.commande], confirmer="1")
        entree = LogEntry.objects.get()
        self.assertEqual(entree.change_message, "Anonymisation nLPD")
        self.assertNotIn("client@exemple.ch", entree.object_repr)
