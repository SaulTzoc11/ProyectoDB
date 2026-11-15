from django.conf import settings
from django.urls import include, path, re_path
from apps.nucleo.consultas_mantenimientos import ConsultaMantenimientoView
from . import frontend, salud

urlpatterns = [
    path("api/salud/", salud.vivo, name="salud-vivo"),
    path("api/salud/bd/", salud.listo, name="salud-listo"),
    path(
                        "api/consulta-mantenimientos/<str:tabla>/",
                        ConsultaMantenimientoView.as_view(),
                        name="consulta-mantenimiento",
                    ),
    path("api/reportes/", include("apps.reportes.urls")),
    path("api/cotizaciones/", include("apps.ventas.urls")),
    path("api/facturas/", include("apps.ventas.urls_facturas")),
    path(
        "api/",
        include(
            [
                path("", include("apps.seguridad.urls")),
                path("", include("apps.catalogo.urls")),
                path("", include("apps.clientes.urls")),
                path("", include("apps.compras.urls")),
                path("", include("apps.inventario.urls")),
                
            ]
        ),
    ),
]

if settings.SERVIR_FRONTEND:
    urlpatterns.append(re_path(r"^(?P<ruta>.*)$", frontend.servir))
