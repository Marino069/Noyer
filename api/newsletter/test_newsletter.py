import re

from django.core import mail
from django.test import TestCase, override_settings

from .models import Abonne


@override_settings(API_PUBLIC_URL="http://api.test", FRONT_URL="http://front.test")
class NewsletterTests(TestCase):
    def inscrire(self, **modif):
        corps = {"email": "camille@exemple.ch", "consentement": True, **modif}
        return self.client.post("/api/newsletter/", corps, content_type="application/json")

    def test_inscription_envoie_un_email_de_confirmation_sans_activer(self):
        reponse = self.inscrire()
        self.assertEqual(reponse.status_code, 202)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["camille@exemple.ch"])
        self.assertFalse(Abonne.objects.get().confirme)

    def test_confirmation_par_le_lien_active_l_inscription(self):
        self.inscrire()
        lien = re.search(r"http://api\.test(/api/newsletter/confirmer/\?jeton=\S+)", mail.outbox[0].body).group(1)
        reponse = self.client.get(lien)
        self.assertEqual(reponse.status_code, 302)
        self.assertIn("statut=ok", reponse["Location"])
        self.assertTrue(Abonne.objects.get().confirme)

    def test_jeton_invalide(self):
        self.inscrire()
        reponse = self.client.get("/api/newsletter/confirmer/?jeton=faux")
        self.assertIn("statut=invalide", reponse["Location"])
        self.assertFalse(Abonne.objects.get().confirme)

    def test_sans_consentement_erreur_de_validation(self):
        for corps in ({"consentement": False}, {"consentement": None}):
            reponse = self.inscrire(**corps)
            self.assertEqual(reponse.status_code, 400)
            self.assertEqual(reponse.json()["erreur"]["code"], "validation")
        reponse = self.client.post("/api/newsletter/", {"email": "a@b.ch"}, content_type="application/json")
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(Abonne.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_email_invalide(self):
        self.assertEqual(self.inscrire(email="nope").status_code, 400)
        self.assertEqual(Abonne.objects.count(), 0)

    def test_reinscription_en_attente_renvoie_la_confirmation_sans_doublon(self):
        self.inscrire()
        self.inscrire(email="Camille@Exemple.ch")
        self.assertEqual(Abonne.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 2)

    def test_deja_confirme_repond_202_sans_email(self):
        self.inscrire()
        Abonne.objects.update(confirme_le="2026-01-01T00:00:00Z")
        mail.outbox.clear()
        self.assertEqual(self.inscrire().status_code, 202)
        self.assertEqual(len(mail.outbox), 0)
