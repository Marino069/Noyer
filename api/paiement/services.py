import logging

import stripe
from django.conf import settings
from django.db import transaction
from django.http import Http404

from commande.models import Commande
from config.exceptions import CommandeAnnulee, DejaPayee, PaiementIndisponible

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
