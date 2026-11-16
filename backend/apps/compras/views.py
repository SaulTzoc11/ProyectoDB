from apps.nucleo.viewsets import MantenimientoViewSet

from .models import Proveedor
from .serializers import ProveedorSerializer


class ProveedorViewSet(MantenimientoViewSet):
    queryset = Proveedor.objects.all().order_by("nombreproveedor")
    serializer_class = ProveedorSerializer


from django.db import DatabaseError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .repositories import listar_ordenes_compra

from apps.nucleo.permissions import SoloRoles
from apps.nucleo import roles

from .repositories import crear_orden_compra
from .serializers import OrdenCompraSerializer

from .repositories import (
    obtener_pendientes_bodega,
    obtener_estantes_bodega,
    registrar_ingreso_bodega
)
from .serializers import IngresoBodegaSerializer

class PuedeCrearOrdenCompra(SoloRoles):
    roles_permitidos = roles.MANTENIMIENTO


class OrdenCompraViewSet(viewsets.ViewSet):
    permission_classes = [PuedeCrearOrdenCompra]

    def create(self, request):
        serializer = OrdenCompraSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        datos = serializer.validated_data

        try:
            resultado = crear_orden_compra(
                id_proveedor=datos["idProveedor"],
                id_usuario=request.user.idusuario,
                observaciones=datos.get("observaciones"),
                detalle=datos["detalle"]
            )

            return Response(
                {"ok": True, **resultado},
                status=status.HTTP_201_CREATED
            )

        except DatabaseError:
            return Response(
                {
                    "ok": False,
                    "mensaje": "No se pudo crear la orden de compra. Revisa los datos y la conexión."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def list(self, request):
        ordenes = listar_ordenes_compra()
        return Response(ordenes)




class PermisoIngresoBodega(SoloRoles):
    roles_permitidos = roles.MANTENIMIENTO


class IngresoBodegaViewSet(viewsets.ViewSet):
    permission_classes = [PermisoIngresoBodega]

    @action(detail=False, methods=["get"])
    def pendientes(self, request):
        return Response(obtener_pendientes_bodega())

    @action(detail=False, methods=["get"])
    def estantes(self, request):
        return Response(obtener_estantes_bodega())

    def create(self, request):
        serializer = IngresoBodegaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        datos = serializer.validated_data

        try:
            resultado = registrar_ingreso_bodega(
                datos["idCompra"],
                request.user.idusuario,
                datos.get("observaciones", ""),
                datos["detalle"]
            )

            return Response(
                resultado,
                status=status.HTTP_201_CREATED
            )

        except DatabaseError:
            return Response(
                {
                    "mensaje": "No se pudo registrar la recepción. "
                               "Revisa los datos y el procedimiento SQL."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


