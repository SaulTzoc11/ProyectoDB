from django.conf import settings
from django.urls import include, path, re_path

from . import frontend

urlpatterns = [
    path("api/cotizaciones/", include("apps.ventas.urls")),
    path(
        "api/",
        include(
            [
                path("", include("apps.seguridad.urls")),
                path("", include("apps.catalogo.urls")),
                path("", include("apps.clientes.urls")),
                path("", include("apps.compras.urls")),
            ]
        ),
    ),
]

if settings.SERVIR_FRONTEND:
    urlpatterns.append(re_path(r"^(?P<ruta>.*)$", frontend.servir))
