
import json
import re
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


def obtener_cotizacion_impresion(id_cotizacion):
    """Cabecera + líneas de DETALLE_COTIZACION listas para imprimir
    (sp_ObtenerCotizacionImpresion). Devuelve None si no existe."""
    with connection.cursor() as cur:
        cur.execute("EXEC dbo.sp_ObtenerCotizacionImpresion %s", [int(id_cotizacion)])
        fila = cur.fetchone()
        if fila is None:
            return None
        columnas = [c[0] for c in cur.description]
        cabecera = dict(zip(columnas, fila))

        cur.nextset()
        columnas = [c[0] for c in cur.description]
        detalle = [dict(zip(columnas, f)) for f in cur.fetchall()]
    return {"cabecera": cabecera, "detalle": detalle}


def listar_clientes_activos():
    """Clientes activos para el selector de la pantalla de cotización."""
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT c.idCliente, c.nombreCliente, c.nit, tc.nombre AS tipoCliente
            FROM dbo.CLIENTE c
            JOIN dbo.TIPO_CLIENTE tc ON tc.idTipoCliente = c.idTipoCliente
            WHERE c.activo = 1
            ORDER BY c.nombreCliente
            """
        )
        return [
            {"id": fila[0], "nombre": fila[1], "nit": fila[2], "tipo": fila[3]}
            for fila in cur.fetchall()
        ]



class CotizacionError(Exception):
    """Error de negocio levantado por un THROW del SP."""


def _mensaje(e: Exception) -> str:
    """Extrae el texto limpio del THROW de SQL Server (quita el prefijo del driver y el
    sufijo "(50010) (SQLExecDirectW)", conservando paréntesis propios del mensaje)."""
    txt = str(e.args[-1]) if e.args else str(e)
    txt = txt.split("]")[-1]
    txt = re.sub(r"\s*\(\d+\)\s*(\(SQL\w+\))?\s*$", "", txt)
    return txt.strip() or str(e)



def generar_cotizacion_json(id_cliente, id_usuario, lineas, observaciones=None):
    """Ejecuta dbo.sp_GenerarCotizacionJson.

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
    """Ejecuta dbo.sp_ConfirmarCotizacion (Pendiente -> Confirmada).
    Devuelve {"idCotizacion", "codigoCotizacion", "estado"}."""
    try:
        with connection.cursor() as cur:
            cur.execute(
                "EXEC dbo.sp_ConfirmarCotizacion %s, %s",
                [int(id_cotizacion), int(id_usuario)],
            )
            fila = cur.fetchone()
            return {"idCotizacion": fila[0], "codigoCotizacion": fila[1], "estado": fila[2]}
    except DatabaseError as e:
        raise CotizacionError(_mensaje(e))

class FacturaError(Exception):
    """Error de negocio levantado por un THROW de sp_FacturarJson (o de los SP que invoca)."""


def facturar_json(id_usuario, pagos, id_cotizacion=None, id_cliente=None,
                  detalle=None, observaciones=None):
    """Ejecuta dbo.sp_FacturarJson (transaccional: factura, detalle, PEPS, pagos y bitácora).

    pagos   = [{"idTipoPago": 1, "monto": Decimal, "observaciones": str|None}, ...]
    detalle = [(id_producto, cantidad, descuento_pct), ...]   # solo si no hay cotización
    Devuelve {"idFactura", "noFactura", "idCotizacion", "total"}.
    """
    pagos_json = json.dumps([
        {
            "idTipoPago": int(p["idTipoPago"]),
            "monto": float(p["monto"]),
            "observaciones": p.get("observaciones") or None,
        }
        for p in pagos
    ])
    detalle_json = None
    if id_cotizacion is None:
        detalle_json = json.dumps([
            {"idProducto": int(i), "cantidad": int(c), "descuento": float(d or 0)}
            for i, c, d in detalle
        ])
    try:
        with connection.cursor() as cur:
            cur.execute(
                "EXEC dbo.sp_FacturarJson @idUsuario=%s, @pagosJson=%s, @idCotizacion=%s, "
                "@idCliente=%s, @detalleJson=%s, @observaciones=%s",
                [
                    int(id_usuario),
                    pagos_json,
                    int(id_cotizacion) if id_cotizacion is not None else None,
                    int(id_cliente) if id_cliente is not None else None,
                    detalle_json,
                    observaciones,
                ],
            )
            fila = cur.fetchone()
            return {
                "idFactura": fila[0],
                "noFactura": fila[1],
                "idCotizacion": fila[2],
                "total": str(fila[3]),
            }
    except DatabaseError as e:
        raise FacturaError(_mensaje(e))


def listar_tipos_pago():
    """Medios de pago activos para la pantalla de facturación."""
    with connection.cursor() as cur:
        cur.execute("SELECT idTipoPago, nombre FROM dbo.TIPO_PAGO WHERE activo = 1 ORDER BY nombre")
        return [{"id": f[0], "nombre": f[1]} for f in cur.fetchall()]


def cotizaciones_por_facturar():
    """Cotizaciones Confirmadas que todavía no tienen factura."""
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT c.idCotizacion, c.codigoCotizacion, c.fecha, c.total, cl.nombreCliente
            FROM dbo.COTIZACION c
            JOIN dbo.ESTADO e   ON e.idEstado  = c.idEstado
            JOIN dbo.CLIENTE cl ON cl.idCliente = c.idCliente
            WHERE e.nombre = 'Confirmada'
              AND NOT EXISTS (SELECT 1 FROM dbo.FACTURA f WHERE f.idCotizacion = c.idCotizacion)
            ORDER BY c.fecha DESC
            """
        )
        return [
            {"id": f[0], "codigo": f[1], "fecha": f[2], "total": str(f[3]), "cliente": f[4]}
            for f in cur.fetchall()
        ]