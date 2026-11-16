"""apps/ventas/views.py  (reemplaza el tuyo: conserva todo y agrega la acción 'generar')"""
from apps.reportes import repositories as repo_reportes
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.nucleo.permissions import PuedeOperarVentas

from . import repositories, services
from .serializers import (
    CotizacionSerializer,
    DetalleCotizacionSerializer,
    FacturarSerializer,
    GenerarCotizacionSerializer,
)


class CotizacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CotizacionSerializer
    permission_classes = [PuedeOperarVentas]

    def get_queryset(self):
        return repositories.cotizaciones_de_usuario(self.request.user.idusuario)

    @action(detail=False, methods=["post"], url_path="autorizar-descuento")
    def autorizar_descuento(self, request):
        try:
            porcentaje = services.autorizar_descuento(
                request.data.get("clave"), request.data.get("porcentaje")
            )
        except services.AutorizacionDenegada as error:
            return Response(
                {"ok": False, "mensaje": str(error)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except services.DescuentoInvalido as error:
            return Response(
                {"ok": False, "mensaje": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "ok": True,
            "porcentaje": str(porcentaje),
            
            "token": services.emitir_token_descuento(request.user.idusuario, porcentaje),
        })

    
    @action(detail=False, methods=["post"], url_path="generar")
    def generar(self, request):
        entrada = GenerarCotizacionSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)         
        datos = entrada.validated_data

        try:
            id_cotizacion, codigo = services.generar_cotizacion(
                id_usuario=request.user.idusuario,
                id_cliente=datos["idCliente"],
                detalle=datos["detalle"],
                observaciones=datos.get("observaciones") or None,
                tokens_descuento=datos["tokensDescuento"],
            )
        except services.AutorizacionDenegada as error:
            return Response({"ok": False, "mensaje": str(error)}, status=status.HTTP_403_FORBIDDEN)
        except repositories.CotizacionError as error:    
            return Response({"ok": False, "mensaje": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"ok": True, "idCotizacion": id_cotizacion, "codigoCotizacion": codigo},
            status=status.HTTP_201_CREATED,
        )

    
    @action(detail=True, methods=["get"], url_path="impresion")
    def impresion(self, request, pk=None):
        self.get_object()     
        datos = repositories.obtener_cotizacion_impresion(pk)
        if datos is None:
            return Response(
                {"ok": False, "mensaje": "Cotización no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(datos)

   
    @action(detail=False, methods=["get"], url_path="clientes")
    def clientes(self, request):
        return Response(repositories.listar_clientes_activos())

    @action(detail=True, methods=["post"], url_path="confirmar")
    def confirmar(self, request, pk=None):
        self.get_object()      
        try:
            resultado = services.confirmar_cotizacion(pk, request.user.idusuario)
        except repositories.CotizacionError as error:
            return Response(
                {"ok": False, "mensaje": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"ok": True, **resultado})


class DetalleCotizacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DetalleCotizacionSerializer
    permission_classes = [PuedeOperarVentas]

    def get_queryset(self):
        return repositories.detalles_de_usuario(self.request.user.idusuario)


class FacturaViewSet(viewsets.ViewSet):
    permission_classes = [PuedeOperarVentas]

    def create(self, request):
        entrada = FacturarSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        try:
            resultado = services.facturar(
                id_usuario=request.user.idusuario,
                pagos=datos["pagos"],
                id_cotizacion=datos.get("idCotizacion"),
                id_cliente=datos.get("idCliente"),
                detalle=datos.get("detalle"),
                observaciones=datos.get("observaciones") or None,
                tokens_descuento=datos["tokensDescuento"],
            )
        except services.AutorizacionDenegada as error:
            return Response({"ok": False, "mensaje": str(error)}, status=status.HTTP_403_FORBIDDEN)
        except (services.DescuentoInvalido, repositories.CotizacionError,
                repositories.FacturaError) as error:
            return Response({"ok": False, "mensaje": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"ok": True, **resultado}, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, pk=None):
        try:
            return Response(repo_reportes.factura(pk))
        except repo_reportes.FacturaNoEncontrada as error:
            return Response({"ok": False, "mensaje": str(error)}, status=status.HTTP_404_NOT_FOUND)
        except repo_reportes.ReporteError as error:
            return Response({"ok": False, "mensaje": str(error)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="tipos-pago")
    def tipos_pago(self, request):
        return Response(repositories.listar_tipos_pago())

    @action(detail=False, methods=["get"], url_path="pendientes")
    def pendientes(self, request):
        return Response(repositories.cotizaciones_por_facturar())