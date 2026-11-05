import uuid
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings

from config.factories import creer_catalogue

from . import services

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


@override_settings(CACHES=LOCMEM)
class PanierTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_nouveau_visiteur_obtient_un_panier_vide(self):
        r = self.client.get("/api/panier/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(
            r.json(),
            {
                "lignes": [],
                "sous_total_centimes": 0,
                "frais_livraison_centimes": 0,
                "tva_incluse_centimes": 0,
                "taux_tva": "8.10",
                "total_centimes": 0,
            },
        )

    def test_cookie_httponly_et_panier_dans_redis(self):
        r = self.client.get("/api/panier/")
        cookie = r.cookies[services.COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["max-age"], 3 * 24 * 3600)
        panier_id = uuid.UUID(cookie.value)
        self.assertEqual(cache.get(f"panier:{panier_id}"), {"lignes": []})

    def test_expiration_de_trois_jours(self):
        with mock.patch.object(cache, "set", wraps=cache.set) as spy:
            self.client.get("/api/panier/")
        self.assertEqual(spy.call_args.kwargs["timeout"], 3 * 24 * 3600)

    def test_panier_retrouve_a_la_visite_suivante(self):
        premier = self.client.get("/api/panier/")
        panier_id = premier.cookies[services.COOKIE_NAME].value
        second = self.client.get("/api/panier/")
        self.assertEqual(second.status_code, 200)
        # pas de nouveau cookie : le panier existant est réutilisé
        self.assertNotIn(services.COOKIE_NAME, second.cookies)
        self.assertEqual(self.client.cookies[services.COOKIE_NAME].value, panier_id)

    def test_panier_retrouve_avec_son_contenu(self):
        c = creer_catalogue()
        panier_id = services.creer_vide()
        services.enregistrer(
            panier_id,
            {"lignes": [{"id": "a1", "produit_id": c["classic"].pk, "quantite": 2}]},
        )
        self.client.cookies[services.COOKIE_NAME] = str(panier_id)
        data = self.client.get("/api/panier/").json()
        self.assertEqual(len(data["lignes"]), 1)
        self.assertEqual(data["lignes"][0]["produit"]["slug"], "lampe-test-classic")
        self.assertEqual(data["lignes"][0]["quantite"], 2)
        self.assertEqual(data["sous_total_centimes"], 36000)
        self.assertEqual(data["total_centimes"], 36000)
        # 36000 * 8,1 / 108,1 = 2697,5 -> 2698
        self.assertEqual(data["tva_incluse_centimes"], 2698)

    def test_prix_recalcule_depuis_la_base(self):
        c = creer_catalogue()
        panier_id = services.creer_vide()
        services.enregistrer(
            panier_id,
            {
                "lignes": [
                    {
                        "id": "a1",
                        "produit_id": c["classic"].pk,
                        "quantite": 1,
                        "prix_ttc_centimes": 1,
                    }
                ]
            },
        )
        self.client.cookies[services.COOKIE_NAME] = str(panier_id)
        self.assertEqual(self.client.get("/api/panier/").json()["total_centimes"], 18000)

    def test_panier_expire_donne_un_panier_vide_et_nouveau_cookie(self):
        panier_id = services.creer_vide()
        cache.delete(f"panier:{panier_id}")
        self.client.cookies[services.COOKIE_NAME] = str(panier_id)
        r = self.client.get("/api/panier/")
        self.assertEqual(r.json()["lignes"], [])
        self.assertNotEqual(r.cookies[services.COOKIE_NAME].value, str(panier_id))

    def test_cookie_invalide_donne_un_panier_vide(self):
        self.client.cookies[services.COOKIE_NAME] = "pas-un-uuid"
        r = self.client.get("/api/panier/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["lignes"], [])
        uuid.UUID(r.cookies[services.COOKIE_NAME].value)

    def test_deux_visiteurs_ont_des_paniers_distincts(self):
        a = self.client.get("/api/panier/").cookies[services.COOKIE_NAME].value
        self.client.cookies.clear()
        b = self.client.get("/api/panier/").cookies[services.COOKIE_NAME].value
        self.assertNotEqual(a, b)

    def test_enregistrer_prolonge_l_expiration(self):
        panier_id = services.creer_vide()
        with mock.patch.object(cache, "set") as spy:
            services.enregistrer(panier_id, {"lignes": []})
        spy.assert_called_once_with(f"panier:{panier_id}", {"lignes": []}, timeout=259200)

    def test_tva_en_entiers(self):
        self.assertEqual(services.tva_incluse(0), 0)
        self.assertEqual(services.tva_incluse(124000), 9291)
        self.assertIsInstance(services.tva_incluse(18000), int)
