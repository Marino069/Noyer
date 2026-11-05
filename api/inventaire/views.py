from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from catalogue.models import Gamme, Produit

from .models import Piece, Reservation, StockClassic


class DisponibiliteView(APIView):
    """Disponibilité d'un produit actif. Jamais mise en cache : le stock change vite."""

    def get(self, request, slug):
        produit = get_object_or_404(Produit.objects.select_related("gamme"), slug=slug, actif=True)
        if produit.gamme.code == Gamme.Code.PREMIUM:
            data = self._premium(produit)
        else:
            data = self._classic(produit)
        reponse = Response(data)
        reponse["Cache-Control"] = "no-store"
        return reponse

    @staticmethod
    def _classic(produit):
        stock = StockClassic.objects.filter(produit=produit).first()
        vendable = max(0, stock.quantite_dispo - stock.quantite_reservee) if stock else 0
        return {"gamme": Gamme.Code.CLASSIC, "quantite_disponible": vendable}

    @staticmethod
    def _premium(produit):
        maintenant = timezone.now()
        # une pièce réservée (statut ou réservation active non expirée) n'est pas disponible
        reservee = Q(
            reservations__statut=Reservation.Statut.ACTIVE,
            reservations__expire_le__gt=maintenant,
        )
        series = []
        for serie in produit.series.order_by("id"):
            numeros = list(
                Piece.objects.filter(serie=serie, statut=Piece.Statut.DISPONIBLE)
                .exclude(pk__in=Piece.objects.filter(reservee).values("pk"))
                .order_by("numero")
                .values_list("numero", flat=True)
            )
            series.append(
                {
                    "id": serie.id,
                    "taille_serie": serie.taille_serie,
                    "pieces_restantes": len(numeros),
                    "numeros_disponibles": numeros,
                }
            )
        return {"gamme": Gamme.Code.PREMIUM, "series": series}
