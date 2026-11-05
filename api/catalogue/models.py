from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from . import images


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
    mis_en_avant = models.BooleanField(default=False)
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
    # url : ancienne référence libre, renseignée automatiquement pour un fichier téléversé.
    url = models.CharField(max_length=500, blank=True)
    fichier = models.ImageField(upload_to="produits/", null=True, blank=True, max_length=300)
    largeur_origine = models.PositiveIntegerField(null=True, blank=True, editable=False)
    hauteur_origine = models.PositiveIntegerField(null=True, blank=True, editable=False)
    alt = models.CharField(max_length=254)
    ordre = models.PositiveSmallIntegerField(default=0)
    produit = models.ForeignKey(
        Produit, on_delete=models.CASCADE, db_column="id_produit", related_name="medias"
    )

    def clean(self):
        super().clean()
        if not self.fichier and not self.url:
            raise ValidationError("Téléversez une photo.")

    def save(self, *args, **kwargs):
        nouveau = bool(self.fichier) and not getattr(self.fichier, "_committed", True)
        super().save(*args, **kwargs)
        if nouveau:
            self.largeur_origine, self.hauteur_origine = images.generer_versions(
                self.fichier, self.fichier.storage
            )
            self.url = self.fichier.storage.url(images.nom_version(self.fichier.name, 960))
            super().save(update_fields=["largeur_origine", "hauteur_origine", "url"])

    def sources(self) -> list[dict]:
        if not self.fichier:
            return []
        storage = self.fichier.storage
        return [
            {"largeur": largeur, "url": storage.url(images.nom_version(self.fichier.name, largeur))}
            for largeur in images.LARGEURS
        ]

    class Meta:
        db_table = "Media"
        indexes = [models.Index(fields=["produit", "ordre"], name="idx_media_produit_ordre")]


@receiver(post_delete, sender=Media)
def supprimer_fichiers_media(sender, instance, **kwargs):
    if instance.fichier:
        images.supprimer_versions(instance.fichier.name, instance.fichier.storage)
        instance.fichier.delete(save=False)
