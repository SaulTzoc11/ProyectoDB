
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from usuarios.models import Usuario
from .models import Cotizacion, DetalleCotizacion
from .serializers import (
    CotizacionSerializer,
    DetalleCotizacionSerializer,
)


def obtener_empleado(request):
    usuario_id = request.session.get("usuario_id")

    if not usuario_id:
        raise PermissionDenied(
            "Debes iniciar sesión con una cuenta de empleado."
        )

    try:
        usuario = Usuario.objects.select_related("idrol").get(
            idusuario=usuario_id,
            activo=True
        )
    except Usuario.DoesNotExist:
        raise PermissionDenied("La sesión no corresponde a un usuario activo.")

    rol = usuario.idrol.nombre.strip().lower()

    if rol not in ("administrador", "digitador", "gerente"):
        raise PermissionDenied(
            "No tienes permisos para acceder a cotizaciones."
        )

    return usuario


class CotizacionViewSet(viewsets.ReadOnlyModelViewSet):
    """Permite consultar las cotizaciones del empleado autenticado."""

    serializer_class = CotizacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empleado = obtener_empleado(self.request)

        return (
            Cotizacion.objects
            .filter(idusuario=empleado.idusuario)
            .select_related("idcliente", "idusuario", "idestado")
            .prefetch_related("detalles")
            .order_by("-fecha")
        )


class DetalleCotizacionViewSet(viewsets.ReadOnlyModelViewSet):
    """Permite consultar detalles de cotizaciones propias."""

    serializer_class = DetalleCotizacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empleado = obtener_empleado(self.request)

        return DetalleCotizacion.objects.filter(
            idcotizacion__idusuario=empleado.idusuario
        ).select_related("idcotizacion", "idproducto")
