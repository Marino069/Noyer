from django.test import TestCase

from catalogue.models import Gamme, Matiere, Media, Modele, Produit, ProduitMatiere


class FicheProduitTests(TestCase):
    def setUp(self):
        modele = Modele.objects.create(slug="lucerne", nom="Lucerne", description="Desc")
        classic = Gamme.objects.create(code="Classic", nom="Classic")
        premium = Gamme.objects.create(code="Premium", nom="Premium")
        self.c = Produit.objects.create(
            slug="lucerne-classic", prix_ttc_centimes=18000, modele=modele, gamme=classic
        )
        self.p = Produit.objects.create(
            slug="lucerne-premium",
            prix_ttc_centimes=124000,
            modele=modele,
            gamme=premium,
            caracteristiques={"hauteur_cm": 42},
        )
        noyer = Matiere.objects.create(nom="Noyer", entretien="Huiler.")
        ProduitMatiere.objects.create(produit=self.p, matiere=noyer, role="Pied")
        Media.objects.create(produit=self.p, url="/media/b.jpg", alt="B", ordre=2)
        Media.objects.create(produit=self.p, url="/media/a.jpg", alt="A", ordre=1)
        seul = Modele.objects.create(slug="zoug", nom="Zoug")
        Produit.objects.create(slug="zoug-classic", prix_ttc_centimes=1, modele=seul, gamme=classic)
        Produit.objects.create(
            slug="zoug-premium", prix_ttc_centimes=1, modele=seul, gamme=premium, actif=False
        )

    def test_forme_de_la_reponse(self):
        r = self.client.get("/api/produits/lucerne-premium/")
        self.assertEqual(r.status_code, 200)
        d = r.json()
        self.assertEqual(d["modele"], {"slug": "lucerne", "nom": "Lucerne", "description": "Desc"})
        self.assertEqual(d["gamme"], "Premium")
        self.assertEqual(d["prix_ttc_centimes"], 124000)
        self.assertEqual(d["caracteristiques"], {"hauteur_cm": 42})
        self.assertEqual(d["matieres"], [{"nom": "Noyer", "role": "Pied", "entretien": "Huiler."}])

    def test_slug_inexistant(self):
        self.assertEqual(self.client.get("/api/produits/nope/").status_code, 404)

    def test_produit_inactif(self):
        self.assertEqual(self.client.get("/api/produits/zoug-premium/").status_code, 404)

    def test_autre_gamme_dans_les_deux_sens(self):
        r = self.client.get("/api/produits/lucerne-classic/")
        self.assertEqual(r.json()["autre_gamme"], "lucerne-premium")
        r = self.client.get("/api/produits/lucerne-premium/")
        self.assertEqual(r.json()["autre_gamme"], "lucerne-classic")

    def test_autre_gamme_null_si_absente_ou_inactive(self):
        r = self.client.get("/api/produits/zoug-classic/")
        self.assertIsNone(r.json()["autre_gamme"])

    def test_medias_tries_par_ordre(self):
        r = self.client.get("/api/produits/lucerne-premium/")
        self.assertEqual([m["alt"] for m in r.json()["medias"]], ["A", "B"])
