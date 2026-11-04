from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.management import call_command
from django.test import SimpleTestCase

from config.management.commands import worker


class WorkerTests(SimpleTestCase):
    def test_un_passage_lance_les_taches(self):
        tache = mock.Mock()
        with mock.patch.object(worker, "TACHES", [("t", tache)]):
            call_command("worker", "--une-fois")
        tache.assert_called_once()

    def test_une_tache_en_echec_n_arrete_pas_les_autres(self):
        echec = mock.Mock(side_effect=RuntimeError("boum"))
        suite = mock.Mock()
        with (
            mock.patch.object(worker, "TACHES", [("a", echec), ("b", suite)]),
            self.assertLogs("noyer.worker", level="ERROR"),
        ):
            call_command("worker", "--une-fois")
        suite.assert_called_once()


class MediaTests(SimpleTestCase):
    def test_les_photos_sont_servies_depuis_media_root(self):
        racine = Path(settings.MEDIA_ROOT)
        racine.mkdir(parents=True, exist_ok=True)
        fichier = racine / "test-b0-06.txt"
        fichier.write_text("photo")
        try:
            reponse = self.client.get("/media/test-b0-06.txt")
            self.assertEqual(reponse.status_code, 200)
            self.assertEqual(b"".join(reponse.streaming_content), b"photo")
        finally:
            fichier.unlink()

    def test_photo_absente_renvoie_404(self):
        self.assertEqual(self.client.get("/media/inexistant.jpg").status_code, 404)
