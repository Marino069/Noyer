from django.core.cache import cache
from django.test import TestCase, override_settings

from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation, StockClassic

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
URL = "/api/panier/lignes/"


@override_settings(CACHES=LOCMEM)
class ModifierLigneTests(TestCase):
    def setUp(self):
        cache.clear()
        self.c = creer_catalogue()

    def ajouter(self, client=None, **corps):
        return (client or self.client).post(URL, corps, content_type="application/json")

    def patch(self, ligne_id, quantite, client=None):
        return (client or self.client).patch(
            f"{URL}{ligne_id}/", {"quantite": quantite}, content_type="application/json"
        )

    def reserve(self):
        return StockClassic.objects.get(produit=self.c["classic"]).quantite_reservee

    def test_modifier_la_quantite(self):
        ligne = self.ajouter(produit_slug="lampe-test-classic", quantite=1).json()["lignes"][0]
        r = self.patch(ligne["id"], 3)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["lignes"][0]["quantite"], 3)
        self.assertEqual(r.json()["total_centimes"], 54000)
        self.assertEqual(self.reserve(), 3)
        self.assertEqual(Reservation.objects.get().quantite, 3)

    def test_diminuer_libere_du_stock(self):
        ligne = self.ajouter(produit_slug="lampe-test-classic", quantite=4).json()["lignes"][0]
        self.patch(ligne["id"], 1)
        self.assertEqual(self.reserve(), 1)

    def test_depasser_le_stock_donne_409_et_ligne_inchangee(self):
        ligne = self.ajouter(produit_slug="lampe-test-classic", quantite=2).json()["lignes"][0]
        r = self.patch(ligne["id"], 6)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()["erreur"]["code"], "stock_insuffisant")
        panier = self.client.get("/api/panier/").json()
        self.assertEqual(panier["lignes"][0]["quantite"], 2)
        self.assertEqual(self.reserve(), 2)
        self.assertEqual(Reservation.objects.get().quantite, 2)

    def test_quantite_invalide(self):
        ligne = self.ajouter(produit_slug="lampe-test-classic").json()["lignes"][0]
        self.assertEqual(self.patch(ligne["id"], 0).status_code, 400)

    def test_premium_non_modifiable(self):
        ligne = self.ajouter(produit_slug="lampe-test-premium").json()["lignes"][0]
        self.assertEqual(self.patch(ligne["id"], 2).status_code, 400)

    def test_ligne_inconnue_donne_404(self):
        self.ajouter(produit_slug="lampe-test-classic")
        self.assertEqual(self.patch("inconnue", 2).status_code, 404)
        self.assertEqual(self.client.delete(f"{URL}inconnue/").status_code, 404)

    def test_retrait_libere_le_stock_immediatement(self):
        ligne = self.ajouter(produit_slug="lampe-test-classic", quantite=3).json()["lignes"][0]
        r = self.client.delete(f"{URL}{ligne['id']}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["lignes"], [])
        self.assertEqual(self.reserve(), 0)
        self.assertEqual(Reservation.objects.get().statut, Reservation.Statut.ANNULEE)

    def test_retrait_premium_rend_la_piece_aux_autres(self):
        ligne = self.ajouter(produit_slug="lampe-test-premium", numero=2).json()["lignes"][0]
        self.client.delete(f"{URL}{ligne['id']}/")
        self.assertEqual(Piece.objects.get(numero=2).statut, Piece.Statut.DISPONIBLE)
        autre = self.client.__class__()
        r = self.ajouter(autre, produit_slug="lampe-test-premium", numero=2)
        self.assertEqual(r.status_code, 201)

    def test_ligne_d_un_autre_panier_inaccessible(self):
        ligne = self.ajouter(produit_slug="lampe-test-classic").json()["lignes"][0]
        autre = self.client.__class__()
        self.assertEqual(autre.delete(f"{URL}{ligne['id']}/").status_code, 404)
        self.assertEqual(self.reserve(), 1)
