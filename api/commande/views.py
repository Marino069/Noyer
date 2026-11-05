import re

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from panier import services as panier

from . import services

NPA_SUISSE = re.compile(r"^\d{4}$")


class AdresseSerializer(serializers.Serializer):
    nom = serializers.CharField(max_length=120)
    rue = serializers.CharField(max_length=254)
    npa = serializers.CharField(max_length=10)
    localite = serializers.CharField(max_length=120)
    pays = serializers.CharField(max_length=2, default="CH")

    def validate(self, attrs):
        # NPA suisse : exactement 4 chiffres
        if attrs["pays"].upper() == "CH" and not NPA_SUISSE.match(attrs["npa"]):
            raise serializers.ValidationError({"npa": ["Le NPA suisse compte 4 chiffres."]})
        attrs["pays"] = attrs["pays"].upper()
        return attrs


class CommandeSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    adresse_livraison = AdresseSerializer()
    adresse_facturation = AdresseSerializer(required=False, allow_null=True, default=None)
    mode_livraison = serializers.ChoiceField(choices=panier.MODES_LIVRAISON)
    cgv_acceptees = serializers.BooleanField()

    def validate_cgv_acceptees(self, valeur):
        if valeur is not True:
            raise serializers.ValidationError("Les CGV doivent être acceptées.")
        return valeur


class CommandesView(APIView):
    """Transforme le panier du visiteur en commande EnAttente. Jamais mis en cache."""

    def post(self, request):
        donnees = CommandeSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        panier_id, contenu, _ = panier.ouvrir(request.COOKIES.get(panier.COOKIE_NAME))
        commande = services.passer_commande(panier_id, contenu, donnees.validated_data)
        reponse = Response(
            {
                "reference": commande.reference,
                "statut": commande.statut,
                "total_centimes": commande.total_ttc_centimes,
            },
            status=201,
        )
        reponse["Cache-Control"] = "no-store"
        return reponse
