import hmac
from decimal import Decimal, InvalidOperation

from django.conf import settings

DESCUENTO_MAXIMO = Decimal("50")


class AutorizacionDenegada(Exception):
    pass


class DescuentoInvalido(Exception):
    pass


def autorizar_descuento(clave, porcentaje):
    esperada = settings.DESCUENTO_CLAVE_AUTORIZACION

    if not esperada or not hmac.compare_digest(
        (clave or "").encode(), esperada.encode()
    ):
        raise AutorizacionDenegada("Contraseña incorrecta. No se aplicó el descuento.")

    try:
        valor = Decimal(str(porcentaje))
    except InvalidOperation:
        raise DescuentoInvalido("Ingrese un porcentaje válido entre 0 y 50.")

    if not valor.is_finite() or valor < 0 or valor > DESCUENTO_MAXIMO:
        raise DescuentoInvalido("Ingrese un porcentaje válido entre 0 y 50.")

    return valor
