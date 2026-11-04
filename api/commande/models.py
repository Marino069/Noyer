from django.db import models


class Commande(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "EnAttente"
        PAYEE = "Payee"
        EXPEDIEE = "Expediee"
        ANNULEE = "Annulee"

    reference = models.CharField(max_length=20, unique=True)
    client_email = models.CharField(max_length=254)
    statut = models.CharField(max_length=9, choices=Statut.choices, default=Statut.EN_ATTENTE)
    total_ttc_centimes = models.PositiveIntegerField()
    frais_livraison_centimes = models.PositiveIntegerField(default=0)
    taux_tva = models.DecimalField(max_digits=4, decimal_places=2)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "Commande"
        indexes = [models.Index(fields=["client_email"], name="idx_commande_email")]


class LigneCommande(models.Model):
    """nom, gamme et prix sont copiés à l'achat pour que la commande reste juste."""

    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, db_column="id_commande", related_name="lignes"
    )
    produit = models.ForeignKey(
        "catalogue.Produit", on_delete=models.PROTECT, db_column="id_produit"
    )
    nom_produit = models.CharField(max_length=120)
    gamme = models.CharField(max_length=7)
    prix_unitaire_centimes = models.PositiveIntegerField()
    quantite = models.PositiveSmallIntegerField(default=1)
    piece = models.ForeignKey(
        "inventaire.Piece", null=True, blank=True, on_delete=models.PROTECT, db_column="id_piece"
    )

    class Meta:
        db_table = "Ligne_Commande"


class Adresse(models.Model):
    class Type(models.TextChoices):
        LIVRAISON = "Livraison"
        FACTURATION = "Facturation"

    type = models.CharField(max_length=11, choices=Type.choices)
    nom = models.CharField(max_length=120)
    rue = models.CharField(max_length=254)
    npa = models.CharField(max_length=10)
    localite = models.CharField(max_length=120)
    pays = models.CharField(max_length=2, default="CH")
    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, db_column="id_commande", related_name="adresses"
    )

    class Meta:
        db_table = "Adresse"
        constraints = [
            models.UniqueConstraint(fields=["commande", "type"], name="uq_adresse_commande_type"),
        ]
