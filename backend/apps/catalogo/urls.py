from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categorias", views.CategoriaViewSet, basename="categoria")
router.register("marcas", views.MarcaViewSet, basename="marca")
router.register("presentaciones", views.PresentacionViewSet, basename="presentacion")
router.register("colores", views.ColorViewSet, basename="color")
router.register("tipos-precio", views.TipoPrecioViewSet, basename="tipo-precio")
router.register("estados", views.EstadoViewSet, basename="estado")
router.register(
    "productos-generales", views.ProductoGeneralViewSet, basename="producto-general"
)
router.register("productos", views.ProductoViewSet, basename="producto")
router.register("precios", views.PrecioViewSet, basename="precio")

urlpatterns = router.urls
