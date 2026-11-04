from django.urls import path

from .views import ProduitListView

urlpatterns = [
    path("produits/", ProduitListView.as_view(), name="produit-liste"),
]
