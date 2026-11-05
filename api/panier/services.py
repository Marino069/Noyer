"""Panier d'un visiteur, stocké dans Redis (clé ``panier:{uuid}``), sans modèle.

Le contenu stocké ne garde que des références (produit, quantité, pièce) : les prix sont
toujours recalculés depuis la base. Montants en centimes entiers.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Prefetch

from catalogue.models import Media, Produit

COOKIE_NAME = "noyer_panier"
DUREE = timedelta(days=3)
DUREE_SECONDES = int(DUREE.total_seconds())

MODE_LIVRAISON = "livraison"
MODE_RETRAIT_ATELIER = "retrait_atelier"
MODES_LIVRAISON = (MODE_LIVRAISON, MODE_RETRAIT_ATELIER)


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


def trouver_ligne(contenu: dict, ligne_id: str) -> dict | None:
    return next((x for x in contenu.get("lignes", []) if x["id"] == ligne_id), None)


def modifier_quantite(panier_id, contenu: dict, ligne: dict, quantite: int) -> dict:
    """Change la quantité d'une ligne Classic. StockInsuffisant (409) : ligne inchangée."""
    from inventaire.models import Reservation
    from inventaire.services import modifier_quantite as ajuster
    from inventaire.services import reserver

    reservation = Reservation.objects.filter(pk=ligne["reservation_id"]).first()
    mise_a_jour = ajuster(reservation, quantite) if reservation else None
    if mise_a_jour is None:
        # réservation expirée entre-temps : on réserve à nouveau la nouvelle quantité
        produit = Produit.objects.select_related("gamme").get(pk=ligne["produit_id"])
        mise_a_jour = reserver(produit, quantite, str(panier_id))
    ligne["quantite"] = mise_a_jour.quantite
    ligne["reservation_id"] = mise_a_jour.pk
    ligne["reservation_expire_le"] = mise_a_jour.expire_le.isoformat()
    enregistrer(panier_id, contenu)
    return contenu


def retirer_ligne(panier_id, contenu: dict, ligne: dict) -> dict:
    """Retire la ligne et libère sa réservation : l'article redevient disponible."""
    from inventaire.models import Reservation
    from inventaire.services import liberer

    reservation = Reservation.objects.filter(pk=ligne["reservation_id"]).first()
    if reservation is not None:
        liberer(reservation)
    contenu["lignes"] = [x for x in contenu["lignes"] if x["id"] != ligne["id"]]
    enregistrer(panier_id, contenu)
    return contenu


def taux_tva() -> str:
    """Taux de TVA lu dans la configuration, au format du contrat (« 8.10 »)."""
    centiemes = settings.TVA_TAUX_CENTIEMES
    return f"{centiemes // 100}.{centiemes % 100:02d}"


def tva_incluse(total_centimes: int) -> int:
    """TVA contenue dans un total TTC, arrondie au centime (calcul entier)."""
    taux = settings.TVA_TAUX_CENTIEMES
    base = 10000 + taux
    return (total_centimes * taux * 2 + base) // (2 * base)


def calculer_totaux(lignes, mode_livraison: str = MODE_LIVRAISON) -> dict:
    """Seul endroit qui calcule les montants du panier (centimes entiers, jamais de float).

    ``lignes`` : éléments portant ``produit`` (avec ``prix_ttc_centimes``) et ``quantite``,
    sous forme de dict ou d'objet. Le retrait à l'atelier est gratuit.
    """
    if mode_livraison not in MODES_LIVRAISON:
        raise ValueError(f"mode de livraison inconnu : {mode_livraison!r}")

    def lire(element, champ):
        return element[champ] if isinstance(element, dict) else getattr(element, champ)

    sous_total = sum(
        lire(lire(ligne, "produit"), "prix_ttc_centimes") * lire(ligne, "quantite")
        for ligne in lignes
    )
    frais = 0
    if mode_livraison == MODE_LIVRAISON and sous_total > 0:
        frais = settings.FRAIS_LIVRAISON_CENTIMES
    total = sous_total + frais
    return {
        "sous_total_centimes": sous_total,
        "frais_livraison_centimes": frais,
        "tva_incluse_centimes": tva_incluse(total),
        "taux_tva": taux_tva(),
        "total_centimes": total,
    }


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
    for ligne in brutes:
        produit = par_id.get(ligne["produit_id"])
        if produit is None:
            continue  # produit retiré de la vente depuis l'ajout
        quantite = ligne["quantite"]
        lignes.append(
            {
                "id": ligne["id"],
                "produit": produit,
                "quantite": quantite,
                "numero_piece": ligne.get("numero_piece"),
                "reservation_expire_le": ligne.get("reservation_expire_le"),
            }
        )
    return {"lignes": lignes, **calculer_totaux(lignes, MODE_LIVRAISON)}
