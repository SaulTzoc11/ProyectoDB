from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuarioViewSet,
    RolViewSet,
    CategoriaViewSet,
    MarcaViewSet,
    PresentacionViewSet,
    ColorViewSet,
    TipoPrecioViewSet,
    EstadoViewSet,
    ProductoGeneralViewSet,
    ProductoViewSet,
    PrecioViewSet,
    TipoClienteViewSet,
    ClienteViewSet,
    ProveedorViewSet,
    iniciar_sesion_api,
    cerrar_sesion_api,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'roles', RolViewSet, basename='rol')
router.register(
    r"categorias",
    CategoriaViewSet,
    basename="categoria"
)

router.register(
    r"marcas",
    MarcaViewSet,
    basename="marca"
)

router.register(
    r"presentaciones",
    PresentacionViewSet,
    basename="presentacion"
)

router.register(
    r"colores",
    ColorViewSet,
    basename="color"
)

router.register(
    r"tipos-precio",
    TipoPrecioViewSet,
    basename="tipo-precio"
)

router.register(
    r"estados",
    EstadoViewSet,
    basename="estado"
)

router.register(
    r"productos-generales",
    ProductoGeneralViewSet,
    basename="producto-general"
)

router.register(
    r"productos",
    ProductoViewSet,
    basename="producto"
)

router.register(
    r"precios",
    PrecioViewSet,
    basename="precio"
)

router.register(
    r"tipos-cliente",
    TipoClienteViewSet,
    basename="tipo-cliente"
)

router.register(
    r"clientes",
    ClienteViewSet,
    basename="cliente"
)

router.register(
    r"proveedores",
    ProveedorViewSet,
    basename="proveedor"
)


urlpatterns = [
    path("login/", iniciar_sesion_api, name="iniciar_sesion_api"),
    path("logout/", cerrar_sesion_api, name="cerrar_sesion_api"),
    path("", include(router.urls)),
]