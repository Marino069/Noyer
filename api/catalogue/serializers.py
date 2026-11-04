from rest_framework import serializers

from .models import Media, Modele, Produit


class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = ["url", "alt"]


class ProduitResumeSerializer(serializers.ModelSerializer):
    modele = serializers.CharField(source="modele.nom")
    gamme = serializers.CharField(source="gamme.code")
    image_principale = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = ["slug", "modele", "gamme", "prix_ttc_centimes", "image_principale"]

    def get_image_principale(self, produit) -> dict | None:
        # medias est préchargé et trié par ordre (voir ProduitListView)
        medias = produit.medias.all()
        return ImageSerializer(medias[0]).data if medias else None


class ModeleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modele
        fields = ["slug", "nom", "description"]


class ProduitDetailSerializer(serializers.ModelSerializer):
    modele = ModeleSerializer()
    gamme = serializers.CharField(source="gamme.code")
    matieres = serializers.SerializerMethodField()
    medias = ImageSerializer(many=True)
    autre_gamme = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = [
            "slug",
            "modele",
            "gamme",
            "prix_ttc_centimes",
            "caracteristiques",
            "matieres",
            "medias",
            "autre_gamme",
        ]

    def get_matieres(self, produit) -> list[dict]:
        # produitmatiere_set est préchargé avec sa matière (voir ProduitDetailView)
        return [
            {"nom": pm.matiere.nom, "role": pm.role, "entretien": pm.matiere.entretien}
            for pm in produit.produitmatiere_set.all()
        ]

    def get_autre_gamme(self, produit) -> str | None:
        # produit.freres est renseigné par ProduitDetailView.get_object
        return produit.freres[0].slug if produit.freres else None
