from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("usuarios", views.UsuarioViewSet, basename="usuario")
router.register("roles", views.RolViewSet, basename="rol")
router.register("tipo-movimiento", views.TipoMovimientoViewSet, basename="tipo-movimiento")
router.register("motivo", views.MotivoViewSet, basename="motivo")
router.register("accion", views.AccionViewSet, basename="accion")
router.register("tabla", views.TablaViewSet, basename="tabla")

urlpatterns = [
    path("login/", views.iniciar_sesion, name="iniciar_sesion_api"),
    path("logout/", views.cerrar_sesion, name="cerrar_sesion_api"),
    path("csrf/", views.token_csrf, name="token_csrf"),
    path("sesion/", views.sesion_actual, name="sesion_actual"),
    path("", include(router.urls)),
]

