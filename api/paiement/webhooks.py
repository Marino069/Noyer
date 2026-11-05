"""Webhooks Stripe (B5-02) : seule source fiable pour savoir qu'un paiement a abouti.

Chaque événement est d'abord enregistré dans `Webhook` (clé = id d'événement Stripe, donc
anti-doublon), puis appliqué dans une transaction verrouillée. `traite` ne passe à True
qu'une fois l'événement appliqué : les autres restent identifiables en base.
"""

import logging

from django.db import IntegrityError, transaction

from commande import emails
from commande.models import Commande
from inventaire import services as inventaire
from inventaire.models import Reservation

from .models import TransactionPaiement, Webhook

logger = logging.getLogger("noyer.api")

EVENEMENTS = {
    "checkout.session.completed",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
}


def traiter_evenement(event) -> None:
    """Enregistre puis applique un événement Stripe. Un doublon déjà traité est ignoré."""
    # objet Stripe -> dict simple (sérialisable dans Webhook.payload)
    event = event.to_dict() if hasattr(event, "to_dict") else dict(event)
    if event["type"] not in EVENEMENTS:
        return
    session = event["data"]["object"]
    transaction_paiement = TransactionPaiement.objects.filter(
        ref_prestataire=session["id"], prestataire="stripe"
    ).first()
    if transaction_paiement is None:
        # Webhook.id_transaction est obligatoire : on ne peut rien enregistrer.
        logger.warning("Webhook Stripe %s : session %s inconnue", event["id"], session["id"])
        return

    webhook = _enregistrer(event, transaction_paiement)
    if webhook.traite:
        return  # doublon

    with transaction.atomic():
        applique = _appliquer(event["type"], session, transaction_paiement.pk)
        if applique:
            Webhook.objects.filter(pk=webhook.pk).update(traite=True)


def _enregistrer(event, transaction_paiement) -> Webhook:
    try:
        with transaction.atomic():
            webhook, _ = Webhook.objects.get_or_create(
                id_evenement=event["id"],
                defaults={"payload": event, "transaction": transaction_paiement},
            )
    except IntegrityError:
        webhook = Webhook.objects.get(pk=event["id"])
    return webhook


def _appliquer(type_evenement, session, transaction_id) -> bool:
    """Applique l'événement. Retourne False s'il doit rester « non traité » pour examen."""
    paiement = TransactionPaiement.objects.select_for_update().get(pk=transaction_id)
    commande = Commande.objects.select_for_update().get(pk=paiement.commande_id)

    if type_evenement == "checkout.session.completed":
        if session.get("payment_status") != "paid":
            return False  # paiement asynchrone pas encore abouti
        return _confirmer(paiement, commande, session)

    # async_payment_failed / expired
    if paiement.statut == TransactionPaiement.Statut.CONFIRMEE:
        logger.error("Webhook Stripe : échec reçu pour la transaction confirmée %s", paiement.pk)
        return False
    paiement.statut = TransactionPaiement.Statut.ECHOUEE
    paiement.save(update_fields=["statut", "date_modification"])
    return True


def _confirmer(paiement, commande, session) -> bool:
    if paiement.statut == TransactionPaiement.Statut.CONFIRMEE:
        return True
    if session.get("amount_total") != paiement.montant_centimes:
        logger.error("Webhook Stripe : montant inattendu pour la transaction %s", paiement.pk)
        return False

    paiement.statut = TransactionPaiement.Statut.CONFIRMEE
    paiement.save(update_fields=["statut", "date_modification"])

    if commande.statut != Commande.Statut.EN_ATTENTE:
        # payée après annulation : argent reçu, intervention manuelle nécessaire
        logger.error("Paiement reçu pour la commande %s (%s)", commande.reference, commande.statut)
        return False

    reservations = Reservation.objects.filter(
        pk__in=commande.lignes.exclude(reservation=None).values("reservation_id")
    )
    for reservation in reservations:
        if not inventaire.confirmer(reservation):
            logger.error(
                "Réservation %s non confirmable (commande %s)", reservation.pk, commande.reference
            )
    commande.statut = Commande.Statut.PAYEE
    commande.save(update_fields=["statut", "date_modification"])
    emails.envoyer_paiement_confirme(commande)
    return True
