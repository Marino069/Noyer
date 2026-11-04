from django.db import models

from catalogue.models import Produit


class StockClassic(models.Model):
    produit = models.OneToOneField(
        Produit, on_delete=models.CASCADE, db_column="id_produit", related_name="stock"
    )
    quantite_dispo = models.PositiveIntegerField(default=0)
    quantite_reservee = models.PositiveIntegerField(default=0)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "Stock_Classic"


class Serie(models.Model):
    produit = models.ForeignKey(
        Produit, on_delete=models.PROTECT, db_column="id_produit", related_name="series"
    )
    taille_serie = models.PositiveSmallIntegerField()
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "Serie"


class Piece(models.Model):
    class Statut(models.TextChoices):
        DISPONIBLE = "Disponible"
        RESERVEE = "Reservee"
        VENDUE = "Vendue"

    numero = models.PositiveSmallIntegerField()
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.DISPONIBLE)
    version = models.PositiveIntegerField(default=0)
    serie = models.ForeignKey(
        Serie, on_delete=models.PROTECT, db_column="id_serie", related_name="pieces"
    )

    class Meta:
        db_table = "Piece"
        constraints = [
            models.UniqueConstraint(fields=["serie", "numero"], name="uq_piece_serie_numero"),
        ]


class Reservation(models.Model):
    class Statut(models.TextChoices):
        ACTIVE = "Active"
        CONFIRMEE = "Confirmee"
        EXPIREE = "Expiree"
        ANNULEE = "Annulee"

    produit = models.ForeignKey(
        Produit, on_delete=models.PROTECT, db_column="id_produit", related_name="reservations"
    )
    quantite = models.PositiveSmallIntegerField(default=1)
    panier_id = models.CharField(max_length=36)
    expire_le = models.DateTimeField()
    statut = models.CharField(max_length=9, choices=Statut.choices, default=Statut.ACTIVE)
    date_creation = models.DateTimeField(auto_now_add=True)
    piece = models.ForeignKey(
        Piece,
        on_delete=models.PROTECT,
        db_column="id_piece",
        null=True,
        blank=True,
        related_name="reservations",
    )
    # La colonne générée id_piece_active et son index unique (une seule réservation
    # active par pièce) sont créés par la migration 0002 en RunSQL : l'ORM ne les connaît pas.

    class Meta:
        db_table = "Reservation"
        indexes = [
            models.Index(fields=["statut", "expire_le"], name="idx_reservation_expiration"),
            models.Index(fields=["panier_id"], name="idx_reservation_panier"),
        ]
