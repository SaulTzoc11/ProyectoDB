from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import render
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer


class RolViewSet(viewsets.ModelViewSet):
    """Permite listar, crear, editar y eliminar roles."""

    queryset = Rol.objects.all()
    serializer_class = RolSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    """Permite administrar los usuarios."""

    queryset = Usuario.objects.select_related("idrol").all()
    serializer_class = UsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        """
        Al eliminar un usuario, se desactiva en lugar de borrarlo
        permanentemente de la base de datos.
        """
        usuario = self.get_object()
        usuario.activo = False
        usuario.save(update_fields=["activo"])

        return Response(
            {"mensaje": "Usuario desactivado correctamente."},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="activar")
    def activar(self, request, pk=None):
        usuario = self.get_object()
        usuario.activo = True
        usuario.save(update_fields=["activo"])

        return Response({
            "mensaje": "Usuario activado correctamente.",
            "usuario": self.get_serializer(usuario).data
        })

    @action(
        detail=True,
        methods=["post"],
        url_path="cambiar-contrasena"
    )
    def cambiar_contrasena(self, request, pk=None):
        usuario = self.get_object()
        nueva_contrasena = request.data.get("contrasena", "")

        if len(nueva_contrasena) < 8:
            return Response(
                {
                    "contrasena": [
                        "La contrasena debe tener al menos 8 caracteres."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.contrasenaencriptada = make_password(nueva_contrasena)
        usuario.save(update_fields=["contrasenaencriptada"])

        return Response({
            "mensaje": "Contrasena actualizada correctamente."
        })


@api_view(["POST"])
def iniciar_sesion_api(request):
    """
    Valida el usuario y la contrasena enviada desde el formulario.
    """
    nombre_usuario = request.data.get(
        "username",
        request.data.get("nombreusuario", "")
    ).strip()

    contrasena = request.data.get(
        "password",
        request.data.get("contrasena", "")
    )

    if not nombre_usuario or not contrasena:
        return Response(
            {
                "ok": False,
                "mensaje": "Debe ingresar el usuario y la contrasena."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        usuario = Usuario.objects.select_related("idrol").get(
            nombreusuario=nombre_usuario,
            activo=True
        )
    except Usuario.DoesNotExist:
        return Response(
            {
                "ok": False,
                "mensaje": "El usuario o la contrasena no son correctos."
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Compara la contrasena escrita con el hash almacenado.
    if not check_password(
    contrasena,
    usuario.contrasenaencriptada
    ):
        return Response(
            {
                "ok": False,
                "mensaje": "El usuario o la contrasena no son correctos."
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    usuario.ultimoacceso = timezone.now()
    usuario.save(update_fields=["ultimoacceso"])

    rol_nombre = usuario.idrol.nombre if usuario.idrol else ""

    # Guarda los datos del usuario en la sesion.
    request.session["usuario_id"] = usuario.idusuario
    request.session["usuario_nombre"] = usuario.nombreusuario
    request.session["usuario_rol"] = rol_nombre

    nombre_completo = (
        f"{usuario.nombres} {usuario.apellidos}"
    ).strip()

    return Response({
        "ok": True,
        "mensaje": "Inicio de sesion correcto.",
        "usuario": {
            "id": usuario.idusuario,
            "username": usuario.nombreusuario,
            "name": nombre_completo,
            "role": rol_nombre
        }
    })


@api_view(["POST"])
def cerrar_sesion_api(request):
    request.session.flush()

    return Response({
        "ok": True,
        "mensaje": "Sesion cerrada correctamente."
    })


def iniciar_sesion(request):
    """Muestra la pantalla de inicio de sesion."""

    return render(request, "usuarios/login.html")