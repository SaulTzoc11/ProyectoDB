
import hmac
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core import signing

from . import repositories

DESCUENTO_MAXIMO = Decimal("50")

_SALT = "autorizacion-descuento"
_VIGENCIA_SEGUNDOS = 15 * 60          


class AutorizacionDenegada(Exception):
    pass


class DescuentoInvalido(Exception):
    pass



def autorizar_descuento(clave, porcentaje):
    esperada = settings.DESCUENTO_CLAVE_AUTORIZACION

    
    if not esperada or not hmac.compare_digest(
        str(clave or "").encode(), esperada.encode()
    ):
        raise AutorizacionDenegada("Contraseña incorrecta. No se aplicó el descuento.")

    try:
        valor = Decimal(str(porcentaje))
    except InvalidOperation:
        raise DescuentoInvalido("Ingrese un porcentaje válido entre 0 y 50.") from None

    if not valor.is_finite() or valor < 0 or valor > DESCUENTO_MAXIMO:
        raise DescuentoInvalido("Ingrese un porcentaje válido entre 0 y 50.")

    return valor


def emitir_token_descuento(id_usuario, porcentaje):
    """Prueba firmada de que ESTE usuario autorizó hasta 'porcentaje' de descuento."""
    return signing.dumps({"u": id_usuario, "p": str(porcentaje)}, salt=_SALT)


def _porcentaje_autorizado(id_usuario, tokens):
    maximo = Decimal("0")
    for token in tokens:
        try:
            datos = signing.loads(token, salt=_SALT, max_age=_VIGENCIA_SEGUNDOS)
        except signing.BadSignature:                 
            continue
        if datos["u"] == id_usuario:
            maximo = max(maximo, Decimal(datos["p"]))
    return maximo


#aqui es donde se genera la cotizacion
def generar_cotizacion(id_usuario, id_cliente, detalle, observaciones=None, tokens_descuento=()):
    """detalle = lista de dicts validados: {idProducto, cantidad, descuento}
    Devuelve (idCotizacion, codigoCotizacion)."""
    pedido = max((Decimal(l["descuento"]) for l in detalle), default=Decimal("0"))

    if pedido > DESCUENTO_MAXIMO:
        raise DescuentoInvalido("El descuento no puede superar el 50 %.")
    if pedido > 0 and pedido > _porcentaje_autorizado(id_usuario, tokens_descuento):
        raise AutorizacionDenegada("Descuento no autorizado o autorización vencida.")

    lineas = [(l["idProducto"], l["cantidad"], l["descuento"]) for l in detalle]
    return repositories.generar_cotizacion_json(id_cliente, id_usuario, lineas, observaciones)
