from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


@override_settings(CACHES=LOCMEM)
class LimitationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.addCleanup(setattr, ScopedRateThrottle, "THROTTLE_RATES", ScopedRateThrottle.THROTTLE_RATES)

    def _limiter(self, **taux):
        ScopedRateThrottle.THROTTLE_RATES = {**ScopedRateThrottle.THROTTLE_RATES, **taux}

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    def test_contact_au_dela_de_la_limite_renvoie_429_format_standard(self):
        self._limiter(contact="2/hour")
        corps = {"nom": "A", "email": "a@b.ch", "message": "Bonjour", "consentement": True}
        for _ in range(2):
            self.assertEqual(self.client.post("/api/contact/", corps, format="json").status_code, 204)
        reponse = self.client.post("/api/contact/", corps, format="json")
        self.assertEqual(reponse.status_code, 429)
        self.assertEqual(reponse.json()["erreur"]["code"], "trop_de_requetes")
        self.assertIn("message", reponse.json()["erreur"])
        self.assertIn("Retry-After", reponse)

    def test_creation_de_commande_est_limitee(self):
        self._limiter(commande="1/hour")
        url = reverse("commandes")
        self.assertNotEqual(self.client.post(url, {}, format="json").status_code, 429)
        reponse = self.client.post(url, {}, format="json")
        self.assertEqual(reponse.status_code, 429)
        self.assertEqual(reponse.json()["erreur"]["code"], "trop_de_requetes")

    def test_ajout_au_panier_est_limite(self):
        self._limiter(panier_ajout="1/minute")
        url = reverse("panier-lignes")
        self.assertNotEqual(self.client.post(url, {}, format="json").status_code, 429)
        reponse = self.client.post(url, {}, format="json")
        self.assertEqual(reponse.status_code, 429)
        self.assertEqual(reponse.json()["erreur"]["code"], "trop_de_requetes")

    @override_settings(STRIPE_WEBHOOK_SECRET="whsec_x")
    def test_webhooks_stripe_ne_sont_pas_limites(self):
        self._limiter(contact="1/hour", commande="1/hour", panier_ajout="1/minute")
        url = reverse("webhook_stripe")
        for _ in range(20):
            reponse = self.client.post(
                url, "{}", content_type="application/json", HTTP_STRIPE_SIGNATURE="t=1,v1=x"
            )
            self.assertNotEqual(reponse.status_code, 429)

    def test_check_deploy_sans_avertissement(self):
        reglages = {
            "DEBUG": False,
            "SECRET_KEY": "x7#Qp" * 12,
            "ALLOWED_HOSTS": ["noyer.ch"],
            "SECURE_SSL_REDIRECT": True,
            "SECURE_HSTS_SECONDS": 31536000,
            "SECURE_HSTS_INCLUDE_SUBDOMAINS": True,
            "SECURE_HSTS_PRELOAD": True,
            "SESSION_COOKIE_SECURE": True,
            "CSRF_COOKIE_SECURE": True,
            # le lanceur de tests force le backend email « locmem », refusé par mail.E001
            "MAILERS": {"default": {"BACKEND": "django.core.mail.backends.smtp.EmailBackend"}},
        }
        with override_settings(**reglages):
            # fail_level=WARNING : lève CommandError au moindre avertissement
            call_command("check", deploy=True, fail_level="WARNING")
