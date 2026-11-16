from django.urls import path

from . import views

urlpatterns = [
    path("total-facturado/", views.TotalFacturadoView.as_view()),
    path("productos-mas-ingresos/", views.ProductosMasIngresosView.as_view()),
    path("productos-mas-vendidos/", views.ProductosMasVendidosView.as_view()),
    path("productos-menos-vendidos/", views.ProductosMenosVendidosView.as_view()),
    path("inventario/", views.InventarioActualView.as_view()),
    path("productos-sin-stock/", views.ProductosSinStockView.as_view()),
    path("finanzas/estado-resultados/", views.EstadoResultadosView.as_view()),
    path("finanzas/utilidad-por-producto/", views.UtilidadPorProductoView.as_view()),
    path("finanzas/valor-inventario/", views.ValorInventarioView.as_view()),
    path("finanzas/cuentas-por-pagar/", views.CuentasPorPagarView.as_view()),
    path("finanzas/iva/", views.IvaView.as_view()),
    path("factura/<str:no_factura>/", views.FacturaView.as_view()),
]
