from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer

from django.http import JsonResponse
from django.contrib.auth.hashers import check_password
from django.views.decorators.http import require_POST
from django.utils import timezone

class RolViewSet(viewsets.ReadOnlyModelViewSet):
    """Consulta de roles existentes"""
    queryset = Rol.objects.all()
    serializer_class = RolSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    """Gestión completa de usuarios"""
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        usuario = self.get_object()
        usuario.activo = False
        usuario.save()

        return Response(
            {"mensaje": "Usuario desactivado exitosamente"},
            status=status.HTTP_200_OK
        )

@require_POST
def iniciar_sesion_api(request):
    nombre_usuario = request.POST.get("username", "").strip()
    contrasena = request.POST.get("password", "")

    try:
        usuario = Usuario.objects.select_related("idrol").get(
            nombreusuario=nombre_usuario,
            activo=True
        )
    except Usuario.DoesNotExist:
        return JsonResponse({
            "ok": False,
            "mensaje": "El usuario o la contraseña no son correctos."
        }, status=401)

    if not check_password(
        contrasena,
        usuario.contrasenaencriptada
    ):
        return JsonResponse({
            "ok": False,
            "mensaje": "El usuario o la contraseña no son correctos."
        }, status=401)

    usuario.ultimoacceso = timezone.now()
    usuario.save(update_fields=["ultimoacceso"])

    # Guardar información en la sesión
    request.session["usuario_id"] = usuario.idusuario
    request.session["usuario_nombre"] = usuario.nombreusuario
    request.session["usuario_rol"] = usuario.idrol.nombre

    nombre_completo = f"{usuario.nombres} {usuario.apellidos}".strip()

    return JsonResponse({
        "ok": True,
        "usuario": {
            "id": usuario.idusuario,
            "username": usuario.nombreusuario,
            "name": nombre_completo,
            "role": usuario.idrol.nombre
        }
    })


@require_POST
def cerrar_sesion_api(request):
    request.session.flush()

    return JsonResponse({
        "ok": True,
        "mensaje": "Sesión cerrada correctamente."
    })

# Muestra la página de inicio de sesión
def iniciar_sesion(request):
    return render(request, "usuarios/login.html")