from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase

from catalogue.admin import GammeAdmin, ProduitAdmin
from catalogue.models import Gamme, Matiere, Media, Modele, Produit


class AdminCatalogueTests(TestCase):
    def setUp(self):
        self.base = "/" + settings.ADMIN_URL + "catalogue/"
        utilisateur = get_user_model().objects.create_superuser(
            "atelier", "a@noyer.ch", "mdp-solide-42"
        )
        self.client.force_login(
            utilisateur, backend="django.contrib.auth.backends.ModelBackend"
        )
        self.modele = Modele.objects.create(slug="lampe-a", nom="Lampe A")
        self.classic = Gamme.objects.create(code="Classic", nom="Classic")
        self.premium = Gamme.objects.create(code="Premium", nom="Premium")
        self.matiere = Matiere.objects.create(nom="Noyer")

    def donnees(self, **extra):
        data = {
            "modele": self.modele.pk,
            "gamme": self.classic.pk,
            "slug": "lampe-a-classic",
            "prix_chf": "180.50",
            "actif": "on",
            "caracteristiques": "",
            "produitmatiere_set-TOTAL_FORMS": 1,
            "produitmatiere_set-INITIAL_FORMS": 0,
            "produitmatiere_set-0-matiere": self.matiere.pk,
            "produitmatiere_set-0-role": "pied",
            "medias-TOTAL_FORMS": 1,
            "medias-INITIAL_FORMS": 0,
            "medias-0-url": "https://exemple.ch/a.jpg",
            "medias-0-alt": "Lampe A",
            "medias-0-ordre": 0,
        }
        data.update(extra)
        return data

    def creer(self, **extra):
        return self.client.post(self.base + "produit/add/", self.donnees(**extra))

    def test_creation_prix_en_centimes_avec_inlines(self):
        self.assertEqual(self.creer().status_code, 302)
        produit = Produit.objects.get(slug="lampe-a-classic")
        self.assertEqual(produit.prix_ttc_centimes, 18050)
        self.assertEqual(produit.produitmatiere_set.count(), 1)
        self.assertEqual(Media.objects.filter(produit=produit).count(), 1)

    def test_produit_actif_visible_dans_l_api(self):
        self.creer()
        reponse = self.client.get("/api/produits/")
        self.assertIn("lampe-a-classic", reponse.content.decode())

    def test_doublon_modele_gamme_refuse(self):
        self.creer()
        reponse = self.creer(slug="autre-slug")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(Produit.objects.count(), 1)

    def test_slug_non_modifiable_si_actif(self):
        self.creer()
        produit = Produit.objects.get()
        data = self.donnees(
            slug="pirate",
            **{
                "produitmatiere_set-INITIAL_FORMS": 1,
                "produitmatiere_set-0-id": produit.produitmatiere_set.get().pk,
                "produitmatiere_set-0-produit": produit.pk,
                "medias-INITIAL_FORMS": 1,
                "medias-0-id": produit.medias.get().pk,
                "medias-0-produit": produit.pk,
            },
        )
        self.client.post(self.base + f"produit/{produit.pk}/change/", data)
        produit.refresh_from_db()
        self.assertEqual(produit.slug, "lampe-a-classic")

    def test_mis_en_avant_editable_dans_la_liste(self):
        self.assertIn("mis_en_avant", ProduitAdmin.list_editable)

    def test_gamme_en_lecture_seule(self):
        admin_gamme = GammeAdmin(Gamme, None)
        self.assertFalse(admin_gamme.has_add_permission(None))
        self.assertFalse(admin_gamme.has_change_permission(None))
        self.assertFalse(admin_gamme.has_delete_permission(None))

    def test_pages_liste_accessibles(self):
        for chemin in ("modele/", "produit/", "matiere/", "gamme/"):
            self.assertEqual(self.client.get(self.base + chemin).status_code, 200, chemin)
