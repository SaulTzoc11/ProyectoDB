from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.filters import SearchFilter

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
    TipoPagoSerializer,
)



class CategoriaViewSet(MantenimientoViewSet):
    queryset = repositories.categorias()
    serializer_class = CategoriaSerializer

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "DELETE",
            detail="Las categorías no pueden eliminarse."
        )


class PresentacionViewSet(MantenimientoViewSet):
    queryset = repositories.presentaciones()
    serializer_class = PresentacionSerializer

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "POST",
            detail="Las presentaciones ya están predefinidas."
        )

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "DELETE",
            detail="Las presentaciones no pueden eliminarse."
        )


class MarcaViewSet(MantenimientoViewSet):
    queryset = repositories.marcas()
    serializer_class = MarcaSerializer



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
    filter_backends = [SearchFilter]
    search_fields = [
        "codigoproducto",
        "codigobarras",
        "idproductogeneral__nombre",
        "idpresentacion__nombre",
        "idcolor__nombre",
    ]


class PrecioViewSet(MantenimientoViewSet):
    queryset = repositories.precios()
    serializer_class = PrecioSerializer
    filter_backends = [SearchFilter]
    search_fields = [
        "idproducto__codigoproducto",
        "idproducto__idproductogeneral__nombre",
        "idtipoprecio__nombre",
        "idestado__nombre",
    ]

class TipoPagoViewSet(MantenimientoViewSet):
    queryset = repositories.tipos_pago()
    serializer_class = TipoPagoSerializer
    
class CategoriaViewSet(MantenimientoViewSet):
    queryset = repositories.categorias()
    serializer_class = CategoriaSerializer

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "DELETE",
            detail="Las categorías no pueden eliminarse."
        )


class PresentacionViewSet(MantenimientoViewSet):
    queryset = repositories.presentaciones()
    serializer_class = PresentacionSerializer

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "POST",
            detail="Las presentaciones ya están predefinidas."
        )

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "DELETE",
            detail="Las presentaciones no pueden eliminarse."
        )
