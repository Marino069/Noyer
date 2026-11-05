from django.urls import path

from .views import ModeleDetailView, ProduitDetailView, ProduitListView

urlpatterns = [
    path("produits/", ProduitListView.as_view(), name="produit-liste"),
    path("produits/<slug:slug>/", ProduitDetailView.as_view(), name="produit-detail"),
    path("modeles/<slug:slug>/", ModeleDetailView.as_view(), name="modele-detail"),
]
