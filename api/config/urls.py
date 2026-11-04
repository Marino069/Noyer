from django.conf import settings
from django.contrib import admin
from django.core.cache import cache
from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve
from django_redis.exceptions import ConnectionInterrupted
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from redis.exceptions import RedisError


def health(request):
    try:
        connection.ensure_connection()
        base = "ok"
    except DatabaseError:
        base = "erreur"
    try:
        cache.set("health:ping", "pong", timeout=10)
        redis = "ok" if cache.get("health:ping") == "pong" else "erreur"
    except (RedisError, ConnectionInterrupted, OSError):
        redis = "erreur"
    statut = 200 if base == "ok" and redis == "ok" else 503
    return JsonResponse(
        {"statut": "ok" if statut == 200 else "erreur", "base": base, "redis": redis},
        status=statut,
    )


urlpatterns = [
    # Photos téléversées (MEDIA_ROOT, volume Docker)
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("catalogue.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]