from django.utils import timezone

from .models import (
    Rol,
    Usuario,
    TipoMovimiento,
    Motivo,
    Accion,
    Tabla,
)


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


def buscar_por_nombre(nombre_usuario):
    return Usuario.objects.filter(nombreusuario__iexact=nombre_usuario).first()


def buscar_por_correo(correo):
    return Usuario.objects.filter(correo__iexact=correo).first()


def obtener_activo(id_usuario):
    return (
        Usuario.objects.select_related("idrol")
        .filter(idusuario=id_usuario, activo=True)
        .first()
    )


def obtener_rol(nombre):
    return Rol.objects.filter(nombre__iexact=nombre).first()


def crear_usuario(*, idrol, nombreusuario, contrasena_cifrada, nombres,
                  apellidos, correo):
    return Usuario.objects.create(
        idrol=idrol,
        nombreusuario=nombreusuario,
        contrasenaencriptada=contrasena_cifrada,
        nombres=nombres,
        apellidos=apellidos,
        correo=correo,
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


def tipos_movimiento():
    return (
        TipoMovimiento.objects
        .all()
        .order_by("nombre")
    )


def motivos():
    return (
        Motivo.objects
        .all()
        .order_by("descripcion")
    )


def acciones():
    return (
        Accion.objects
        .all()
        .order_by("nombre")
    )


def tablas_sistema():
    return (
        Tabla.objects
        .all()
        .order_by("nombre")
    )