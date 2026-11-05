from django.test import TestCase

from catalogue.models import Gamme, Media, Modele, Produit


class FicheModeleTests(TestCase):
    def setUp(self):
        classic = Gamme.objects.create(code="Classic", nom="Classic")
        premium = Gamme.objects.create(code="Premium", nom="Premium")
        lucerne = Modele.objects.create(slug="lucerne", nom="Lucerne", description="Desc")
        p = Produit.objects.create(
            slug="lucerne-classic", prix_ttc_centimes=18000, modele=lucerne, gamme=classic
        )
        Produit.objects.create(
            slug="lucerne-premium", prix_ttc_centimes=124000, modele=lucerne, gamme=premium
        )
        Media.objects.create(produit=p, url="/media/a.jpg", alt="A", ordre=1)
        zoug = Modele.objects.create(slug="zoug", nom="Zoug")
        Produit.objects.create(slug="zoug-classic", prix_ttc_centimes=1, modele=zoug, gamme=classic)
        Produit.objects.create(
            slug="zoug-premium", prix_ttc_centimes=1, modele=zoug, gamme=premium, actif=False
        )
        vide = Modele.objects.create(slug="vide", nom="Vide")
        Produit.objects.create(
            slug="vide-classic", prix_ttc_centimes=1, modele=vide, gamme=classic, actif=False
        )
        Modele.objects.create(slug="sans-produit", nom="Sans")

    def test_deux_versions(self):
        r = self.client.get("/api/modeles/lucerne/")
        self.assertEqual(r.status_code, 200)
        d = r.json()
        self.assertEqual(d["slug"], "lucerne")
        self.assertEqual(d["nom"], "Lucerne")
        self.assertEqual(d["description"], "Desc")
        self.assertEqual([p["gamme"] for p in d["produits"]], ["Classic", "Premium"])
        self.assertEqual(d["produits"][0]["image_principale"], {"url": "/media/a.jpg", "alt": "A"})
        self.assertIsNone(d["produits"][1]["image_principale"])

    def test_une_seule_version_active(self):
        d = self.client.get("/api/modeles/zoug/").json()
        self.assertEqual([p["slug"] for p in d["produits"]], ["zoug-classic"])

    def test_404_sans_produit_actif(self):
        self.assertEqual(self.client.get("/api/modeles/vide/").status_code, 404)
        self.assertEqual(self.client.get("/api/modeles/sans-produit/").status_code, 404)

    def test_404_slug_inconnu(self):
        r = self.client.get("/api/modeles/nope/")
        self.assertEqual(r.status_code, 404)
        self.assertIn("erreur", r.json())
