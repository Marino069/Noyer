from datetime import UTC, datetime, timedelta

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from commande.models import Commande
from commande.services import annuler_commandes_abandonnees
from commande.test_passer_commande import CORPS, LOCMEM
from config.factories import creer_catalogue
from inventaire.models import Piece, Reservation

from .models import TransactionPaiement
from .services import ajouter_jours_ouvres

IBAN = "CH9300762011623852957"


@override_settings(
    CACHES=LOCMEM, VIREMENT_IBAN=IBAN, VIREMENT_BENEFICIAIRE="Noyer", VIREMENT_DELAI_JOURS=5
)
class VirementTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cat = creer_catalogue()

    def commander(self, *produits):
        for produit, corps in produits:
            corps = {"produit_slug": produit.slug, "quantite": 1, **corps}
            self.client.post("/api/panier/lignes/", corps, content_type="application/json")
        r = self.client.post("/api/commandes/", CORPS, content_type="application/json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()["reference"]

    def virement(self, reference):
        return self.client.post(
            f"/api/commandes/{reference}/paiement/",
            {"methode": "virement"},
            content_type="application/json",
        )

    def test_classic_seul_refuse(self):
        reference = self.commander((self.cat["classic"], {}))
        r = self.virement(reference)
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()["erreur"]["code"], "virement_indisponible")
        self.assertFalse(TransactionPaiement.objects.exists())

    def test_premium_renvoie_coordonnees_et_prolonge(self):
        reference = self.commander((self.cat["premium"], {"numero": 2}))
        with self.captureOnCommitCallbacks(execute=True):
            r = self.virement(reference)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(
            r.json(),
            {
                "methode": "virement",
                "iban": IBAN,
                "beneficiaire": "Noyer",
                "reference": reference,
                "delai_jours": 5,
            },
        )
        t = TransactionPaiement.objects.get()
        self.assertEqual(t.methode, "Virement")
        self.assertEqual(t.statut, "Creee")
        self.assertEqual(t.montant_centimes, Commande.objects.get().total_ttc_centimes)
        reservation = Reservation.objects.get()
        self.assertGreater(reservation.expire_le, timezone.now() + timedelta(days=6))
        self.assertEqual(len(mail.outbox), 1)

    def test_panier_mixte_accepte(self):
        reference = self.commander(
            (self.cat["premium"], {"numero": 2}), (self.cat["classic"], {})
        )
        self.assertEqual(self.virement(reference).status_code, 201)

    def test_second_appel_ne_prolonge_pas(self):
        reference = self.commander((self.cat["premium"], {"numero": 2}))
        self.virement(reference)
        limite = Reservation.objects.get().expire_le
        self.assertEqual(self.virement(reference).status_code, 201)
        self.assertEqual(Reservation.objects.get().expire_le, limite)
        self.assertEqual(TransactionPaiement.objects.count(), 1)

    def test_sans_validation_dans_le_delai_commande_annulee_piece_liberee(self):
        reference = self.commander((self.cat["premium"], {"numero": 2}))
        self.virement(reference)
        Reservation.objects.update(expire_le=timezone.now() - timedelta(minutes=1))
        self.assertEqual(annuler_commandes_abandonnees(), 1)
        self.assertEqual(Commande.objects.get().statut, Commande.Statut.ANNULEE)
        self.assertEqual(Piece.objects.get(numero=2).statut, Piece.Statut.DISPONIBLE)
        self.assertEqual(TransactionPaiement.objects.get().statut, "Echouee")

    def test_virement_encore_dans_le_delai_non_annule(self):
        reference = self.commander((self.cat["premium"], {"numero": 2}))
        self.virement(reference)
        self.assertEqual(annuler_commandes_abandonnees(), 0)
        self.assertEqual(Commande.objects.get().statut, Commande.Statut.EN_ATTENTE)

    def test_commande_annulee_ou_payee_refusee(self):
        reference = self.commander((self.cat["premium"], {"numero": 2}))
        Commande.objects.update(statut=Commande.Statut.ANNULEE)
        r = self.virement(reference)
        self.assertEqual((r.status_code, r.json()["erreur"]["code"]), (409, "commande_annulee"))
        Commande.objects.update(statut=Commande.Statut.PAYEE)
        r = self.virement(reference)
        self.assertEqual((r.status_code, r.json()["erreur"]["code"]), (409, "deja_payee"))

    def test_reservation_expiree_410(self):
        reference = self.commander((self.cat["premium"], {"numero": 2}))
        Reservation.objects.update(expire_le=timezone.now() - timedelta(minutes=1))
        r = self.virement(reference)
        self.assertEqual(r.status_code, 410)

    def test_reference_inconnue_404(self):
        self.assertEqual(self.virement("NOY-2026-99999").status_code, 404)

    @override_settings(VIREMENT_IBAN="")
    def test_iban_non_configure_502(self):
        reference = self.commander((self.cat["premium"], {"numero": 2}))
        self.assertEqual(self.virement(reference).status_code, 502)


class JoursOuvresTests(TestCase):
    def test_saute_les_week_ends(self):
        vendredi = datetime(2026, 11, 6, 10, 0, tzinfo=UTC)
        self.assertEqual(ajouter_jours_ouvres(vendredi, 5), vendredi + timedelta(days=7))
        mercredi = datetime(2026, 11, 4, 10, 0, tzinfo=UTC)
        self.assertEqual(ajouter_jours_ouvres(mercredi, 5), mercredi + timedelta(days=7))
        lundi = datetime(2026, 11, 2, 10, 0, tzinfo=UTC)
        self.assertEqual(ajouter_jours_ouvres(lundi, 5), lundi + timedelta(days=7))
        self.assertEqual(ajouter_jours_ouvres(lundi, 4), lundi + timedelta(days=4))
