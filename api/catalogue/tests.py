from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase

from catalogue.models import Gamme, Modele, Produit


class MisEnAvantTests(TestCase):
    def test_defaut_faux(self):
        modele = Modele.objects.create(slug="lampe", nom="Lampe")
        gamme = Gamme.objects.create(code="Classic", nom="Classic")
        produit = Produit.objects.create(
            slug="lampe-classic", prix_ttc_centimes=12000, modele=modele, gamme=gamme
        )
        produit.refresh_from_db()
        self.assertFalse(produit.mis_en_avant)

    def test_modifiable(self):
        modele = Modele.objects.create(slug="lampe", nom="Lampe")
        gamme = Gamme.objects.create(code="Classic", nom="Classic")
        produit = Produit.objects.create(
            slug="lampe-classic", prix_ttc_centimes=12000, modele=modele, gamme=gamme
        )
        produit.mis_en_avant = True
        produit.save()
        self.assertTrue(Produit.objects.get(pk=produit.pk).mis_en_avant)


class MigrationMisEnAvantTests(TransactionTestCase):
    """La migration s'applique sur une base existante sans perte de données."""

    def test_migration_conserve_les_donnees(self):
        executor = MigrationExecutor(connection)
        executor.migrate([("catalogue", "0001_initial")])
        apps = executor.loader.project_state([("catalogue", "0001_initial")]).apps
        modele = apps.get_model("catalogue", "Modele").objects.create(slug="m", nom="M")
        gamme = apps.get_model("catalogue", "Gamme").objects.create(code="Classic", nom="C")
        produit = apps.get_model("catalogue", "Produit").objects.create(
            slug="p", prix_ttc_centimes=9900, modele=modele, gamme=gamme
        )

        executor = MigrationExecutor(connection)
        executor.migrate([("catalogue", "0002_produit_mis_en_avant")])
        apps = executor.loader.project_state([("catalogue", "0002_produit_mis_en_avant")]).apps
        apres = apps.get_model("catalogue", "Produit").objects.get(pk=produit.pk)
        self.assertEqual(apres.slug, "p")
        self.assertEqual(apres.prix_ttc_centimes, 9900)
        self.assertFalse(apres.mis_en_avant)
