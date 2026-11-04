from django.core.cache import cache
from django.test import TestCase, override_settings

from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation, StockClassic

from . import services

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
URL = "/api/panier/lignes/"


@override_settings(CACHES=LOCMEM)
class AjoutLigneTests(TestCase):
    def setUp(self):
        cache.clear()
        self.c = creer_catalogue()

    def ajouter(self, **corps):
        return self.client.post(URL, corps, content_type="application/json")

    def test_ajout_classic_renvoie_le_panier_et_l_expiration(self):
        r = self.ajouter(produit_slug="lampe-test-classic", quantite=2)
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertEqual(len(data["lignes"]), 1)
        ligne = data["lignes"][0]
        self.assertEqual(ligne["quantite"], 2)
        self.assertIsNone(ligne["numero_piece"])
        self.assertTrue(ligne["reservation_expire_le"])
        self.assertEqual(data["total_centimes"], 36000)
        self.assertTrue(r.cookies[services.COOKIE_NAME]["httponly"])
        stock = StockClassic.objects.get(produit=self.c["classic"])
        self.assertEqual(stock.quantite_reservee, 2)

    def test_reservation_liee_au_panier(self):
        r = self.ajouter(produit_slug="lampe-test-classic")
        reservation = Reservation.objects.get()
        self.assertEqual(reservation.panier_id, r.cookies[services.COOKIE_NAME].value)

    def test_premium_avec_numero_choisi(self):
        r = self.ajouter(produit_slug="lampe-test-premium", quantite=1, numero=2)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["lignes"][0]["numero_piece"], 2)
        self.assertEqual(Piece.objects.get(numero=2).statut, Piece.Statut.RESERVEE)

    def test_premium_sans_numero_prend_le_plus_petit(self):
        r = self.ajouter(produit_slug="lampe-test-premium")
        self.assertEqual(r.json()["lignes"][0]["numero_piece"], 1)

    def test_piece_deja_prise_donne_409_avec_message(self):
        self.assertEqual(self.ajouter(produit_slug="lampe-test-premium", numero=3).status_code, 201)
        self.client.cookies.clear()
        r = self.ajouter(produit_slug="lampe-test-premium", numero=3)
        self.assertEqual(r.status_code, 409)
        erreur = r.json()["erreur"]
        self.assertEqual(erreur["code"], "piece_indisponible")
        self.assertTrue(erreur["message"])

    def test_echec_ne_modifie_pas_le_panier(self):
        self.ajouter(produit_slug="lampe-test-premium", numero=3)
        autre = self.client.__class__()
        r = autre.post(
            URL,
            {"produit_slug": "lampe-test-premium", "numero": 3},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 409)
        self.assertEqual(autre.get("/api/panier/").json()["lignes"], [])

    def test_stock_classic_insuffisant_donne_409(self):
        r = self.ajouter(produit_slug="lampe-test-classic", quantite=6)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["erreur"]["code"], "stock_insuffisant")

    def test_premium_limite_a_une_piece_par_ligne(self):
        r = self.ajouter(produit_slug="lampe-test-premium", quantite=2)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["erreur"]["code"], "validation")
        self.assertIn("quantite", r.json()["erreur"]["details"])
        self.assertEqual(Reservation.objects.count(), 0)

    def test_le_prix_envoye_par_le_front_est_ignore(self):
        r = self.ajouter(
            produit_slug="lampe-test-classic", quantite=1, prix_ttc_centimes=1, total_centimes=1
        )
        self.assertEqual(r.json()["total_centimes"], 18000)
        contenu = cache.get(f"panier:{self.client.cookies[services.COOKIE_NAME].value}")
        self.assertNotIn("prix_ttc_centimes", contenu["lignes"][0])

    def test_produit_inconnu_donne_404(self):
        r = self.ajouter(produit_slug="nexiste-pas")
        self.assertEqual(r.status_code, 404)

    def test_donnees_invalides(self):
        self.assertEqual(self.ajouter(quantite=1).status_code, 400)
        self.assertEqual(self.ajouter(produit_slug="lampe-test-classic", quantite=0).status_code, 400)

    def test_ajouts_successifs_dans_le_meme_panier(self):
        self.ajouter(produit_slug="lampe-test-classic")
        r = self.ajouter(produit_slug="lampe-test-premium", numero=1)
        self.assertEqual(len(r.json()["lignes"]), 2)
        self.assertEqual(r.json()["total_centimes"], 18000 + 48000)
