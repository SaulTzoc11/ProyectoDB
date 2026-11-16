from apps.nucleo.viewsets import MantenimientoViewSet

from .models import Cliente, TipoCliente
from .serializers import ClienteSerializer, TipoClienteSerializer


class TipoClienteViewSet(MantenimientoViewSet):
    queryset = TipoCliente.objects.all().order_by("nombre")
    serializer_class = TipoClienteSerializer


class ClienteViewSet(MantenimientoViewSet):
    queryset = Cliente.objects.select_related("idtipocliente").order_by(
        "nombrecliente"
    )
    serializer_class = ClienteSerializer
