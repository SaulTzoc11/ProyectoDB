from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("detalles", views.DetalleCotizacionViewSet, basename="detalle-cotizacion")
router.register("", views.CotizacionViewSet, basename="cotizacion")

urlpatterns = router.urls
