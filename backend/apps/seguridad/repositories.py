from django.utils import timezone

from .models import Rol, Usuario


def listar_usuarios():
    return Usuario.objects.select_related("idrol").order_by("nombreusuario")


def listar_roles():
    return Rol.objects.all().order_by("nombre")


def buscar_activo_por_nombre(nombre_usuario):
    return (
        Usuario.objects.select_related("idrol")
        .filter(nombreusuario=nombre_usuario, activo=True)
        .first()
    )


def obtener_activo(id_usuario):
    return (
        Usuario.objects.select_related("idrol")
        .filter(idusuario=id_usuario, activo=True)
        .first()
    )


def guardar_contrasena(usuario, contrasena_cifrada):
    usuario.contrasenaencriptada = contrasena_cifrada
    usuario.save(update_fields=["contrasenaencriptada"])


def cambiar_estado(usuario, activo):
    usuario.activo = activo
    usuario.save(update_fields=["activo"])


def registrar_intento_fallido(usuario, bloquear_hasta=None):
    usuario.intentosfallidos += 1
    campos = ["intentosfallidos"]
    if bloquear_hasta is not None:
        usuario.bloqueadohasta = bloquear_hasta
        campos.append("bloqueadohasta")
    usuario.save(update_fields=campos)


def reiniciar_intentos(usuario):
    usuario.intentosfallidos = 0
    usuario.bloqueadohasta = None
    usuario.ultimoacceso = timezone.now()
    usuario.save(
        update_fields=["intentosfallidos", "bloqueadohasta", "ultimoacceso"]
    )
