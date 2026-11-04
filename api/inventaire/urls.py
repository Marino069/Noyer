from django.urls import path

from .views import DisponibiliteView

urlpatterns = [
    path("produits/<slug:slug>/disponibilite/", DisponibiliteView.as_view(), name="disponibilite"),
]
