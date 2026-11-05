from django.urls import path

from .views import PaiementView, StripeWebhookView

urlpatterns = [
    path("commandes/<str:reference>/paiement/", PaiementView.as_view(), name="paiement"),
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="webhook_stripe"),
]
