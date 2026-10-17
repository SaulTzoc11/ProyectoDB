from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import services
from .permissions import LecturaGeneralEscrituraMantenimiento


class MantenimientoViewSet(viewsets.ModelViewSet):
    """CRUD de catálogos: DELETE desactiva si existe el campo activo."""

    permission_classes = [LecturaGeneralEscrituraMantenimiento]

    def destroy(self, request, *args, **kwargs):
        registro = self.get_object()

        try:
            resultado = services.desactivar_o_eliminar(registro)
        except services.RegistroEnUso as error:
            return Response(
                {"mensaje": str(error)}, status=status.HTTP_409_CONFLICT
            )

        if resultado == "desactivado":
            return Response(
                {"mensaje": "Registro desactivado correctamente."}
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="activar")
    def activar(self, request, pk=None):
        registro = self.get_object()

        try:
            services.activar(registro)
        except services.RegistroNoActivable as error:
            return Response(
                {"mensaje": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "mensaje": "Registro activado correctamente.",
                "registro": self.get_serializer(registro).data,
            }
        )
