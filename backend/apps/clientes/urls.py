from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("tipos-cliente", views.TipoClienteViewSet, basename="tipo-cliente")
router.register("clientes", views.ClienteViewSet, basename="cliente")

urlpatterns = router.urls
