from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.nucleo.viewsets import MantenimientoViewSet

from . import repositories
from .serializers import (
    BodegaSerializer,
    EstanteSerializer,
)
class BodegaViewSet(MantenimientoViewSet):
    queryset = repositories.bodegas()
    serializer_class = BodegaSerializer

class EstanteViewSet(MantenimientoViewSet):
    queryset = repositories.estantes()
    serializer_class = EstanteSerializer