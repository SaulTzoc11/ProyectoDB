from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, RolViewSet, iniciar_sesion_api, cerrar_sesion_api

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'roles', RolViewSet, basename='rol')
# router.register(r'clientes', ClienteViewSet, basename='cliente')

urlpatterns = [
    path("login/", iniciar_sesion_api, name="iniciar_sesion_api"),
    path("logout/", cerrar_sesion_api, name="cerrar_sesion_api"),
    path("", include(router.urls)),
]