
from rest_framework.routers import DefaultRouter
from .views import CotizacionViewSet, DetalleCotizacionViewSet

router = DefaultRouter()

router.register(
    r"",
    CotizacionViewSet,
    basename="cotizacion"
)

router.register(
    r"detalles",
    DetalleCotizacionViewSet,
    basename="detalle-cotizacion"
)

urlpatterns = router.urls
