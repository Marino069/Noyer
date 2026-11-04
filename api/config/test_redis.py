import time
from unittest import mock

from django.conf import settings
from django.core.cache import caches
from django.test import SimpleTestCase, TestCase, override_settings

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


class CacheTests(SimpleTestCase):
    def test_backend_configure_sur_django_redis(self):
        self.assertEqual(settings.CACHES["default"]["BACKEND"], "django_redis.cache.RedisCache")

    @override_settings(CACHES=LOCMEM)
    def test_ecrit_relit_une_cle_avec_expiration(self):
        c = caches["default"]
        c.set("test:cle", "valeur", timeout=1)
        self.assertEqual(c.get("test:cle"), "valeur")
        time.sleep(1.1)
        self.assertIsNone(c.get("test:cle"))


class HealthRedisTests(TestCase):
    @override_settings(CACHES=LOCMEM)
    def test_health_ok_quand_redis_repond(self):
        r = self.client.get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["redis"], "ok")

    def test_health_503_quand_redis_ne_repond_pas(self):
        with mock.patch.object(type(caches["default"]), "set", side_effect=ConnectionError("down")):
            r = self.client.get("/api/health/")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["redis"], "erreur")
        self.assertEqual(r.json()["statut"], "erreur")
