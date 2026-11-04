from django.db import models

from commande.models import Commande


class TransactionPaiement(models.Model):
    class Methode(models.TextChoices):
        TWINT = "Twint"
        CARTE = "Carte"
        VIREMENT = "Virement"

    class Statut(models.TextChoices):
        CREEE = "Creee"
        AUTORISEE = "Autorisee"
        CONFIRMEE = "Confirmee"
        ECHOUEE = "Echouee"
        REMBOURSEE = "Remboursee"

    commande = models.ForeignKey(
        Commande, on_delete=models.PROTECT, db_column="id_commande", related_name="transactions"
    )
    methode = models.CharField(max_length=8, choices=Methode.choices)
    prestataire = models.CharField(max_length=65)
    ref_prestataire = models.CharField(max_length=120, null=True, blank=True, unique=True)
    montant_centimes = models.PositiveIntegerField()
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.CREEE)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "Transaction_Paiement"


class Webhook(models.Model):
    # La clé primaire est l'identifiant d'événement du prestataire (anti-doublon).
    id_evenement = models.CharField(max_length=120, primary_key=True)
    payload = models.JSONField()
    traite = models.BooleanField(default=False)
    recu_le = models.DateTimeField(auto_now_add=True)
    transaction = models.ForeignKey(
        TransactionPaiement,
        on_delete=models.PROTECT,
        db_column="id_transaction",
        related_name="webhooks",
    )

    class Meta:
        db_table = "Webhook"
