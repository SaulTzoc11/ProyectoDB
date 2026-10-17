from rest_framework.routers import DefaultRouter

from .views import CotizacionViewSet, DetalleCotizacionViewSet
 
router = SimpleRouter()
router.register(r"detalles", DetalleCotizacionViewSet, basename="detalle-cotizacion")  # primero
router.register(r"", CotizacionViewSet, basename="cotizacion")
 
urlpatterns = router.urls