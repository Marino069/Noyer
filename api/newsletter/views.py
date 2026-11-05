"""Inscription à la newsletter (B7-02) avec double confirmation par email."""

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Abonne


class NewsletterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    consentement = serializers.BooleanField()

    def validate_consentement(self, valeur):
        if valeur is not True:
            raise serializers.ValidationError("Le consentement est requis.")
        return valeur


def envoyer_confirmation(abonne):
    lien = f"{settings.API_PUBLIC_URL}/api/newsletter/confirmer/?jeton={abonne.jeton}"
    EmailMessage(
        "Noyer – Confirmez votre inscription à la newsletter",
        "Bonjour,\n\nPour confirmer votre inscription à la newsletter de Noyer, "
        f"ouvrez ce lien :\n{lien}\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.",
        settings.DEFAULT_FROM_EMAIL,
        [abonne.email],
    ).send(fail_silently=False)


class NewsletterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        donnees = NewsletterSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        email = donnees.validated_data["email"].strip().lower()
        abonne, _ = Abonne.objects.get_or_create(email=email, defaults={"consentement_le": timezone.now()})
        # Déjà confirmé : même réponse, aucun email (on ne révèle pas qui est abonné).
        if not abonne.confirme:
            envoyer_confirmation(abonne)
        return Response(status=202)


class NewsletterConfirmerView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        jeton = request.query_params.get("jeton", "")
        abonne = Abonne.objects.filter(jeton=jeton).first() if jeton else None
        if abonne is None:
            return HttpResponseRedirect(f"{settings.FRONT_URL}/newsletter/confirmation?statut=invalide")
        if not abonne.confirme:
            abonne.confirme_le = timezone.now()
            abonne.save(update_fields=["confirme_le"])
        return HttpResponseRedirect(f"{settings.FRONT_URL}/newsletter/confirmation?statut=ok")
