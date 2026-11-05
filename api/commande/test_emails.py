import logging
from unittest import mock

from django.core import mail
from django.db import transaction
from django.test import TestCase

from commande import emails
from commande.models import Commande, LigneCommande
from config.factories import creer_catalogue


class EmailsCommandeTests(TestCase):
    def setUp(self):
        self.catalogue = creer_catalogue()
        self.commande = Commande.objects.create(
            reference="NOY-2026-00001",
            client_email="client@exemple.ch",
            total_ttc_centimes=48000,
            taux_tva="8.10",
        )
        LigneCommande.objects.create(
            commande=self.commande,
            produit=self.catalogue["premium"],
            nom_produit="Lampe test Premium",
            gamme="Premium",
            prix_unitaire_centimes=48000,
            piece=self.catalogue["pieces"][1],
        )

    def _envoyer(self, fonction):
        with self.captureOnCommitCallbacks(execute=True):
            fonction(self.commande)

    def test_paiement_confirme_avec_numero_de_piece(self):
        self._envoyer(emails.envoyer_paiement_confirme)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["client@exemple.ch"])
        self.assertIn("NOY-2026-00001", message.subject)
        self.assertIn("Pièce n° 2", message.alternatives[0][0])
        self.assertIn("480.00", message.body)

    def test_expedition_et_virement(self):
        self._envoyer(emails.envoyer_expedition)
        self._envoyer(emails.envoyer_virement_en_attente)
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn("expédiée", mail.outbox[0].subject)
        self.assertIn("virement", mail.outbox[1].alternatives[0][0])

    def test_html_adapte_au_mobile(self):
        self._envoyer(emails.envoyer_paiement_confirme)
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn('name="viewport"', html)
        self.assertIn("max-width: 600px", html)
        self.assertIn("@media", html)

    def test_rien_n_est_envoye_si_la_transaction_est_annulee(self):
        with self.captureOnCommitCallbacks(execute=True):
            try:
                with transaction.atomic():
                    emails.envoyer_paiement_confirme(self.commande)
                    raise RuntimeError
            except RuntimeError:
                pass
        self.assertEqual(len(mail.outbox), 0)

    def test_echec_d_envoi_journalise_sans_annuler_la_commande(self):
        with (
            mock.patch("django.core.mail.EmailMultiAlternatives.send", side_effect=OSError("smtp")),
            self.assertLogs("noyer.emails", level=logging.ERROR),
            self.captureOnCommitCallbacks(execute=True),
            transaction.atomic(),
        ):
            self.commande.statut = Commande.Statut.PAYEE
            self.commande.save()
            emails.envoyer_paiement_confirme(self.commande)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.PAYEE)
