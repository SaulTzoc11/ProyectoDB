import math
import re
from datetime import timedelta

from django.utils import timezone

from . import passwords, repositories

LARGO_MINIMO_CONTRASENA = 8
MAXIMO_INTENTOS = 5
MINUTOS_BLOQUEO = 5
MENSAJE_POLITICA = (
    "La contraseña debe tener al menos 8 caracteres, "
    "una mayúscula, una minúscula y un número."
)


class CredencialesInvalidas(Exception):
    pass


class CuentaBloqueada(Exception):
    def __init__(self, minutos):
        self.minutos = minutos
        super().__init__(
            f"Cuenta bloqueada temporalmente. Intente de nuevo en {minutos} minuto(s)."
        )


class ContrasenaInvalida(Exception):
    pass


def _minutos_restantes(bloqueado_hasta):
    segundos = (bloqueado_hasta - timezone.now()).total_seconds()
    return max(1, math.ceil(segundos / 60))


def autenticar(nombre_usuario, contrasena):
    usuario = repositories.buscar_activo_por_nombre(nombre_usuario)

    if usuario is None:
        raise CredencialesInvalidas()

    if usuario.bloqueadohasta and usuario.bloqueadohasta > timezone.now():
        raise CuentaBloqueada(_minutos_restantes(usuario.bloqueadohasta))

    coincide, actualizar = passwords.verificar(
        contrasena, usuario.contrasenaencriptada
    )

    if not coincide:
        bloquear_hasta = None
        if usuario.intentosfallidos + 1 >= MAXIMO_INTENTOS:
            bloquear_hasta = timezone.now() + timedelta(minutes=MINUTOS_BLOQUEO)
        repositories.registrar_intento_fallido(usuario, bloquear_hasta)
        raise CredencialesInvalidas()

    if actualizar:
        repositories.guardar_contrasena(usuario, passwords.cifrar(contrasena))

    repositories.reiniciar_intentos(usuario)
    return usuario


def validar_contrasena(contrasena):
    contrasena = contrasena or ""
    cumple = (
        len(contrasena) >= LARGO_MINIMO_CONTRASENA
        and re.search(r"[A-Z]", contrasena)
        and re.search(r"[a-z]", contrasena)
        and re.search(r"[0-9]", contrasena)
    )
    if not cumple:
        raise ContrasenaInvalida(MENSAJE_POLITICA)


def cambiar_contrasena(usuario, contrasena_nueva):
    validar_contrasena(contrasena_nueva)
    repositories.guardar_contrasena(usuario, passwords.cifrar(contrasena_nueva))


def activar_usuario(usuario):
    repositories.cambiar_estado(usuario, True)
    return usuario


def desactivar_usuario(usuario):
    repositories.cambiar_estado(usuario, False)
    return usuario
