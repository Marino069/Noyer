from django.apps import apps
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

VALIDE = {
    "nom": "Camille Dupont",
    "email": "camille@exemple.ch",
    "message": "Puis-je visiter le showroom samedi ?",
    "consentement": True,
    "site_web": "",
}


@override_settings(
    ATELIER_EMAIL="atelier@noyer.test",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class ContactTests(TestCase):
    def setUp(self):
        cache.clear()  # remet à zéro les compteurs de limitation de débit

    def envoyer(self, **modif):
        return self.client.post("/api/contact/", {**VALIDE, **modif}, content_type="application/json")

    def test_le_message_arrive_a_l_atelier(self):
        reponse = self.envoyer()
        self.assertEqual(reponse.status_code, 204)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["atelier@noyer.test"])
        self.assertEqual(message.reply_to, ["camille@exemple.ch"])
        self.assertIn("showroom", message.body)

    def test_champ_cache_rempli_ignore_silencieusement(self):
        reponse = self.envoyer(site_web="http://spam.example")
        self.assertEqual(reponse.status_code, 204)
        self.assertEqual(len(mail.outbox), 0)

    def test_champ_cache_rempli_meme_si_donnees_invalides(self):
        reponse = self.envoyer(site_web="x", email="pas-un-email")
        self.assertEqual(reponse.status_code, 204)
        self.assertEqual(len(mail.outbox), 0)

    def test_consentement_obligatoire(self):
        reponse = self.envoyer(consentement=False)
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.json()["erreur"]["code"], "validation")
        self.assertEqual(len(mail.outbox), 0)

    def test_email_invalide_et_message_vide(self):
        self.assertEqual(self.envoyer(email="nope").status_code, 400)
        self.assertEqual(self.envoyer(message="").status_code, 400)
        self.assertEqual(len(mail.outbox), 0)

    def test_rien_n_est_stocke_en_base(self):
        self.assertEqual(list(apps.get_app_config("contact").get_models()), [])
