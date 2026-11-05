"""Formulaire de contact (B7-01) : email à l'atelier, rien n'est stocké en base."""

from django.conf import settings
from django.core.mail import EmailMessage
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView


class ContactSerializer(serializers.Serializer):
    nom = serializers.CharField(max_length=120)
    email = serializers.EmailField(max_length=254)
    message = serializers.CharField(max_length=5000)
    consentement = serializers.BooleanField()
    site_web = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_consentement(self, valeur):
        if valeur is not True:
            raise serializers.ValidationError("Le consentement est requis.")
        return valeur


class ContactView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Champ piège : un robot le remplit, on répond 204 sans rien envoyer.
        piege = request.data.get("site_web") if hasattr(request.data, "get") else None
        if piege:
            return Response(status=204)

        donnees = ContactSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        valide = donnees.validated_data
        nom = " ".join(valide["nom"].split())
        email = valide["email"]
        EmailMessage(
            f"Noyer – Message de {nom}",
            f"De : {nom} <{email}>\n\n{valide['message']}",
            settings.DEFAULT_FROM_EMAIL,
            [settings.ATELIER_EMAIL],
            reply_to=[email],
        ).send(fail_silently=False)
        return Response(status=204)
