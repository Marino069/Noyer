from django.urls import path

from .views import CommandesView

urlpatterns = [
    path("commandes/", CommandesView.as_view(), name="commandes"),
]
