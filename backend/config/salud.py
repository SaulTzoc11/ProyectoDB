"""Endpoints de salud para Docker, Dokploy y Kubernetes (sin autenticación)."""

from django.db import connection
from django.http import JsonResponse


def vivo(request):
    """El proceso responde (liveness)."""
    return JsonResponse({"estado": "ok"})


def listo(request):
    """El proceso responde y llega a la base de datos (readiness)."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        return JsonResponse({"estado": "sin base de datos"}, status=503)
    return JsonResponse({"estado": "ok"})
