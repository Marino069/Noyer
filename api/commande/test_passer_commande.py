from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation, StockClassic
from inventaire.services import expirer_reservations
from panier import services

from .models import Adresse, Commande, LigneCommande

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

ADRESSE = {"nom": "Anne Dupont", "rue": "Rue du Lac 1", "npa": "1204", "localite": "Genève", "pays": "CH"}
CORPS = {
    "email": "client@exemple.ch",
    "adresse_livraison": ADRESSE,
    "adresse_facturation": None,
    "mode_livraison": "livraison",
    "cgv_acceptees": True,
}


@override_settings(CACHES=LOCMEM, TVA_TAUX_CENTIEMES=810, FRAIS_LIVRAISON_CENTIMES=1500)
class PasserCommandeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cat = creer_catalogue()

    def ajouter(self, produit, quantite=1, numero=None):
        corps = {"produit_slug": produit.slug, "quantite": quantite}
        if numero:
            corps["numero"] = numero
        r = self.client.post("/api/panier/lignes/", corps, content_type="application/json")
        self.assertEqual(r.status_code, 201, r.content)

    def commander(self, **surcharge):
        return self.client.post(
            "/api/commandes/", {**CORPS, **surcharge}, content_type="application/json"
        )

    def test_commande_creee(self):
        self.ajouter(self.cat["classic"], 2)
        self.ajouter(self.cat["premium"], numero=2)
        r = self.commander()
        self.assertEqual(r.status_code, 201, r.content)
        commande = Commande.objects.get()
        annee = timezone.now().year
        self.assertEqual(
            r.json(),
            {"reference": f"NOY-{annee}-00001", "statut": "EnAttente", "total_centimes": 85500},
        )
        self.assertEqual(commande.frais_livraison_centimes, 1500)
        self.assertEqual(str(commande.taux_tva), "8.10")
        self.assertEqual(commande.client_email, "client@exemple.ch")
        lignes = {ligne.nom_produit: ligne for ligne in commande.lignes.all()}
        premium = lignes["Lampe test Premium"]
        self.assertEqual(premium.piece.numero, 2)
        self.assertEqual(premium.gamme, "Premium")
        self.assertEqual(lignes["Lampe test Classic"].quantite, 2)
        self.assertIsNone(lignes["Lampe test Classic"].piece)

    def test_adresse_facturation_par_defaut_et_explicite(self):
        self.ajouter(self.cat["classic"])
        self.commander()
        c = Commande.objects.get()
        self.assertEqual(c.adresses.get(type=Adresse.Type.FACTURATION).rue, ADRESSE["rue"])
        self.assertEqual(c.adresses.count(), 2)

    def test_adresse_facturation_distincte(self):
        self.ajouter(self.cat["classic"])
        fact = {**ADRESSE, "rue": "Rue du Rhône 9", "npa": "1201"}
        self.commander(adresse_facturation=fact)
        c = Commande.objects.get()
        self.assertEqual(c.adresses.get(type=Adresse.Type.FACTURATION).rue, "Rue du Rhône 9")
        self.assertEqual(c.adresses.get(type=Adresse.Type.LIVRAISON).rue, ADRESSE["rue"])

    def test_retrait_atelier_sans_frais(self):
        self.ajouter(self.cat["classic"])
        r = self.commander(mode_livraison="retrait_atelier")
        self.assertEqual(r.json()["total_centimes"], 18000)

    def test_reservations_prolongees_de_30_minutes(self):
        self.ajouter(self.cat["classic"])
        avant = timezone.now()
        self.commander()
        r = Reservation.objects.get()
        self.assertEqual(r.statut, Reservation.Statut.ACTIVE)
        self.assertGreaterEqual(r.expire_le, avant + timedelta(minutes=29, seconds=50))

    def test_panier_vide_apres_commande(self):
        self.ajouter(self.cat["classic"])
        self.commander()
        self.assertEqual(self.client.get("/api/panier/").json()["lignes"], [])
        self.assertEqual(self.commander().status_code, 422)
        self.assertEqual(Commande.objects.count(), 1)

    def test_reservation_expiree_410_sans_commande(self):
        self.ajouter(self.cat["classic"])
        Reservation.objects.update(expire_le=timezone.now() - timedelta(minutes=1))
        r = self.commander()
        self.assertEqual(r.status_code, 410)
        self.assertEqual(r.json()["erreur"]["code"], "reservation_expiree")
        self.assertEqual(Commande.objects.count(), 0)
        self.assertEqual(LigneCommande.objects.count(), 0)

    def test_reservation_deja_expiree_par_le_worker_410(self):
        self.ajouter(self.cat["premium"], numero=1)
        Reservation.objects.update(expire_le=timezone.now() - timedelta(minutes=1))
        expirer_reservations()
        r = self.commander()
        self.assertEqual(r.status_code, 410)
        self.assertEqual(Commande.objects.count(), 0)

    def test_une_reservation_expiree_annule_tout(self):
        self.ajouter(self.cat["classic"])
        self.ajouter(self.cat["premium"], numero=1)
        Reservation.objects.filter(piece__isnull=False).update(
            expire_le=timezone.now() - timedelta(minutes=1)
        )
        self.assertEqual(self.commander().status_code, 410)
        self.assertEqual(Commande.objects.count(), 0)
        # la réservation encore valide n'est pas prolongée
        self.assertLess(
            Reservation.objects.get(piece__isnull=True).expire_le,
            timezone.now() + timedelta(minutes=20),
        )

    def test_prix_figes_si_le_catalogue_change(self):
        self.ajouter(self.cat["premium"], numero=1)
        self.commander()
        produit = self.cat["premium"]
        produit.prix_ttc_centimes = 99900
        produit.save()
        ligne = LigneCommande.objects.get()
        self.assertEqual(ligne.prix_unitaire_centimes, 48000)
        self.assertEqual(Commande.objects.get().total_ttc_centimes, 49500)
        produit.modele.nom = "Renommée"
        produit.modele.save()
        ligne.refresh_from_db()
        self.assertEqual(ligne.nom_produit, "Lampe test Premium")

    def test_references_uniques_et_sequentielles(self):
        for _ in range(3):
            self.client.cookies.clear()
            self.ajouter(self.cat["classic"])
            self.assertEqual(self.commander().status_code, 201)
        refs = list(Commande.objects.order_by("id").values_list("reference", flat=True))
        annee = timezone.now().year
        self.assertEqual(refs, [f"NOY-{annee}-0000{n}" for n in (1, 2, 3)])
        self.assertEqual(len(set(refs)), 3)

    def test_stock_et_piece_restent_reserves(self):
        self.ajouter(self.cat["classic"], 2)
        self.ajouter(self.cat["premium"], numero=3)
        self.commander()
        self.assertEqual(StockClassic.objects.get().quantite_reservee, 2)
        self.assertEqual(Piece.objects.get(numero=3).statut, Piece.Statut.RESERVEE)

    def test_prix_envoye_par_le_front_ignore(self):
        self.ajouter(self.cat["classic"])
        r = self.commander(total_centimes=1, prix_unitaire_centimes=1)
        self.assertEqual(r.json()["total_centimes"], 19500)

    def test_validations(self):
        self.ajouter(self.cat["classic"])
        cas = {
            "email": {"email": "pas-un-email"},
            "npa trop court": {"adresse_livraison": {**ADRESSE, "npa": "120"}},
            "npa lettres": {"adresse_livraison": {**ADRESSE, "npa": "12AB"}},
            "npa facturation": {"adresse_facturation": {**ADRESSE, "npa": "12045"}},
            "cgv refusées": {"cgv_acceptees": False},
            "mode inconnu": {"mode_livraison": "drone"},
        }
        for nom, surcharge in cas.items():
            with self.subTest(nom):
                r = self.commander(**surcharge)
                self.assertIn(r.status_code, (400, 422))
                self.assertEqual(r.json()["erreur"]["code"], "validation")
        r = self.client.post(
            "/api/commandes/",
            {k: v for k, v in CORPS.items() if k != "cgv_acceptees"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Commande.objects.count(), 0)

    def test_sans_panier_422(self):
        r = self.commander()
        self.assertEqual(r.status_code, 422)
        self.assertEqual(Commande.objects.count(), 0)

    def test_cookie_panier_conserve_son_identifiant(self):
        self.ajouter(self.cat["classic"])
        panier_id = self.client.cookies[services.COOKIE_NAME].value
        self.commander()
        self.assertEqual(self.client.cookies[services.COOKIE_NAME].value, panier_id)
