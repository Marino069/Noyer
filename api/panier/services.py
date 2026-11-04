"""Panier d'un visiteur, stocké dans Redis (clé ``panier:{uuid}``), sans modèle.

Le contenu stocké ne garde que des références (produit, quantité, pièce) : les prix sont
toujours recalculés depuis la base. Montants en centimes entiers.
"""

import uuid
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Prefetch

from catalogue.models import Media, Produit

COOKIE_NAME = "noyer_panier"
DUREE = timedelta(days=3)
DUREE_SECONDES = int(DUREE.total_seconds())

# TVA suisse 8,1 % : taux en centièmes de pour cent, pour rester en entiers
TAUX_TVA_CENTIEMES = 810
TAUX_TVA = "8.10"
FRAIS_LIVRAISON_CENTIMES = 0


def cle(panier_id) -> str:
    return f"panier:{panier_id}"


def identifiant_valide(valeur) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(valeur))
    except (ValueError, AttributeError, TypeError):
        return None


def charger(panier_id) -> dict | None:
    """Contenu du panier, ou None s'il n'existe pas (ou plus) dans Redis."""
    return cache.get(cle(panier_id))


def enregistrer(panier_id, contenu: dict) -> None:
    """Écrit le panier et prolonge son expiration de 3 jours (à chaque modification)."""
    cache.set(cle(panier_id), contenu, timeout=DUREE_SECONDES)


def creer_vide() -> uuid.UUID:
    panier_id = uuid.uuid4()
    enregistrer(panier_id, {"lignes": []})
    return panier_id


def ouvrir(valeur_cookie) -> tuple[uuid.UUID, dict, bool]:
    """Retrouve le panier du cookie ; en crée un vide si absent, invalide ou expiré.

    Retourne (identifiant, contenu, nouveau).
    """
    panier_id = identifiant_valide(valeur_cookie)
    if panier_id is not None:
        contenu = charger(panier_id)
        if contenu is not None:
            return panier_id, contenu, False
    panier_id = creer_vide()
    return panier_id, {"lignes": []}, True


def ajouter_ligne(panier_id, contenu: dict, produit, quantite: int, numero=None) -> dict:
    """Réserve l'article (B2-02) puis l'ajoute au panier. Le prix n'est jamais stocké.

    PieceIndisponible / StockInsuffisant (409) : le panier n'est pas modifié.
    """
    from inventaire.services import reserver

    reservation = reserver(produit, quantite, str(panier_id), numero)
    contenu.setdefault("lignes", []).append(
        {
            "id": uuid.uuid4().hex[:8],
            "produit_id": produit.pk,
            "quantite": reservation.quantite,
            "numero_piece": reservation.piece.numero if reservation.piece_id else None,
            "reservation_id": reservation.pk,
            "reservation_expire_le": reservation.expire_le.isoformat(),
        }
    )
    enregistrer(panier_id, contenu)
    return contenu


def tva_incluse(total_centimes: int) -> int:
    """TVA contenue dans un total TTC, arrondie au centime (calcul entier)."""
    base = 10000 + TAUX_TVA_CENTIEMES
    return (total_centimes * TAUX_TVA_CENTIEMES * 2 + base) // (2 * base)


def resume(contenu: dict) -> dict:
    """Lignes détaillées et totaux, prix relus depuis la base."""
    brutes = contenu.get("lignes", [])
    produits = Produit.objects.filter(
        actif=True, pk__in=[ligne["produit_id"] for ligne in brutes]
    ).select_related("modele", "gamme").prefetch_related(
        Prefetch("medias", queryset=Media.objects.order_by("ordre", "id"))
    )
    par_id = {p.pk: p for p in produits}

    lignes = []
    sous_total = 0
    for ligne in brutes:
        produit = par_id.get(ligne["produit_id"])
        if produit is None:
            continue  # produit retiré de la vente depuis l'ajout
        quantite = ligne["quantite"]
        sous_total += produit.prix_ttc_centimes * quantite
        lignes.append(
            {
                "id": ligne["id"],
                "produit": produit,
                "quantite": quantite,
                "numero_piece": ligne.get("numero_piece"),
                "reservation_expire_le": ligne.get("reservation_expire_le"),
            }
        )
    total = sous_total + FRAIS_LIVRAISON_CENTIMES
    return {
        "lignes": lignes,
        "sous_total_centimes": sous_total,
        "frais_livraison_centimes": FRAIS_LIVRAISON_CENTIMES,
        "tva_incluse_centimes": tva_incluse(total),
        "taux_tva": TAUX_TVA,
        "total_centimes": total,
    }
