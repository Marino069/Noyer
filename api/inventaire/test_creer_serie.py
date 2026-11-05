from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase

from catalogue.models import Gamme, Modele, Produit
from config.exceptions import DonneesInvalides
from inventaire.models import Piece, Serie
from inventaire.services import creer_serie


class CreerSerieTests(TestCase):
    def setUp(self):
        modele = Modele.objects.create(slug="lampe", nom="Lampe")
        classic = Gamme.objects.create(code="Classic", nom="Classic")
        premium = Gamme.objects.create(code="Premium", nom="Premium")
        self.classic = Produit.objects.create(
            slug="l-classic", prix_ttc_centimes=100, modele=modele, gamme=classic
        )
        self.premium = Produit.objects.create(
            slug="l-premium", prix_ttc_centimes=100, modele=modele, gamme=premium
        )

    def connecter(self):
        utilisateur = get_user_model().objects.create_superuser("a", "a@noyer.ch", "mdp-solide-42")
        self.client.force_login(utilisateur, backend="django.contrib.auth.backends.ModelBackend")
        return "/" + settings.ADMIN_URL + "catalogue/produit/"

    def test_serie_de_50_cree_pieces_1_a_50(self):
        serie = creer_serie(self.premium, 50)
        self.assertEqual(serie.taille_serie, 50)
        numeros = list(serie.pieces.order_by("numero").values_list("numero", flat=True))
        self.assertEqual(numeros, list(range(1, 51)))
        self.assertFalse(serie.pieces.exclude(statut=Piece.Statut.DISPONIBLE).exists())

    def test_impossible_pour_un_produit_classic(self):
        with self.assertRaises(DonneesInvalides):
            creer_serie(self.classic, 10)
        self.assertEqual(Serie.objects.count(), 0)
        self.assertEqual(Piece.objects.count(), 0)

    def test_taille_invalide(self):
        for taille in (0, -1, 1000, "5", True):
            with self.assertRaises(DonneesInvalides):
                creer_serie(self.premium, taille)
        self.assertEqual(Serie.objects.count(), 0)

    def test_action_admin(self):
        url = self.connecter()
        base = {"action": "creer_serie", "_selected_action": [self.premium.pk]}
        self.assertEqual(self.client.post(url, base).status_code, 200)
        self.assertEqual(Serie.objects.count(), 0)
        reponse = self.client.post(url, {**base, "confirmer": "1", "taille": 50})
        self.assertEqual(reponse.status_code, 302)
        self.assertEqual(Piece.objects.filter(serie__produit=self.premium).count(), 50)

    def test_action_admin_refusee_pour_classic(self):
        url = self.connecter()
        self.client.post(
            url,
            {
                "action": "creer_serie",
                "_selected_action": [self.classic.pk],
                "confirmer": "1",
                "taille": 5,
            },
        )
        self.assertEqual(Serie.objects.count(), 0)
