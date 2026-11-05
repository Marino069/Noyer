"""Création d'une commande à partir du panier (B4-01).

Tout se passe dans une transaction, réservations verrouillées. Les prix sont relus depuis
la base puis copiés dans la commande : ils ne bougent plus si le catalogue change.
"""

from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from catalogue.models import Produit
from config.exceptions import DonneesInvalides, ReservationExpiree
from inventaire.models import Reservation
from panier import services as panier

from .models import Adresse, Commande, LigneCommande

DUREE_PAIEMENT = timedelta(minutes=30)
TENTATIVES_REFERENCE = 5


def _prochaine_reference(annee: int) -> str:
    prefixe = f"NOY-{annee}-"
    derniere = (
        Commande.objects.select_for_update()
        .filter(reference__startswith=prefixe)
        .order_by("-reference")
        .first()
    )
    numero = int(derniere.reference.rsplit("-", 1)[1]) + 1 if derniere else 1
    return f"{prefixe}{numero:05d}"


def _creer_commande(email, mode_livraison, totaux, annee) -> Commande:
    """Crée la commande avec une référence unique ; réessaie si deux commandes se croisent."""
    for _ in range(TENTATIVES_REFERENCE):
        try:
            with transaction.atomic():  # savepoint : l'IntegrityError ne casse pas l'englobante
                return Commande.objects.create(
                    reference=_prochaine_reference(annee),
                    client_email=email,
                    statut=Commande.Statut.EN_ATTENTE,
                    total_ttc_centimes=totaux["total_centimes"],
                    frais_livraison_centimes=totaux["frais_livraison_centimes"],
                    taux_tva=totaux["taux_tva"],
                )
        except IntegrityError:
            continue
    raise IntegrityError("Impossible de générer une référence de commande unique.")


def passer_commande(panier_id, contenu, donnees) -> Commande:
    """Transforme le panier en commande EnAttente.

    DonneesInvalides (422) : panier vide. ReservationExpiree (410) : une réservation n'est
    plus active, aucune commande n'est créée. Sinon les réservations sont prolongées de
    30 minutes (temps du paiement) et le panier est vidé.
    """
    lignes_panier = contenu.get("lignes", [])
    if not lignes_panier:
        raise DonneesInvalides("Votre panier est vide.")

    mode = donnees["mode_livraison"]
    with transaction.atomic():
        maintenant = timezone.now()
        reservations = {
            r.pk: r
            for r in Reservation.objects.select_for_update().filter(
                pk__in=[ligne["reservation_id"] for ligne in lignes_panier]
            )
        }
        for ligne in lignes_panier:
            r = reservations.get(ligne["reservation_id"])
            if r is None or r.statut != Reservation.Statut.ACTIVE or r.expire_le <= maintenant:
                raise ReservationExpiree()

        produits = {
            p.pk: p
            for p in Produit.objects.select_related("gamme", "modele").filter(
                pk__in=[ligne["produit_id"] for ligne in lignes_panier]
            )
        }
        a_commander = []
        for ligne in lignes_panier:
            produit = produits.get(ligne["produit_id"])
            if produit is None or not produit.actif:
                raise DonneesInvalides("Un article de votre panier n'est plus en vente.")
            a_commander.append(
                {
                    "produit": produit,
                    "quantite": ligne["quantite"],
                    "reservation": reservations[ligne["reservation_id"]],
                }
            )

        totaux = panier.calculer_totaux(a_commander, mode)
        commande = _creer_commande(donnees["email"], mode, totaux, maintenant.year)

        for element in a_commander:
            produit, reservation = element["produit"], element["reservation"]
            LigneCommande.objects.create(
                commande=commande,
                produit=produit,
                nom_produit=_nom(produit),
                gamme=produit.gamme.nom,
                prix_unitaire_centimes=produit.prix_ttc_centimes,
                quantite=element["quantite"],
                piece_id=reservation.piece_id,
            )
            reservation.expire_le = maintenant + DUREE_PAIEMENT
            reservation.save(update_fields=["expire_le"])

        livraison = donnees["adresse_livraison"]
        Adresse.objects.create(commande=commande, type=Adresse.Type.LIVRAISON, **livraison)
        facturation = donnees.get("adresse_facturation") or livraison
        Adresse.objects.create(commande=commande, type=Adresse.Type.FACTURATION, **facturation)

    panier.enregistrer(panier_id, {"lignes": []})
    return commande


def _nom(produit) -> str:
    return f"{produit.modele.nom} {produit.gamme.nom}"
