import logging
from datetime import timedelta

import stripe
from django.conf import settings
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from commande import emails
from commande.models import Commande
from config.exceptions import (
    CommandeAnnulee,
    DejaPayee,
    PaiementIndisponible,
    ReservationExpiree,
    VirementIndisponible,
)
from inventaire.models import Reservation

from .models import TransactionPaiement

logger = logging.getLogger("noyer.api")


def creer_session_stripe(reference):
    """Crée une session Stripe Checkout pour une commande EnAttente et renvoie son URL.

    Le montant est lu en base (jamais envoyé par le front). Aucune donnée de carte ne passe par ici :
    le client paie sur la page hébergée par Stripe.
    """
    with transaction.atomic():
        commande = Commande.objects.select_for_update().filter(reference=reference).first()
        if commande is None:
            raise Http404
        if commande.statut == Commande.Statut.ANNULEE:
            raise CommandeAnnulee()
        deja_confirmee = commande.transactions.filter(
            statut=TransactionPaiement.Statut.CONFIRMEE
        ).exists()
        if commande.statut != Commande.Statut.EN_ATTENTE or deja_confirmee:
            raise DejaPayee()

        front = settings.FRONT_URL
        try:
            session = stripe.checkout.Session.create(
                api_key=settings.STRIPE_SECRET_KEY,
                mode="payment",
                payment_method_types=["card", "twint"],
                line_items=[
                    {
                        "quantity": 1,
                        "price_data": {
                            "currency": "chf",
                            "unit_amount": commande.total_ttc_centimes,
                            "product_data": {"name": f"Commande Noyer {commande.reference}"},
                        },
                    }
                ],
                customer_email=commande.client_email,
                client_reference_id=commande.reference,
                metadata={"reference": commande.reference},
                success_url=f"{front}/fr/panier/confirmation?reference={commande.reference}",
                cancel_url=(
                    f"{front}/fr/panier/paiement?reference={commande.reference}&retour=annule"
                ),
            )
        except stripe.StripeError:
            logger.exception("Échec de création de session Stripe")
            raise PaiementIndisponible() from None

        TransactionPaiement.objects.create(
            commande=commande,
            methode=TransactionPaiement.Methode.CARTE,
            prestataire="stripe",
            ref_prestataire=session.id,
            montant_centimes=commande.total_ttc_centimes,
        )
        return session.url


def ajouter_jours_ouvres(depart, jours):
    """Ajoute `jours` jours ouvrés (lundi-vendredi, jours fériés ignorés) à `depart`."""
    date = depart
    while jours > 0:
        date += timedelta(days=1)
        if date.weekday() < 5:
            jours -= 1
    return date


def creer_virement(reference):
    """Choisit le paiement par virement (Premium) et renvoie les coordonnées bancaires.

    Crée une transaction `Virement`, prolonge les réservations de 5 jours ouvrés puis prévient
    le client. Sans validation de l'atelier (B6-06) dans ce délai, le worker annule la commande
    et libère les pièces. Idempotent : un second appel ne prolonge rien.
    """
    delai = settings.VIREMENT_DELAI_JOURS
    with transaction.atomic():
        commande = Commande.objects.select_for_update().filter(reference=reference).first()
        if commande is None:
            raise Http404
        if commande.statut == Commande.Statut.ANNULEE:
            raise CommandeAnnulee()
        deja_confirmee = commande.transactions.filter(
            statut=TransactionPaiement.Statut.CONFIRMEE
        ).exists()
        if commande.statut != Commande.Statut.EN_ATTENTE or deja_confirmee:
            raise DejaPayee()
        if not commande.lignes.filter(gamme="Premium").exists():
            raise VirementIndisponible()
        if not settings.VIREMENT_IBAN:
            logger.error("VIREMENT_IBAN n'est pas configuré")
            raise PaiementIndisponible()

        coordonnees = {
            "iban": settings.VIREMENT_IBAN,
            "beneficiaire": settings.VIREMENT_BENEFICIAIRE,
            "reference": commande.reference,
            "delai_jours": delai,
        }
        if commande.transactions.filter(
            methode=TransactionPaiement.Methode.VIREMENT,
            statut=TransactionPaiement.Statut.CREEE,
        ).exists():
            return coordonnees

        maintenant = timezone.now()
        reservations = list(
            Reservation.objects.select_for_update().filter(
                pk__in=commande.lignes.exclude(reservation=None).values("reservation_id")
            )
        )
        if not reservations or any(
            r.statut != Reservation.Statut.ACTIVE or r.expire_le <= maintenant
            for r in reservations
        ):
            raise ReservationExpiree()
        limite = ajouter_jours_ouvres(maintenant, delai)
        for r in reservations:
            r.expire_le = limite
            r.save(update_fields=["expire_le"])

        TransactionPaiement.objects.create(
            commande=commande,
            methode=TransactionPaiement.Methode.VIREMENT,
            prestataire="banque",
            montant_centimes=commande.total_ttc_centimes,
        )
        emails.envoyer_virement_en_attente(commande)
        return coordonnees
