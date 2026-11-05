import io
import shutil
import tempfile
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from catalogue.models import Gamme, Media, Modele, Produit

MEDIA_TMP = tempfile.mkdtemp(prefix="noyer-media-")


def png(largeur=2000, hauteur=1000):
    tampon = io.BytesIO()
    Image.new("RGB", (largeur, hauteur), "saddlebrown").save(tampon, format="PNG")
    return SimpleUploadedFile("lampe.png", tampon.getvalue(), content_type="image/png")


def version(media, largeur):
    return Path(settings.MEDIA_ROOT) / "produits" / (Path(media.fichier.name).stem + "-" + str(largeur) + ".webp")


@override_settings(MEDIA_ROOT=MEDIA_TMP)
class PhotosProduitTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TMP, ignore_errors=True)

    def setUp(self):
        utilisateur = get_user_model().objects.create_superuser(
            "atelier", "a@noyer.ch", "mdp-42-solide"
        )
        self.client.force_login(utilisateur, backend="django.contrib.auth.backends.ModelBackend")
        modele = Modele.objects.create(slug="lampe-a", nom="Lampe A")
        gamme = Gamme.objects.create(code="Classic", nom="Classic")
        self.produit = Produit.objects.create(
            slug="lampe-a-classic", prix_ttc_centimes=18000, modele=modele, gamme=gamme
        )

    def test_photo_televersee_existe_en_trois_tailles_webp(self):
        media = Media.objects.create(produit=self.produit, fichier=png(), alt="Lampe A")
        for largeur in (480, 960, 1600):
            with Image.open(version(media, largeur)) as image:
                self.assertEqual(image.format, "WEBP")
                self.assertEqual(image.width, largeur)
        self.assertEqual((media.largeur_origine, media.hauteur_origine), (2000, 1000))

    def test_pas_d_agrandissement_d_une_petite_image(self):
        media = Media.objects.create(produit=self.produit, fichier=png(600, 300), alt="Petite")
        with Image.open(version(media, 1600)) as image:
            self.assertEqual(image.width, 600)

    def test_api_expose_les_sources(self):
        Media.objects.create(produit=self.produit, fichier=png(), alt="Lampe A")
        image = self.client.get("/api/produits/lampe-a-classic/").json()["medias"][0]
        self.assertEqual([s["largeur"] for s in image["sources"]], [480, 960, 1600])
        self.assertTrue(image["sources"][0]["url"].endswith("-480.webp"))
        self.assertEqual(image["alt"], "Lampe A")

    def formulaire(self, fichier, alt="Lampe A"):
        return {
            "modele": self.produit.modele_id,
            "gamme": self.produit.gamme_id,
            "slug": "lampe-a-classic",
            "prix_chf": "180.00",
            "caracteristiques": "",
            "produitmatiere_set-TOTAL_FORMS": 0,
            "produitmatiere_set-INITIAL_FORMS": 0,
            "medias-TOTAL_FORMS": 1,
            "medias-INITIAL_FORMS": 0,
            "medias-0-fichier": fichier,
            "medias-0-alt": alt,
            "medias-0-ordre": 0,
            "medias-0-produit": self.produit.pk,
        }

    def envoyer(self, data):
        # Un produit actif a son slug en lecture seule (formulaire sans ce champ) ;
        # on édite donc un produit inactif.
        Produit.objects.filter(pk=self.produit.pk).update(actif=False)
        url = "/" + settings.ADMIN_URL + "catalogue/produit/" + str(self.produit.pk) + "/change/"
        return self.client.post(url, data)

    def test_fichier_non_image_refuse(self):
        faux = SimpleUploadedFile("note.txt", b"pas une image", content_type="text/plain")
        reponse = self.envoyer(self.formulaire(faux))
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(Media.objects.count(), 0)

    def test_image_corrompue_refusee(self):
        faux = SimpleUploadedFile("faux.png", b"\x89PNG pas vraiment", content_type="image/png")
        self.assertEqual(self.envoyer(self.formulaire(faux)).status_code, 200)
        self.assertEqual(Media.objects.count(), 0)

    def test_texte_alternatif_obligatoire(self):
        reponse = self.envoyer(self.formulaire(png(), alt=""))
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(Media.objects.count(), 0)

    def test_televersement_via_l_admin(self):
        self.assertEqual(self.envoyer(self.formulaire(png())).status_code, 302)
        self.assertTrue(Media.objects.get().sources())

    def test_suppression_efface_les_fichiers(self):
        media = Media.objects.create(produit=self.produit, fichier=png(), alt="x")
        stem = Path(media.fichier.name).stem
        media.delete()
        self.assertFalse(list(Path(settings.MEDIA_ROOT).glob("produits/" + stem + "*")))
