from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.nucleo.permissions import PuedeOperarVentas

from . import repositories, services
from .serializers import CotizacionSerializer, DetalleCotizacionSerializer


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

        return Response({"ok": True, "porcentaje": str(porcentaje)})


class DetalleCotizacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DetalleCotizacionSerializer
    permission_classes = [PuedeOperarVentas]

    def get_queryset(self):
        return repositories.detalles_de_usuario(self.request.user.idusuario)
