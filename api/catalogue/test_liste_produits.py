from django.test import TestCase

from catalogue.models import Gamme, Media, Modele, Produit


class ListeProduitsTests(TestCase):
    def setUp(self):
        modele = Modele.objects.create(slug="lucerne", nom="Lucerne")
        self.classic = Gamme.objects.create(code="Classic", nom="Classic")
        premium = Gamme.objects.create(code="Premium", nom="Premium")
        self.c = Produit.objects.create(
            slug="lucerne-classic", prix_ttc_centimes=18000, modele=modele, gamme=self.classic
        )
        self.p = Produit.objects.create(
            slug="lucerne-premium", prix_ttc_centimes=124000, modele=modele, gamme=premium
        )
        autre = Modele.objects.create(slug="zoug", nom="Zoug")
        Produit.objects.create(
            slug="zoug-classic",
            prix_ttc_centimes=1,
            modele=autre,
            gamme=self.classic,
            actif=False,
        )
        Media.objects.create(produit=self.c, url="/media/b.jpg", alt="B", ordre=2)
        Media.objects.create(produit=self.c, url="/media/a.jpg", alt="A", ordre=1)

    def test_seuls_les_actifs_et_total(self):
        r = self.client.get("/api/produits/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 2)
        slugs = [p["slug"] for p in r.json()["results"]]
        self.assertNotIn("zoug-classic", slugs)

    def test_forme_de_la_reponse(self):
        r = self.client.get("/api/produits/?gamme=Classic")
        item = r.json()["results"][0]
        self.assertEqual(item["slug"], "lucerne-classic")
        self.assertEqual(item["modele"], "Lucerne")
        self.assertEqual(item["gamme"], "Classic")
        self.assertEqual(item["prix_ttc_centimes"], 18000)
        self.assertEqual(item["image_principale"], {"url": "/media/a.jpg", "alt": "A"})

    def test_sans_image(self):
        r = self.client.get("/api/produits/?gamme=Premium")
        self.assertIsNone(r.json()["results"][0]["image_principale"])

    def test_filtre_gamme(self):
        r = self.client.get("/api/produits/?gamme=Premium")
        self.assertEqual(r.json()["count"], 1)
        self.assertEqual(r.json()["results"][0]["slug"], "lucerne-premium")

    def test_gamme_inconnue(self):
        r = self.client.get("/api/produits/?gamme=Luxe")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["erreur"]["code"], "validation")

    def test_pagination_24(self):
        for i in range(30):
            m = Modele.objects.create(slug=f"m{i}", nom=f"M{i}")
            Produit.objects.create(
                slug=f"m{i}-c", prix_ttc_centimes=1, modele=m, gamme=self.classic
            )
        r = self.client.get("/api/produits/").json()
        self.assertEqual(r["count"], 32)
        self.assertEqual(len(r["results"]), 24)
        self.assertIsNotNone(r["next"])
        self.assertEqual(len(self.client.get("/api/produits/?page=2").json()["results"]), 8)

    def test_mis_en_avant_seuls_actifs_et_mis_en_avant(self):
        Produit.objects.filter(pk=self.c.pk).update(mis_en_avant=True)
        autre = Modele.objects.create(slug="berne", nom="Berne")
        Produit.objects.create(
            slug="berne-classic",
            prix_ttc_centimes=1,
            modele=autre,
            gamme=self.classic,
            actif=False,
            mis_en_avant=True,
        )
        r = self.client.get("/api/produits/?mis_en_avant=true")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 1)
        self.assertEqual(r.json()["results"][0]["slug"], "lucerne-classic")

    def test_mis_en_avant_aucun(self):
        r = self.client.get("/api/produits/?mis_en_avant=true")
        self.assertEqual(r.json()["count"], 0)

    def test_nombre_de_requetes_constant(self):
        # count + produits (avec modele et gamme) + medias préchargés
        with self.assertNumQueries(3):
            self.client.get("/api/produits/")
