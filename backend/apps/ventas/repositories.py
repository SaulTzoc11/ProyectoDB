
import json
from decimal import Decimal

import pyodbc
from django.db import DatabaseError, connection

from .models import Cotizacion, DetalleCotizacion



def cotizaciones_de_usuario(id_usuario):
    return (
        Cotizacion.objects.filter(idusuario=id_usuario)
        .select_related("idcliente", "idusuario", "idestado")
        .prefetch_related("detalles")
        .order_by("-fecha")
    )


def detalles_de_usuario(id_usuario):
    return DetalleCotizacion.objects.filter(
        idcotizacion__idusuario=id_usuario
    ).select_related("idcotizacion", "idproducto")


def obtener_cotizacion(id_cotizacion):
    """Una cotización con cliente, estado y detalles (con su producto) precargados."""
    return (
        Cotizacion.objects
        .select_related("idcliente", "idusuario", "idestado")
        .prefetch_related("detalles__idproducto")
        .filter(pk=id_cotizacion)
        .first()
    )



class CotizacionError(Exception):
    """Error de negocio levantado por un THROW del SP."""


def _mensaje(e: Exception) -> str:
    """Extrae el texto limpio del THROW de SQL Server."""
    txt = str(e.args[-1]) if e.args else str(e)
    return txt.split("]")[-1].split("(")[0].strip() or txt



def generar_cotizacion_json(id_cliente, id_usuario, lineas, observaciones=None):
    """Aqui es donde se ejecuta dbo.sp_GenerarCotizacionJson.

    lineas = [(id_producto, cantidad, descuento_pct), ...]
    Devuelve (idCotizacion, codigoCotizacion).
    """
    detalle = [
        {"idProducto": int(i), "cantidad": int(c), "descuento": float(d or 0)}
        for i, c, d in lineas
    ]
    try:
        with connection.cursor() as cur:
            cur.execute(
                "EXEC dbo.sp_GenerarCotizacionJson %s, %s, %s, %s",
                [int(id_cliente), int(id_usuario), observaciones, json.dumps(detalle)],
            )
            fila = cur.fetchone()
            return fila[0], fila[1]
    except DatabaseError as e:
        raise CotizacionError(_mensaje(e))





def confirmar_cotizacion(id_cotizacion, id_usuario):
    """Ejecuta dbo.sp_ConfirmarCotizacion (Pendiente -> Confirmada)."""
    try:
        with connection.cursor() as cur:
            cur.execute(
                "EXEC dbo.sp_ConfirmarCotizacion %s, %s",
                [int(id_cotizacion), int(id_usuario)],
            )
    except DatabaseError as e:
        raise CotizacionError(_mensaje(e))
    

