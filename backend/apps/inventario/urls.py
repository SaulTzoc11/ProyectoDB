from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("bodegas", views.BodegaViewSet, basename="bodega")
router.register("estantes", views.EstanteViewSet, basename="estante")
urlpatterns = router.urls