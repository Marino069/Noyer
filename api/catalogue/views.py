from django.db.models import Prefetch
from rest_framework.generics import ListAPIView, RetrieveAPIView

from .filters import ProduitFilter
from .models import Media, Produit, ProduitMatiere
from .serializers import ProduitDetailSerializer, ProduitResumeSerializer


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


class ProduitDetailView(RetrieveAPIView):
    serializer_class = ProduitDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Produit.objects.filter(actif=True)
            .select_related("modele", "gamme")
            .prefetch_related(
                Prefetch("medias", queryset=Media.objects.order_by("ordre", "id")),
                Prefetch(
                    "produitmatiere_set",
                    queryset=ProduitMatiere.objects.select_related("matiere").order_by("id"),
                ),
            )
        )

    def get_object(self):
        produit = super().get_object()
        # l'autre version (même modèle, autre gamme), si elle est active
        produit.freres = list(
            Produit.objects.filter(modele=produit.modele_id, actif=True).exclude(pk=produit.pk)[:1]
        )
        return produit
