from django.urls import path

from .views import NewsletterConfirmerView, NewsletterView

urlpatterns = [
    path("newsletter/", NewsletterView.as_view(), name="newsletter"),
    path("newsletter/confirmer/", NewsletterConfirmerView.as_view(), name="newsletter-confirmer"),
]
