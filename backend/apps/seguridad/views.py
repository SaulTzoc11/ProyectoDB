from django.middleware.csrf import get_token, rotate_token
from rest_framework import status, viewsets
from rest_framework.decorators import (
    action,
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.nucleo.permissions import SoloGerente

from . import repositories, services
from .authentication import CLAVE_SESION
from .serializers import RolSerializer, SesionSerializer, UsuarioSerializer

MENSAJE_CREDENCIALES = "El usuario o la contraseña no son correctos."


class RolViewSet(viewsets.ModelViewSet):
    queryset = repositories.listar_roles()
    serializer_class = RolSerializer
    permission_classes = [SoloGerente]


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = repositories.listar_usuarios()
    serializer_class = UsuarioSerializer
    permission_classes = [SoloGerente]

    def destroy(self, request, *args, **kwargs):
        services.desactivar_usuario(self.get_object())
        return Response({"mensaje": "Usuario desactivado correctamente."})

    @action(detail=True, methods=["post"], url_path="activar")
    def activar(self, request, pk=None):
        usuario = services.activar_usuario(self.get_object())
        return Response(
            {
                "mensaje": "Usuario activado correctamente.",
                "usuario": self.get_serializer(usuario).data,
            }
        )

    @action(
        detail=True, methods=["post"], url_path="cambiar-contrasena"
    )
    def cambiar_contrasena(self, request, pk=None):
        try:
            services.cambiar_contrasena(
                self.get_object(), request.data.get("contrasena", "")
            )
        except services.ContrasenaInvalida as error:
            return Response(
                {"contrasena": [str(error)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"mensaje": "Contraseña actualizada correctamente."})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def iniciar_sesion(request):
    nombre_usuario = request.data.get(
        "username", request.data.get("nombreusuario", "")
    ).strip()
    contrasena = request.data.get(
        "password", request.data.get("contrasena", "")
    )

    if not nombre_usuario or not contrasena:
        return Response(
            {"ok": False, "mensaje": "Debe ingresar el usuario y la contraseña."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        usuario = services.autenticar(nombre_usuario, contrasena)
    except services.CuentaBloqueada as error:
        return Response(
            {"ok": False, "mensaje": str(error)},
            status=status.HTTP_423_LOCKED,
        )
    except services.CredencialesInvalidas:
        return Response(
            {"ok": False, "mensaje": MENSAJE_CREDENCIALES},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    request.session.cycle_key()
    request.session[CLAVE_SESION] = usuario.idusuario
    rotate_token(request._request)

    return Response(
        {
            "ok": True,
            "mensaje": "Inicio de sesión correcto.",
            "usuario": SesionSerializer(usuario).data,
        }
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def cerrar_sesion(request):
    request.session.flush()
    return Response({"ok": True, "mensaje": "Sesión cerrada correctamente."})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def token_csrf(request):
    get_token(request._request)
    return Response({"ok": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sesion_actual(request):
    return Response(SesionSerializer(request.user).data)
