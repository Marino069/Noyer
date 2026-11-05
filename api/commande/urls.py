from django.urls import path

from .views import CommandeDetailView, CommandesView

urlpatterns = [
    path("commandes/", CommandesView.as_view(), name="commandes"),
    path("commandes/<str:reference>/", CommandeDetailView.as_view(), name="commande-detail"),
]
