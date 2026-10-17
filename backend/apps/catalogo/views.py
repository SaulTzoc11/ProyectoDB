from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.nucleo.viewsets import MantenimientoViewSet

from . import repositories
from .serializers import (
    CategoriaSerializer,
    ColorSerializer,
    EstadoSerializer,
    MarcaSerializer,
    PrecioSerializer,
    PresentacionSerializer,
    ProductoGeneralSerializer,
    ProductoSerializer,
    TipoPrecioSerializer,
)


class CategoriaViewSet(MantenimientoViewSet):
    queryset = repositories.categorias()
    serializer_class = CategoriaSerializer


class MarcaViewSet(MantenimientoViewSet):
    queryset = repositories.marcas()
    serializer_class = MarcaSerializer


class PresentacionViewSet(MantenimientoViewSet):
    queryset = repositories.presentaciones()
    serializer_class = PresentacionSerializer


class ColorViewSet(MantenimientoViewSet):
    queryset = repositories.colores()
    serializer_class = ColorSerializer


class TipoPrecioViewSet(MantenimientoViewSet):
    queryset = repositories.tipos_precio()
    serializer_class = TipoPrecioSerializer


class EstadoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = repositories.estados()
    serializer_class = EstadoSerializer
    permission_classes = [IsAuthenticated]


class ProductoGeneralViewSet(MantenimientoViewSet):
    queryset = repositories.productos_generales()
    serializer_class = ProductoGeneralSerializer


class ProductoViewSet(MantenimientoViewSet):
    queryset = repositories.productos()
    serializer_class = ProductoSerializer


class PrecioViewSet(MantenimientoViewSet):
    queryset = repositories.precios()
    serializer_class = PrecioSerializer
