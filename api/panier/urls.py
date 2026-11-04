from django.urls import path

from .views import PanierView

urlpatterns = [
    path("panier/", PanierView.as_view(), name="panier"),
]
