"""Actions de l'atelier sur une commande (B6-06) : virement reçu, expédiée.

Chaque action verrouille la commande et refuse les transitions impossibles
(ex. annulée → expédiée) avec TransitionImpossible.
"""

from django.db import transaction

from config.exceptions import TransitionImpossible

from . import emails
from .models import Commande


def marquer_virement_recu(commande_id) -> bool:
    """Confirme le virement d'une commande EnAttente (déclenche la vente, B5-03).

    Retourne False si l'article n'est plus disponible (commande à rembourser).
    """
    from paiement import vente
    from paiement.models import TransactionPaiement

    with transaction.atomic():
        commande = Commande.objects.select_for_update().get(pk=commande_id)
        if commande.statut != Commande.Statut.EN_ATTENTE:
            raise TransitionImpossible(
                f"Virement reçu impossible : la commande est {commande.get_statut_display()}."
            )
        paiement = (
            commande.transactions.select_for_update()
            .filter(
                methode=TransactionPaiement.Methode.VIREMENT,
                statut=TransactionPaiement.Statut.CREEE,
            )
            .first()
        )
        if paiement is None:
            raise TransitionImpossible("Aucun virement en attente pour cette commande.")
        paiement.statut = TransactionPaiement.Statut.CONFIRMEE
        paiement.save(update_fields=["statut", "date_modification"])
        return vente.confirmer_vente(commande)


def marquer_expediee(commande_id) -> None:
    """Passe une commande Payee en Expediee et prévient le client."""
    with transaction.atomic():
        commande = Commande.objects.select_for_update().get(pk=commande_id)
        if commande.statut != Commande.Statut.PAYEE:
            raise TransitionImpossible(
                f"Expédition impossible : la commande est {commande.get_statut_display()}."
            )
        commande.statut = Commande.Statut.EXPEDIEE
        commande.save(update_fields=["statut", "date_modification"])
        emails.envoyer_expedition(commande)
