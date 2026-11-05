from django.urls import path

from .views import LignesView, LigneView, PanierView

urlpatterns = [
    path("panier/", PanierView.as_view(), name="panier"),
    path("panier/lignes/", LignesView.as_view(), name="panier-lignes"),
    path("panier/lignes/<str:ligne_id>/", LigneView.as_view(), name="panier-ligne"),
]
