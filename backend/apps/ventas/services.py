
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



def generar_cotizacion(id_usuario, id_cliente, detalle, observaciones=None, tokens_descuento=()):
   
    pedido = max((Decimal(l["descuento"]) for l in detalle), default=Decimal("0"))

    if pedido > DESCUENTO_MAXIMO:
        raise DescuentoInvalido("El descuento no puede superar el 50 %.")
    if pedido > 0 and pedido > _porcentaje_autorizado(id_usuario, tokens_descuento):
        raise AutorizacionDenegada("Descuento no autorizado o autorización vencida.")

    lineas = [(l["idProducto"], l["cantidad"], l["descuento"]) for l in detalle]
    return repositories.generar_cotizacion_json(id_cliente, id_usuario, lineas, observaciones)



def confirmar_cotizacion(id_cotizacion, id_usuario):
    
    return repositories.confirmar_cotizacion(id_cotizacion, id_usuario)

def _validar_descuentos(id_usuario, detalle, tokens_descuento):
    """Misma regla que al cotizar: sobre 0 % hace falta un token de autorización vigente."""
    pedido = max((Decimal(l["descuento"]) for l in detalle), default=Decimal("0"))
    if pedido > DESCUENTO_MAXIMO:
        raise DescuentoInvalido("El descuento no puede superar el 50 %.")
    if pedido > 0 and pedido > _porcentaje_autorizado(id_usuario, tokens_descuento):
        raise AutorizacionDenegada("Descuento no autorizado o autorización vencida.")


def facturar(id_usuario, pagos, id_cotizacion=None, id_cliente=None,
             detalle=None, observaciones=None, tokens_descuento=()):
    """Facturar una cotización confirmada, o cotizar y facturar en el momento."""
    lineas = None
    if id_cotizacion is None:
        _validar_descuentos(id_usuario, detalle, tokens_descuento)
        lineas = [(l["idProducto"], l["cantidad"], l["descuento"]) for l in detalle]
    return repositories.facturar_json(
        id_usuario, pagos,
        id_cotizacion=id_cotizacion, id_cliente=id_cliente,
        detalle=lineas, observaciones=observaciones,
    )