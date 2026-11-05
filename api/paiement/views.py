from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services


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
