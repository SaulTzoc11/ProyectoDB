from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer
from . import seguridad

from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

class RolViewSet(viewsets.ReadOnlyModelViewSet):
    """Consulta de roles existentes"""
    queryset = Rol.objects.all()
    serializer_class = RolSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    """Gestión completa de usuarios"""
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def create(self, request, *args, **kwargs):
        """
        El alta de usuarios se delega al SP dbo.sp_Usuario_Crear para que
        el cifrado de la contrasena ocurra dentro de la base de datos.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
 
        contrasena = request.data.get("contrasena", "")
        if not contrasena:
            return Response(
                {"contrasena": ["Este campo es obligatorio."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        resultado = seguridad.crear_usuario(
            id_rol=datos["idrol"].idrol,
            nombre_usuario=datos["nombreusuario"],
            contrasena=contrasena,
            nombres=datos["nombres"],
            apellidos=datos["apellidos"],
            correo=datos["correo"],
        )
 
        if not resultado["ok"]:
            return Response({"mensaje": resultado["mensaje"]},
                            status=status.HTTP_400_BAD_REQUEST)
 
        usuario = Usuario.objects.get(pk=resultado["idUsuario"])
        return Response(self.get_serializer(usuario).data,
                        status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        usuario = self.get_object()
        usuario.activo = False
        usuario.save(update_fields=["activo"])

        return Response(
            {"mensaje": "Usuario desactivado exitosamente"},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="cambiar-contrasena")
    def cambiar_contrasena(self, request, pk=None):
        nueva = request.data.get("contrasena_nueva", "")
        actual = request.data.get("contrasena_actual") or None
        es_admin = str(request.data.get("es_administrador", "")).lower() in ("1", "true", "on")
 
        if not nueva:
            return Response({"mensaje": "Debe indicar la nueva contrasena."},
                            status=status.HTTP_400_BAD_REQUEST)
 
        resultado = seguridad.cambiar_contrasena(
            id_usuario=pk,
            contrasena_nueva=nueva,
            contrasena_actual=actual,
            es_administrador=es_admin,
        )
 
        estado = status.HTTP_200_OK if resultado["ok"] else status.HTTP_400_BAD_REQUEST
        return Response(resultado, status=estado)
@csrf_exempt
@require_POST
def iniciar_sesion_api(request):
    nombre_usuario = request.POST.get("username", "").strip()
    contrasena = request.POST.get("password", "")

    if not nombre_usuario or not contrasena:
        return JsonResponse({
            "ok": False,
            "mensaje": "Debe ingresar usuario y contrasena."
        }, status=400)
 
    resultado = seguridad.validar_login(nombre_usuario, contrasena)
 
    if not resultado["ok"]:
        return JsonResponse({
            "ok": False,
            "mensaje": resultado["mensaje"]
        }, status=401)

    # Guardar información en la sesión
    request.session["usuario_id"] = resultado["idUsuario"]
    request.session["usuario_nombre"] = resultado["nombreUsuario"]
    request.session["usuario_rol"] = resultado["rol"]

    return JsonResponse({
        "ok": True,
        "usuario": {
            "id": resultado["idUsuario"],
            "username": resultado["nombreUsuario"],
            "name": resultado["nombreCompleto"],
            "role": resultado["rol"],
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