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
    methode = serializers.ChoiceField(choices=["stripe", "virement"])


class PaiementView(APIView):
    def post(self, request, reference):
        serializer = PaiementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["methode"] == "virement":
            corps = {"methode": "virement", **services.creer_virement(reference)}
        else:
            corps = {"methode": "stripe", "url_paiement": services.creer_session_stripe(reference)}
        reponse = Response(corps, status=201)
        reponse["Cache-Control"] = "no-store"
        return reponse


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """Reçoit les événements Stripe. Pas d'authentification : la signature fait foi."""

    authentication_classes = []
    permission_classes = []
    throttle_classes = []  # les webhooks ne sont jamais limités

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
