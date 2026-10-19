from django.contrib import admin
from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.urls import path


def health(request):
    try:
        connection.ensure_connection()
        base = "ok"
    except DatabaseError:
        base = "erreur"
    statut = 200 if base == "ok" else 503
    return JsonResponse({"statut": "ok" if statut == 200 else "erreur", "base": base}, status=statut)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
]