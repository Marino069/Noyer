"""Données de test partagées (unittest et pytest) : un modèle, un produit Classic,
un produit Premium et une série de pièces."""

from catalogue.models import Gamme, Modele, Produit
from inventaire.models import Piece, Serie, StockClassic


def creer_catalogue():
    modele = Modele.objects.create(slug="lampe-test", nom="Lampe test")
    classic = Gamme.objects.create(code=Gamme.Code.CLASSIC, nom="Classic")
    premium = Gamme.objects.create(code=Gamme.Code.PREMIUM, nom="Premium")
    produit_classic = Produit.objects.create(
        slug="lampe-test-classic", prix_ttc_centimes=18000, modele=modele, gamme=classic
    )
    produit_premium = Produit.objects.create(
        slug="lampe-test-premium", prix_ttc_centimes=48000, modele=modele, gamme=premium
    )
    StockClassic.objects.create(produit=produit_classic, quantite_dispo=5)
    serie = Serie.objects.create(produit=produit_premium, taille_serie=3)
    pieces = [Piece.objects.create(serie=serie, numero=n) for n in (1, 2, 3)]
    return {
        "modele": modele,
        "classic": produit_classic,
        "premium": produit_premium,
        "serie": serie,
        "pieces": pieces,
    }
