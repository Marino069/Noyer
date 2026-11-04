from rest_framework import serializers

from .models import Media, Produit


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
