from django.db.models import Prefetch
from rest_framework.generics import ListAPIView

from .filters import ProduitFilter
from .models import Media, Produit
from .serializers import ProduitResumeSerializer


class ProduitListView(ListAPIView):
    serializer_class = ProduitResumeSerializer
    filterset_class = ProduitFilter

    def get_queryset(self):
        return (
            Produit.objects.filter(actif=True)
            .select_related("modele", "gamme")
            .prefetch_related(Prefetch("medias", queryset=Media.objects.order_by("ordre", "id")))
            .order_by("id")
        )
