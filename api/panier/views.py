from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from catalogue.models import Gamme, Produit
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


class AjoutLigneSerializer(serializers.Serializer):
    produit_slug = serializers.SlugField()
    quantite = serializers.IntegerField(min_value=1, max_value=99, default=1)
    numero = serializers.IntegerField(min_value=1, required=False, allow_null=True, default=None)


class LignesView(APIView):
    """Ajoute une lampe au panier et la réserve. Le prix vient toujours de la base."""

    throttle_scope = "panier_ajout"

    def post(self, request):
        donnees = AjoutLigneSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        valide = donnees.validated_data
        produit = get_object_or_404(
            Produit.objects.select_related("gamme"), slug=valide["produit_slug"], actif=True
        )
        if produit.gamme.code == Gamme.Code.PREMIUM and valide["quantite"] != 1:
            raise ValidationError({"quantite": ["Une pièce numérotée se commande à l'unité."]})
        if produit.gamme.code != Gamme.Code.PREMIUM:
            valide["numero"] = None  # le numéro n'a de sens que pour le Premium

        panier_id, contenu, nouveau = services.ouvrir(request.COOKIES.get(services.COOKIE_NAME))
        contenu = services.ajouter_ligne(
            panier_id, contenu, produit, valide["quantite"], valide["numero"]
        )
        reponse = Response(PanierSerializer(services.resume(contenu)).data, status=201)
        if nouveau:
            poser_cookie(reponse, panier_id)
        reponse["Cache-Control"] = "no-store"
        return reponse


class ModifierLigneSerializer(serializers.Serializer):
    quantite = serializers.IntegerField(min_value=1, max_value=99)


class LigneView(APIView):
    """Modifie la quantité d'une ligne Classic ou retire la ligne (libère la réservation)."""

    def _ouvrir(self, request, ligne_id):
        panier_id, contenu, nouveau = services.ouvrir(request.COOKIES.get(services.COOKIE_NAME))
        ligne = services.trouver_ligne(contenu, ligne_id)
        if ligne is None:
            raise NotFound("Cette ligne n'existe pas dans votre panier.")
        return panier_id, contenu, nouveau, ligne

    def _reponse(self, contenu, panier_id, nouveau):
        reponse = Response(PanierSerializer(services.resume(contenu)).data)
        if nouveau:
            poser_cookie(reponse, panier_id)
        reponse["Cache-Control"] = "no-store"
        return reponse

    def patch(self, request, ligne_id):
        donnees = ModifierLigneSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        panier_id, contenu, nouveau, ligne = self._ouvrir(request, ligne_id)
        if ligne.get("numero_piece") is not None:
            raise ValidationError({"quantite": ["Une pièce numérotée se commande à l'unité."]})
        contenu = services.modifier_quantite(
            panier_id, contenu, ligne, donnees.validated_data["quantite"]
        )
        return self._reponse(contenu, panier_id, nouveau)

    def delete(self, request, ligne_id):
        panier_id, contenu, nouveau, ligne = self._ouvrir(request, ligne_id)
        contenu = services.retirer_ligne(panier_id, contenu, ligne)
        return self._reponse(contenu, panier_id, nouveau)


class PanierView(APIView):
    """Panier du visiteur, sans compte. Jamais mis en cache."""

    def get(self, request):
        panier_id, contenu, nouveau = services.ouvrir(request.COOKIES.get(services.COOKIE_NAME))
        reponse = Response(PanierSerializer(services.resume(contenu)).data)
        if nouveau:
            poser_cookie(reponse, panier_id)
        reponse["Cache-Control"] = "no-store"
        return reponse
