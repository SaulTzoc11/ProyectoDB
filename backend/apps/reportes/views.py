from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.nucleo.permissions import SoloGerente

from . import repositories
from .serializers import (
    BodegaSerializer,
    RangoFechasSerializer,
    RangoOpcionalSerializer,
)


class ReporteView(APIView):
    """Base: solo el Gerente consulta reportes."""

    permission_classes = [SoloGerente]

    def get(self, request, *args, **kwargs):
        try:
            return Response(self.consultar(request, *args, **kwargs))
        except repositories.FacturaNoEncontrada as error:
            return Response(
                {"ok": False, "mensaje": str(error)}, status=status.HTTP_404_NOT_FOUND
            )
        except repositories.ReporteError as error:
            return Response(
                {"ok": False, "mensaje": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )

    def consultar(self, request, *args, **kwargs):
        raise NotImplementedError


def _rango(request, serializador=RangoFechasSerializer):
    entrada = serializador(data=request.query_params)
    entrada.is_valid(raise_exception=True)
    return entrada.validated_data


class TotalFacturadoView(ReporteView):
    def consultar(self, request):
        d = _rango(request)
        return repositories.total_facturado(d["desde"], d["hasta"])


class ProductosMasIngresosView(ReporteView):
    def consultar(self, request):
        d = _rango(request)
        return repositories.productos_mas_ingresos(d["desde"], d["hasta"], d["top"])


class ProductosMasVendidosView(ReporteView):
    def consultar(self, request):
        d = _rango(request)
        return repositories.productos_mas_vendidos(d["desde"], d["hasta"], d["top"])


class ProductosMenosVendidosView(ReporteView):
    def consultar(self, request):
        d = _rango(request, RangoOpcionalSerializer)
        return repositories.productos_menos_vendidos(d["desde"], d["hasta"], d["top"])


class InventarioActualView(ReporteView):
    def consultar(self, request):
        entrada = BodegaSerializer(data=request.query_params)
        entrada.is_valid(raise_exception=True)
        return repositories.inventario_actual(entrada.validated_data["idBodega"])


class ProductosSinStockView(ReporteView):
    def consultar(self, request):
        return repositories.productos_sin_stock()


class FacturaView(ReporteView):
    def consultar(self, request, no_factura):
        return repositories.factura(no_factura)


# --- Finanzas ---------------------------------------------------------------

class EstadoResultadosView(ReporteView):
    def consultar(self, request):
        d = _rango(request)
        return repositories.estado_resultados(d["desde"], d["hasta"], d["tasaIva"])


class UtilidadPorProductoView(ReporteView):
    def consultar(self, request):
        d = _rango(request)
        return repositories.utilidad_por_producto(d["desde"], d["hasta"], d["top"], d["tasaIva"])


class ValorInventarioView(ReporteView):
    def consultar(self, request):
        return repositories.valor_inventario()


class CuentasPorPagarView(ReporteView):
    def consultar(self, request):
        d = _rango(request, RangoOpcionalSerializer)
        return repositories.cuentas_por_pagar(d["desde"], d["hasta"])


class IvaView(ReporteView):
    def consultar(self, request):
        d = _rango(request)
        return repositories.iva(d["desde"], d["hasta"], d["tasaIva"])
