from django.urls import path

from . import views

urlpatterns = [
    path("total-facturado/", views.TotalFacturadoView.as_view()),
    path("productos-mas-ingresos/", views.ProductosMasIngresosView.as_view()),
    path("productos-mas-vendidos/", views.ProductosMasVendidosView.as_view()),
    path("productos-menos-vendidos/", views.ProductosMenosVendidosView.as_view()),
    path("inventario/", views.InventarioActualView.as_view()),
    path("productos-sin-stock/", views.ProductosSinStockView.as_view()),
    path("factura/<str:no_factura>/", views.FacturaView.as_view()),
]
