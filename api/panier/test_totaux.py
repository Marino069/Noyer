from types import SimpleNamespace

from django.test import SimpleTestCase, override_settings

from . import services

CLASSIC = SimpleNamespace(prix_ttc_centimes=18000)
PREMIUM = SimpleNamespace(prix_ttc_centimes=124000)


def ligne(produit, quantite=1):
    return {"produit": produit, "quantite": quantite}


@override_settings(TVA_TAUX_CENTIEMES=810, FRAIS_LIVRAISON_CENTIMES=1500)
class CalculerTotauxTests(SimpleTestCase):
    def test_classic_seul(self):
        t = services.calculer_totaux([ligne(CLASSIC, 2)], "livraison")
        self.assertEqual(t["sous_total_centimes"], 36000)
        self.assertEqual(t["frais_livraison_centimes"], 1500)
        self.assertEqual(t["total_centimes"], 37500)
        self.assertEqual(t["tva_incluse_centimes"], services.tva_incluse(37500))
        self.assertEqual(t["taux_tva"], "8.10")

    def test_premium_seul(self):
        t = services.calculer_totaux([ligne(PREMIUM)], "livraison")
        self.assertEqual(t["sous_total_centimes"], 124000)
        self.assertEqual(t["total_centimes"], 125500)

    def test_mixte(self):
        t = services.calculer_totaux([ligne(CLASSIC, 3), ligne(PREMIUM)], "livraison")
        self.assertEqual(t["sous_total_centimes"], 178000)
        self.assertEqual(t["total_centimes"], 179500)

    def test_retrait_atelier_sans_frais(self):
        t = services.calculer_totaux([ligne(CLASSIC), ligne(PREMIUM)], "retrait_atelier")
        self.assertEqual(t["frais_livraison_centimes"], 0)
        self.assertEqual(t["total_centimes"], t["sous_total_centimes"])
        self.assertEqual(t["total_centimes"], 142000)

    def test_panier_vide(self):
        t = services.calculer_totaux([], "livraison")
        self.assertEqual(t["total_centimes"], 0)
        self.assertEqual(t["frais_livraison_centimes"], 0)
        self.assertEqual(t["tva_incluse_centimes"], 0)

    def test_montants_entiers(self):
        t = services.calculer_totaux([ligne(CLASSIC, 3)], "livraison")
        for cle, valeur in t.items():
            if cle != "taux_tva":
                self.assertIs(type(valeur), int, cle)

    def test_taux_lu_dans_la_configuration(self):
        with override_settings(TVA_TAUX_CENTIEMES=770):
            t = services.calculer_totaux([ligne(CLASSIC)], "retrait_atelier")
        self.assertEqual(t["taux_tva"], "7.70")
        # 18000 * 770 / 10770 = 1286.9 -> 1287
        self.assertEqual(t["tva_incluse_centimes"], 1287)

    def test_mode_inconnu_refuse(self):
        with self.assertRaises(ValueError):
            services.calculer_totaux([ligne(CLASSIC)], "drone")
