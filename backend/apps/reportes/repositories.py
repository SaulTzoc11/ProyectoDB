"""Acceso a los procedimientos sp_Reporte_* de SQL Server (solo lectura)."""
from django.db import DatabaseError, connection


class ReporteError(Exception):
    """Error de validación levantado por un THROW del procedimiento."""


class FacturaNoEncontrada(ReporteError):
    """THROW 50020: no existe la factura buscada."""


def _mensaje(error):
    texto = str(error.args[-1]) if error.args else str(error)
    return texto.split("]")[-1].split("(")[0].strip() or texto


def _ejecutar(procedimiento, parametros=()):
    """Ejecuta un procedimiento y devuelve sus filas como lista de diccionarios."""
    marcas = ", ".join(["%s"] * len(parametros))
    sentencia = f"EXEC dbo.{procedimiento} {marcas}".strip()

    try:
        with connection.cursor() as cursor:
            cursor.execute(sentencia, list(parametros))
            columnas = [columna[0] for columna in cursor.description]
            return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
    except DatabaseError as error:
        mensaje = _mensaje(error)
        if "No existe una factura" in mensaje:
            raise FacturaNoEncontrada(mensaje) from error
        raise ReporteError(mensaje) from error


def total_facturado(desde, hasta):
    return _ejecutar("sp_Reporte_TotalFacturado", [desde, hasta])


def productos_mas_ingresos(desde, hasta, top):
    return _ejecutar("sp_Reporte_ProductosMasIngresos", [desde, hasta, top])


def productos_mas_vendidos(desde, hasta, top):
    return _ejecutar("sp_Reporte_ProductosMasVendidos", [desde, hasta, top])


def inventario_actual(id_bodega=None):
    return _ejecutar("sp_Reporte_InventarioActual", [id_bodega])


def productos_menos_vendidos(desde, hasta, top):
    return _ejecutar("sp_Reporte_ProductosMenosVendidos", [desde, hasta, top])


def productos_sin_stock():
    return _ejecutar("sp_Reporte_ProductosSinStock")


def factura(no_factura):
    encabezado = _ejecutar("sp_Reporte_Factura", [no_factura])
    return {
        "factura": encabezado[0] if encabezado else None,
        "detalle": _ejecutar("sp_Reporte_FacturaDetalle", [no_factura]),
        "pagos": _ejecutar("sp_Reporte_FacturaPagos", [no_factura]),
    }
