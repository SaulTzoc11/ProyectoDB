from apps.nucleo.viewsets import MantenimientoViewSet

from .models import Proveedor
from .serializers import ProveedorSerializer


class ProveedorViewSet(MantenimientoViewSet):
    queryset = Proveedor.objects.all().order_by("nombreproveedor")
    serializer_class = ProveedorSerializer
