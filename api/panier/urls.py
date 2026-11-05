from django.urls import path

from .views import LignesView, PanierView

urlpatterns = [
    path("panier/", PanierView.as_view(), name="panier"),
    path("panier/lignes/", LignesView.as_view(), name="panier-lignes"),
]
