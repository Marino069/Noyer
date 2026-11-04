from django.db import models


class Modele(models.Model):
    slug = models.CharField(max_length=120, unique=True)
    nom = models.CharField(max_length=65)
    description = models.TextField(null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "Modele"


class Gamme(models.Model):
    class Code(models.TextChoices):
        CLASSIC = "Classic"
        PREMIUM = "Premium"

    code = models.CharField(max_length=7, choices=Code.choices, unique=True)
    nom = models.CharField(max_length=65)

    class Meta:
        db_table = "Gamme"


class Matiere(models.Model):
    nom = models.CharField(max_length=65, unique=True)
    entretien = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "Matiere"


class Produit(models.Model):
    slug = models.CharField(max_length=120, unique=True)
    prix_ttc_centimes = models.PositiveIntegerField()
    caracteristiques = models.JSONField(null=True, blank=True)
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    modele = models.ForeignKey(
        Modele, on_delete=models.PROTECT, db_column="id_modele", related_name="produits"
    )
    gamme = models.ForeignKey(
        Gamme, on_delete=models.PROTECT, db_column="id_gamme", related_name="produits"
    )
    matieres = models.ManyToManyField(Matiere, through="ProduitMatiere", related_name="produits")

    class Meta:
        db_table = "Produit"
        constraints = [
            models.UniqueConstraint(fields=["modele", "gamme"], name="uq_produit_modele_gamme"),
        ]


class ProduitMatiere(models.Model):
    # La clé primaire (id_produit, id_matiere) du schéma est portée par une contrainte
    # d'unicité ; Django ajoute une colonne id technique.
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, db_column="id_produit")
    matiere = models.ForeignKey(Matiere, on_delete=models.PROTECT, db_column="id_matiere")
    role = models.CharField(max_length=65)

    class Meta:
        db_table = "Produit_Matiere"
        constraints = [
            models.UniqueConstraint(
                fields=["produit", "matiere"], name="uq_produit_matiere_produit_matiere"
            ),
        ]


class Media(models.Model):
    url = models.CharField(max_length=500)
    alt = models.CharField(max_length=254)
    ordre = models.PositiveSmallIntegerField(default=0)
    produit = models.ForeignKey(
        Produit, on_delete=models.CASCADE, db_column="id_produit", related_name="medias"
    )

    class Meta:
        db_table = "Media"
        indexes = [models.Index(fields=["produit", "ordre"], name="idx_media_produit_ordre")]
