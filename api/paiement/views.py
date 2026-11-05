import stripe
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services, webhooks


class PaiementSerializer(serializers.Serializer):
    # "virement" (Premium) est traité par un autre ticket.
    methode = serializers.ChoiceField(choices=["stripe"])


class PaiementView(APIView):
    def post(self, request, reference):
        PaiementSerializer(data=request.data).is_valid(raise_exception=True)
        url = services.creer_session_stripe(reference)
        reponse = Response({"methode": "stripe", "url_paiement": url}, status=201)
        reponse["Cache-Control"] = "no-store"
        return reponse


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """Reçoit les événements Stripe. Pas d'authentification : la signature fait foi."""

    authentication_classes = []
    permission_classes = []

    @extend_schema(exclude=True)
    def post(self, request):
        try:
            event = stripe.Webhook.construct_event(
                request.body,
                request.META.get("HTTP_STRIPE_SIGNATURE", ""),
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.SignatureVerificationError):
            return Response(
                {"erreur": {"code": "signature_invalide", "message": "Signature invalide."}},
                status=400,
            )
        webhooks.traiter_evenement(event)
        return Response({"recu": True})
