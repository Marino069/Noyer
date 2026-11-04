from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound

from config.exceptions import DonneesInvalides, PieceIndisponible, ReservationExpiree


@api_view(["GET"])
def v404(request):
    raise NotFound()


@api_view(["GET"])
def v409(request):
    raise PieceIndisponible()


@api_view(["GET"])
def v410(request):
    raise ReservationExpiree()


@api_view(["GET"])
def v422(request):
    raise DonneesInvalides()


@api_view(["GET"])
def v500(request):
    raise RuntimeError("secret technique : mot de passe base")


urlpatterns = [
    path("t/404/", v404),
    path("t/409/", v409),
    path("t/410/", v410),
    path("t/422/", v422),
    path("t/500/", v500),
]


@override_settings(ROOT_URLCONF="config.test_erreurs")
class FormatErreurTests(SimpleTestCase):
    def verifie(self, url, statut, code):
        self.client.raise_request_exception = False
        r = self.client.get(url)
        self.assertEqual(r.status_code, statut)
        corps = r.json()
        self.assertEqual(list(corps), ["erreur"])
        self.assertEqual(corps["erreur"]["code"], code)
        self.assertTrue(corps["erreur"]["message"])
        return r

    def test_404(self):
        self.verifie("/t/404/", 404, "introuvable")

    def test_409(self):
        self.verifie("/t/409/", 409, "piece_indisponible")

    def test_410(self):
        self.verifie("/t/410/", 410, "reservation_expiree")

    def test_422(self):
        self.verifie("/t/422/", 422, "validation")

    def test_500_sans_detail_technique_et_journalise(self):
        with self.assertLogs("noyer.api", level="ERROR") as logs:
            r = self.verifie("/t/500/", 500, "erreur_interne")
        self.assertNotIn("secret", r.content.decode())
        self.assertNotIn("RuntimeError", r.content.decode())
        self.assertIn("secret technique", "\n".join(logs.output))


class DocumentationEtCorsTests(TestCase):
    def test_schema_openapi(self):
        self.assertEqual(self.client.get("/api/schema/").status_code, 200)

    def test_documentation_consultable(self):
        self.assertEqual(self.client.get("/api/docs/").status_code, 200)

    def test_cors_front_autorise(self):
        r = self.client.get("/api/health/", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(r.headers.get("Access-Control-Allow-Origin"), "http://localhost:3000")

    def test_cors_autre_origine_refusee(self):
        r = self.client.get("/api/health/", headers={"Origin": "http://evil.example"})
        self.assertNotIn("Access-Control-Allow-Origin", r.headers)
