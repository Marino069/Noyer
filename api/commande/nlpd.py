"""Demandes nLPD d'un client (B7-04) : export JSON et anonymisation, à partir de son email.

L'anonymisation efface tout ce qui identifie le client (email, adresses, abonnement
newsletter, données du prestataire de paiement) mais garde montants, lignes, statuts
et dates : ce sont des pièces comptables.
"""

from django.db import transaction

from newsletter.models import Abonne
from paiement.models import TransactionPaiement, Webhook

from .models import Commande

DOMAINE_ANONYME = "anonyme.invalid"


def est_anonyme(email: str) -> bool:
    return email.lower().endswith("@" + DOMAINE_ANONYME)


def _normaliser(email: str) -> str:
    return email.strip().lower()


def _commandes(email: str):
    return Commande.objects.filter(client_email__iexact=_normaliser(email))


def exporter(email: str) -> dict:
    """Toutes les données détenues sur ce client, prêtes à être sérialisées en JSON."""
    email = _normaliser(email)
    commandes = (
        _commandes(email)
        .prefetch_related("lignes", "adresses", "transactions")
        .order_by("date_creation", "pk")
    )
    abonne = Abonne.objects.filter(email__iexact=email).first()
    return {
        "email": email,
        "commandes": [
            {
                "reference": c.reference,
                "statut": c.statut,
                "total_ttc_centimes": c.total_ttc_centimes,
                "frais_livraison_centimes": c.frais_livraison_centimes,
                "taux_tva": str(c.taux_tva),
                "date_creation": c.date_creation.isoformat(),
                "lignes": [
                    {
                        "nom_produit": ligne.nom_produit,
                        "gamme": ligne.gamme,
                        "prix_unitaire_centimes": ligne.prix_unitaire_centimes,
                        "quantite": ligne.quantite,
                    }
                    for ligne in c.lignes.all()
                ],
                "adresses": [
                    {
                        "type": a.type,
                        "nom": a.nom,
                        "rue": a.rue,
                        "npa": a.npa,
                        "localite": a.localite,
                        "pays": a.pays,
                    }
                    for a in c.adresses.all()
                ],
                "paiements": [
                    {
                        "methode": t.methode,
                        "montant_centimes": t.montant_centimes,
                        "statut": t.statut,
                        "date_creation": t.date_creation.isoformat(),
                    }
                    for t in c.transactions.all()
                ],
            }
            for c in commandes
        ],
        "newsletter": (
            {
                "consentement_le": abonne.consentement_le.isoformat(),
                "confirme_le": abonne.confirme_le.isoformat() if abonne.confirme_le else None,
            }
            if abonne
            else None
        ),
    }


def anonymiser(email: str) -> int:
    """Efface l'identité du client. Retourne le nombre de commandes anonymisées."""
    email = _normaliser(email)
    with transaction.atomic():
        commandes = list(_commandes(email).select_for_update())
        for commande in commandes:
            # Un email distinct par commande : elles ne peuvent plus être rapprochées.
            commande.client_email = f"anonyme-{commande.pk}@{DOMAINE_ANONYME}"
            commande.save(update_fields=["client_email", "date_modification"])
            commande.adresses.update(nom="", rue="", npa="", localite="")
            Webhook.objects.filter(transaction__commande=commande).update(
                payload={"anonymise": True}
            )
            TransactionPaiement.objects.filter(commande=commande).update(ref_prestataire=None)
        Abonne.objects.filter(email__iexact=email).delete()
    return len(commandes)
