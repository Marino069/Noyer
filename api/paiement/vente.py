"""Confirmation de la vente après paiement (B5-03).

Tout passe à « vendu » dans une seule transaction : si une étape échoue, rien ne bouge.
Paiement arrivé après expiration : on vend si l'article est encore libre, sinon la commande
est marquée « à rembourser » et l'atelier est alerté.
"""

import logging

from django.db import transaction

from commande import emails
from commande.models import Commande
from inventaire import services as inventaire
from inventaire.models import Reservation

logger = logging.getLogger("noyer.api")


class VenteImpossible(Exception):
    """Un article n'est plus disponible : annule toute la vente en cours."""


def confirmer_vente(commande) -> bool:
    """Passe la commande payée en vendue. À appeler dans une transaction, commande verrouillée
    et transaction de paiement déjà `Confirmee`. Retourne False si un remboursement est requis."""
    if commande.statut in (Commande.Statut.PAYEE, Commande.Statut.EXPEDIEE):
        return True
    try:
        with transaction.atomic():  # savepoint : une vente partielle est entièrement annulée
            _vendre(commande)
    except VenteImpossible:
        commande.statut = Commande.Statut.ANNULEE
        commande.a_rembourser = True
        commande.save(update_fields=["statut", "a_rembourser", "date_modification"])
        emails.alerter_atelier_remboursement(commande)
        return False
    emails.envoyer_paiement_confirme(commande)
    return True


def _vendre(commande) -> None:
    reservations = Reservation.objects.select_for_update().filter(
        pk__in=commande.lignes.exclude(reservation=None).values("reservation_id")
    )
    reservations = list(reservations.order_by("pk"))
    if not reservations:
        raise VenteImpossible()
    for reservation in reservations:
        if not inventaire.vendre_apres_expiration(reservation):
            logger.error(
                "Réservation %s non vendable (commande %s)", reservation.pk, commande.reference
            )
            raise VenteImpossible()
    commande.statut = Commande.Statut.PAYEE
    commande.a_rembourser = False
    commande.save(update_fields=["statut", "a_rembourser", "date_modification"])
