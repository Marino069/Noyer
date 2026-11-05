from django.urls import path

from .views import PaiementView

urlpatterns = [
    path("commandes/<str:reference>/paiement/", PaiementView.as_view(), name="paiement"),
]
