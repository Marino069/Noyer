from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import identify_hasher
from django.test import Client, TestCase

MOT_DE_PASSE = "mot-de-passe-solide-42"


class AdminSecuriteTests(TestCase):
    def setUp(self):
        self.url = "/" + settings.ADMIN_URL
        self.user = get_user_model().objects.create_superuser(
            "atelier", "atelier@noyer.ch", MOT_DE_PASSE
        )

    def echecs(self, client, nombre):
        for _ in range(nombre):
            client.post(self.url + "login/", {"username": "atelier", "password": "faux"})

    def test_admin_par_defaut_introuvable(self):
        self.assertNotEqual(settings.ADMIN_URL, "admin/")
        self.assertEqual(Client().get("/admin/").status_code, 404)

    def test_page_admin_exige_connexion(self):
        for chemin in ("", "auth/user/", "auth/group/"):
            reponse = Client().get(self.url + chemin)
            self.assertEqual(reponse.status_code, 302, chemin)
            self.assertIn("login", reponse["Location"])

    def test_connexion_valide_donne_acces(self):
        client = Client()
        reponse = client.post(
            self.url + "login/", {"username": "atelier", "password": MOT_DE_PASSE}
        )
        self.assertEqual(reponse.status_code, 302)
        self.assertEqual(client.get(self.url).status_code, 200)

    def test_hachage_argon2(self):
        self.assertEqual(identify_hasher(self.user.password).algorithm, "argon2")

    def test_cookies_httponly(self):
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertTrue(settings.CSRF_COOKIE_HTTPONLY)

    def test_blocage_apres_5_echecs(self):
        client = Client()
        self.echecs(client, 5)
        reponse = client.post(
            self.url + "login/", {"username": "atelier", "password": MOT_DE_PASSE}
        )
        self.assertEqual(reponse.status_code, 429)
        self.assertEqual(client.get(self.url).status_code, 302)

    def test_quatre_echecs_ne_bloquent_pas(self):
        client = Client()
        self.echecs(client, 4)
        reponse = client.post(
            self.url + "login/", {"username": "atelier", "password": MOT_DE_PASSE}
        )
        self.assertEqual(reponse.status_code, 302)
