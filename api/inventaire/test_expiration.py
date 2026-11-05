from datetime import timedelta
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from config.factories import creer_catalogue
from config.management.commands import run_worker, worker
from inventaire import services
from inventaire.models import Piece, Reservation
from inventaire.services import expirer_reservations, reserver


def _perimer(reservation, minutes=1):
    Reservation.objects.filter(pk=reservation.pk).update(
        expire_le=timezone.now() - timedelta(minutes=minutes)
    )


class ExpirationTests(TestCase):
    def setUp(self):
        self.d = creer_catalogue()

    def test_premium_expiree_et_piece_disponible(self):
        r = reserver(self.d["premium"], 1, "p", numero=2)
        _perimer(r)
        self.assertEqual(expirer_reservations(), 1)
        r.refresh_from_db()
        self.assertEqual(r.statut, Reservation.Statut.EXPIREE)
        r.piece.refresh_from_db()
        self.assertEqual(r.piece.statut, Piece.Statut.DISPONIBLE)

    def test_classic_expiree_et_stock_libere(self):
        r = reserver(self.d["classic"], 3, "p")
        _perimer(r)
        expirer_reservations()
        stock = self.d["classic"].stock
        stock.refresh_from_db()
        self.assertEqual(stock.quantite_reservee, 0)

    def test_reservation_non_echue_intacte(self):
        r = reserver(self.d["classic"], 1, "p")
        self.assertEqual(expirer_reservations(), 0)
        r.refresh_from_db()
        self.assertEqual(r.statut, Reservation.Statut.ACTIVE)

    def test_confirmee_et_annulee_intactes(self):
        a = reserver(self.d["premium"], 1, "a", numero=1)
        b = reserver(self.d["classic"], 1, "b")
        Reservation.objects.filter(pk=a.pk).update(statut=Reservation.Statut.CONFIRMEE)
        Reservation.objects.filter(pk=b.pk).update(statut=Reservation.Statut.ANNULEE)
        _perimer(a)
        _perimer(b)
        self.assertEqual(expirer_reservations(), 0)
        a.refresh_from_db()
        b.refresh_from_db()
        self.assertEqual(a.statut, Reservation.Statut.CONFIRMEE)
        self.assertEqual(b.statut, Reservation.Statut.ANNULEE)

    def test_une_erreur_n_empeche_pas_les_autres(self):
        a = reserver(self.d["premium"], 1, "a", numero=1)
        b = reserver(self.d["premium"], 1, "b", numero=2)
        _perimer(a, 5)
        _perimer(b, 1)
        vrai = services.liberer

        def liberer_capricieux(reservation, statut_final):
            if reservation.pk == a.pk:
                raise RuntimeError("boum")
            return vrai(reservation, statut_final)

        with (
            mock.patch.object(services, "liberer", liberer_capricieux),
            self.assertLogs("noyer.inventaire", level="ERROR"),
        ):
            self.assertEqual(expirer_reservations(), 1)
        a.refresh_from_db()
        b.refresh_from_db()
        self.assertEqual(a.statut, Reservation.Statut.ACTIVE)
        self.assertEqual(b.statut, Reservation.Statut.EXPIREE)

    def test_tache_du_worker_expire_les_reservations(self):
        r = reserver(self.d["classic"], 1, "p")
        _perimer(r)
        call_command("worker", "--une-fois")
        r.refresh_from_db()
        self.assertEqual(r.statut, Reservation.Statut.EXPIREE)
        self.assertIn("expirer_reservations", [nom for nom, _ in worker.TACHES])


class RunWorkerTests(TestCase):
    def test_planification_toutes_les_minutes(self):
        scheduler = run_worker.creer_scheduler()
        (job,) = scheduler.get_jobs()
        self.assertEqual(job.trigger.interval, timedelta(seconds=60))
        self.assertEqual(job.func, worker.executer_taches)
