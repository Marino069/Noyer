from django.conf import settings
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from catalogue.serializers import ProduitResumeSerializer

from . import services


class LignePanierSerializer(serializers.Serializer):
    id = serializers.CharField()
    produit = ProduitResumeSerializer()
    quantite = serializers.IntegerField()
    numero_piece = serializers.IntegerField(allow_null=True)
    reservation_expire_le = serializers.CharField(allow_null=True)


class PanierSerializer(serializers.Serializer):
    lignes = LignePanierSerializer(many=True)
    sous_total_centimes = serializers.IntegerField()
    frais_livraison_centimes = serializers.IntegerField()
    tva_incluse_centimes = serializers.IntegerField()
    taux_tva = serializers.CharField()
    total_centimes = serializers.IntegerField()


def poser_cookie(reponse, panier_id) -> None:
    """Cookie HttpOnly posé par le back ; l'identifiant n'est jamais lisible par le JS."""
    reponse.set_cookie(
        services.COOKIE_NAME,
        str(panier_id),
        max_age=services.DUREE_SECONDES,
        domain=settings.PANIER_COOKIE_DOMAIN,
        path="/",
        secure=settings.PANIER_COOKIE_SECURE,
        httponly=True,
        samesite="Lax",
    )


class PanierView(APIView):
    """Panier du visiteur, sans compte. Jamais mis en cache."""

    def get(self, request):
        panier_id, contenu, nouveau = services.ouvrir(request.COOKIES.get(services.COOKIE_NAME))
        reponse = Response(PanierSerializer(services.resume(contenu)).data)
        if nouveau:
            poser_cookie(reponse, panier_id)
        reponse["Cache-Control"] = "no-store"
        return reponse
