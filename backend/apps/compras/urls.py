from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

router.register(
    "proveedores",
    views.ProveedorViewSet,
    basename="proveedor"
)

router.register(
    "ordenes-compra",
    views.OrdenCompraViewSet,
    basename="orden-compra"
)
router.register(
    "ingresos-bodega",
    views.IngresoBodegaViewSet,
    basename="ingreso-bodega"
)
urlpatterns = router.urls
