"""Emails de commande (B4-03) : paiement confirmé, expédition, virement en attente.

Chaque envoi est programmé avec transaction.on_commit : rien ne part si la transaction est
annulée. Un échec d'envoi est journalisé et n'annule jamais la commande.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string

from .models import Commande

logger = logging.getLogger("noyer.emails")

SUJETS = {
    "paiement_confirme": "Noyer – Paiement confirmé pour la commande {reference}",
    "expedition": "Noyer – Votre commande {reference} a été expédiée",
    "virement_en_attente": "Noyer – Virement en attente pour la commande {reference}",
}


def _francs(centimes: int) -> str:
    """Affichage seulement : 18050 -> « 180.50 » (calcul en entiers, jamais de float)."""
    return f"{centimes // 100}.{centimes % 100:02d}"


def _contexte(commande: Commande) -> dict:
    lignes = commande.lignes.select_related("piece")
    return {
        "commande": commande,
        "lignes": [
            {
                "nom": ligne.nom_produit,
                "quantite": ligne.quantite,
                "prix_unitaire": _francs(ligne.prix_unitaire_centimes),
                "numero_piece": ligne.piece.numero if ligne.piece_id else None,
            }
            for ligne in lignes
        ],
        "frais_livraison": _francs(commande.frais_livraison_centimes),
        "total": _francs(commande.total_ttc_centimes),
    }


def _envoyer(modele: str, commande_id: int) -> None:
    try:
        commande = Commande.objects.get(pk=commande_id)
        contexte = _contexte(commande)
        texte = render_to_string(f"commande/emails/{modele}.txt", contexte)
        html = render_to_string(f"commande/emails/{modele}.html", contexte)
        message = EmailMultiAlternatives(
            SUJETS[modele].format(reference=commande.reference),
            texte,
            settings.DEFAULT_FROM_EMAIL,
            [commande.client_email],
        )
        message.attach_alternative(html, "text/html")
        message.send(fail_silently=False)
    except Exception:
        logger.exception("Échec d'envoi de l'email %s (commande %s)", modele, commande_id)


def _programmer(modele: str, commande: Commande) -> None:
    transaction.on_commit(lambda: _envoyer(modele, commande.pk))


def envoyer_paiement_confirme(commande: Commande) -> None:
    _programmer("paiement_confirme", commande)


def envoyer_expedition(commande: Commande) -> None:
    _programmer("expedition", commande)


def envoyer_virement_en_attente(commande: Commande) -> None:
    _programmer("virement_en_attente", commande)
