from django.db import connection
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.nucleo.permissions import SoloGerente



CONSULTAS = {
    "ESTADO": (
        "idEstado",
        "",
        "",
        "t.nombre, t.idEstado"
    ),

    "LOTE": (
        "idLote",
        "LEFT JOIN ESTANTE e ON t.idEstante=e.idEstante "
        "LEFT JOIN BODEGA b ON e.idBodega=b.idBodega "
        "LEFT JOIN ESTADO es ON t.idEstado=es.idEstado "
        "LEFT JOIN DETALLE_ENTREGA de "
        "ON t.idDetalleEntrega=de.idDetalleEntrega "
        "LEFT JOIN DETALLE_COMPRA dc "
        "ON de.idDetalleCompra=dc.idDetalleCompra "
        "LEFT JOIN PRODUCTO p ON dc.idProducto=p.idProducto "
        "LEFT JOIN PRODUCTO_GENERAL pg "
        "ON p.idProductoGeneral=pg.idProductoGeneral",
        "CONCAT(b.nombre, ' / ', e.codigoEstante) AS estante_nombre, "
        "es.nombre AS estado_nombre, pg.nombre AS producto_nombre",
        "t.codigoLote, e.codigoEstante, b.nombre, es.nombre, pg.nombre"
    ),

    "MODIFICACION_INVENTARIO": (
        "idModificacionInventario",
        "LEFT JOIN LOTE l ON t.idLote=l.idLote "
        "LEFT JOIN TIPO_MOVIMIENTO tm "
        "ON t.idTipoMovimiento=tm.idTipoMovimiento "
        "LEFT JOIN USUARIO u ON t.idUsuario=u.idUsuario",
        "l.codigoLote AS lote_nombre, "
        "tm.nombre AS tipo_movimiento_nombre, "
        "CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre",
        "l.codigoLote, tm.nombre, u.nombres, u.apellidos, "
        "t.observaciones"
    ),

    "MOVIMIENTO": (
        "idMovimiento",
        "LEFT JOIN USUARIO u ON t.idUsuario=u.idUsuario "
        "LEFT JOIN ACCION a ON t.idAccion=a.idAccion "
        "LEFT JOIN TABLA ta ON t.idTabla=ta.idTabla",
        "CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre, "
        "a.nombre AS accion_nombre, ta.nombre AS tabla_nombre",
        "u.nombres, u.apellidos, a.nombre, ta.nombre, "
        "t.informacionModificada"
    ),

    "COMPRA": (
        "idCompra",
        "LEFT JOIN PROVEEDOR pr ON t.idProveedor=pr.idProveedor "
        "LEFT JOIN ESTADO es ON t.idEstado=es.idEstado "
        "LEFT JOIN USUARIO u ON t.idUsuario=u.idUsuario",
        "pr.nombreProveedor AS proveedor_nombre, "
        "es.nombre AS estado_nombre, "
        "CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre",
        "t.codigoCompra, pr.nombreProveedor, es.nombre, "
        "u.nombres, u.apellidos"
    ),

    "DETALLE_COMPRA": (
        "idDetalleCompra",
        "LEFT JOIN COMPRA c ON t.idCompra=c.idCompra "
        "LEFT JOIN PROVEEDOR pr ON c.idProveedor=pr.idProveedor "
        "LEFT JOIN PRODUCTO p ON t.idProducto=p.idProducto "
        "LEFT JOIN PRODUCTO_GENERAL pg "
        "ON p.idProductoGeneral=pg.idProductoGeneral "
        "LEFT JOIN PRESENTACION pp "
        "ON p.idPresentacion=pp.idPresentacion "
        "LEFT JOIN ESTADO es ON t.idEstado=es.idEstado",
        "c.codigoCompra AS compra_codigo, "
        "pr.nombreProveedor AS proveedor_nombre, "
        "CONCAT(pg.nombre, ' / ', pp.nombre) AS producto_nombre, "
        "es.nombre AS estado_nombre",
        "c.codigoCompra, pr.nombreProveedor, pg.nombre, "
        "pp.nombre, es.nombre"
    ),

    "ENTREGA": (
        "idEntrega",
        "LEFT JOIN COMPRA c ON t.idCompra=c.idCompra "
        "LEFT JOIN PROVEEDOR pr ON c.idProveedor=pr.idProveedor "
        "LEFT JOIN ESTADO es ON t.idEstado=es.idEstado "
        "LEFT JOIN USUARIO u ON t.idUsuario=u.idUsuario",
        "c.codigoCompra AS compra_codigo, "
        "pr.nombreProveedor AS proveedor_nombre, "
        "es.nombre AS estado_nombre, "
        "CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre",
        "t.codigoEntrega, c.codigoCompra, pr.nombreProveedor, "
        "es.nombre, u.nombres"
    ),

    "DETALLE_ENTREGA": (
        "idDetalleEntrega",
        "LEFT JOIN ENTREGA e ON t.idEntrega=e.idEntrega "
        "LEFT JOIN COMPRA c ON e.idCompra=c.idCompra "
        "LEFT JOIN PROVEEDOR pr ON c.idProveedor=pr.idProveedor "
        "LEFT JOIN DETALLE_COMPRA dc "
        "ON t.idDetalleCompra=dc.idDetalleCompra "
        "LEFT JOIN PRODUCTO p ON dc.idProducto=p.idProducto "
        "LEFT JOIN PRODUCTO_GENERAL pg "
        "ON p.idProductoGeneral=pg.idProductoGeneral "
        "LEFT JOIN PRESENTACION pp "
        "ON p.idPresentacion=pp.idPresentacion",
        "e.codigoEntrega AS entrega_codigo, "
        "c.codigoCompra AS compra_codigo, "
        "pr.nombreProveedor AS proveedor_nombre, "
        "CONCAT(pg.nombre, ' / ', pp.nombre) "
        "AS detalle_compra_nombre",
        "e.codigoEntrega, c.codigoCompra, pr.nombreProveedor, "
        "pg.nombre, pp.nombre"
    ),

    "COTIZACION": (
        "idCotizacion",
        "LEFT JOIN CLIENTE cl ON t.idCliente=cl.idCliente "
        "LEFT JOIN ESTADO es ON t.idEstado=es.idEstado "
        "LEFT JOIN USUARIO u ON t.idUsuario=u.idUsuario",
        "cl.nombreCliente AS cliente_nombre, "
        "es.nombre AS estado_nombre, "
        "CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre",
        "t.codigoCotizacion, cl.nombreCliente, cl.nit, "
        "es.nombre, u.nombres"
    ),

    "DETALLE_COTIZACION": (
        "idDetalleCotizacion",
        "LEFT JOIN COTIZACION c "
        "ON t.idCotizacion=c.idCotizacion "
        "LEFT JOIN CLIENTE cl ON c.idCliente=cl.idCliente "
        "LEFT JOIN PRODUCTO p ON t.idProducto=p.idProducto "
        "LEFT JOIN PRODUCTO_GENERAL pg "
        "ON p.idProductoGeneral=pg.idProductoGeneral "
        "LEFT JOIN PRESENTACION pp "
        "ON p.idPresentacion=pp.idPresentacion",
        "c.codigoCotizacion AS cotizacion_codigo, "
        "cl.nombreCliente AS cliente_nombre, "
        "CONCAT(pg.nombre, ' / ', pp.nombre) AS producto_nombre",
        "c.codigoCotizacion, cl.nombreCliente, pg.nombre, pp.nombre"
    ),

    "FACTURA": (
        "idFactura",
        "LEFT JOIN CLIENTE cl ON t.idCliente=cl.idCliente "
        "LEFT JOIN ESTADO es ON t.idEstado=es.idEstado "
        "LEFT JOIN USUARIO u ON t.idUsuario=u.idUsuario "
        "LEFT JOIN COTIZACION c "
        "ON t.idCotizacion=c.idCotizacion",
        "cl.nombreCliente AS cliente_nombre, "
        "es.nombre AS estado_nombre, "
        "CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre, "
        "c.codigoCotizacion AS cotizacion_codigo",
        "t.noFactura, cl.nombreCliente, cl.nit, "
        "es.nombre, c.codigoCotizacion"
    ),

    "DETALLE_FACTURA": (
        "idDetalleFactura",
        "LEFT JOIN FACTURA f ON t.idFactura=f.idFactura "
        "LEFT JOIN CLIENTE cl ON f.idCliente=cl.idCliente "
        "LEFT JOIN PRODUCTO p ON t.idProducto=p.idProducto "
        "LEFT JOIN PRODUCTO_GENERAL pg "
        "ON p.idProductoGeneral=pg.idProductoGeneral "
        "LEFT JOIN PRESENTACION pp "
        "ON p.idPresentacion=pp.idPresentacion",
        "f.noFactura AS factura_numero, "
        "cl.nombreCliente AS cliente_nombre, "
        "CONCAT(pg.nombre, ' / ', pp.nombre) AS producto_nombre",
        "f.noFactura, cl.nombreCliente, pg.nombre, pp.nombre"
    ),

    "PAGO": (
        "idPago",
        "LEFT JOIN FACTURA f ON t.idFactura=f.idFactura "
        "LEFT JOIN CLIENTE cl ON f.idCliente=cl.idCliente "
        "LEFT JOIN TIPO_PAGO tp ON t.idTipoPago=tp.idTipoPago "
        "LEFT JOIN USUARIO u ON t.idUsuario=u.idUsuario",
        "f.noFactura AS factura_numero, "
        "cl.nombreCliente AS cliente_nombre, "
        "tp.nombre AS tipo_pago_nombre, "
        "CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre",
        "f.noFactura, cl.nombreCliente, tp.nombre, "
        "u.nombres, u.apellidos"
    ),

    "DEVOLUCION": (
        "idDevolucion",
        "LEFT JOIN FACTURA f ON t.idFactura=f.idFactura "
        "LEFT JOIN CLIENTE cl ON f.idCliente=cl.idCliente "
        "LEFT JOIN MOTIVO m ON t.idMotivo=m.idMotivo "
        "LEFT JOIN ESTADO es ON t.idEstado=es.idEstado",
        "f.noFactura AS factura_numero, "
        "cl.nombreCliente AS cliente_nombre, "
        "m.descripcion AS motivo_nombre, "
        "es.nombre AS estado_nombre",
        "t.codigoDevolucion, f.noFactura, cl.nombreCliente, "
        "m.descripcion, es.nombre"
    ),

    "DETALLE_DEVOLUCION": (
        "idDevolucion",
        "LEFT JOIN DEVOLUCION d "
        "ON t.idDevolucion=d.idDevolucion "
        "LEFT JOIN FACTURA f ON d.idFactura=f.idFactura "
        "LEFT JOIN CLIENTE cl ON f.idCliente=cl.idCliente "
        "LEFT JOIN DETALLE_FACTURA df "
        "ON t.idDetalleFactura=df.idDetalleFactura "
        "LEFT JOIN PRODUCTO p ON df.idProducto=p.idProducto "
        "LEFT JOIN PRODUCTO_GENERAL pg "
        "ON p.idProductoGeneral=pg.idProductoGeneral",
        "d.codigoDevolucion AS devolucion_codigo, "
        "f.noFactura AS factura_numero, "
        "cl.nombreCliente AS cliente_nombre, "
        "pg.nombre AS detalle_factura_nombre",
        "d.codigoDevolucion, f.noFactura, cl.nombreCliente, "
        "pg.nombre"
    ),
}

# Permite consultar los detalles de un registro específico.
DETALLES = {
    "DETALLE_COMPRA": "idCompra",
    "DETALLE_ENTREGA": "idEntrega",
    "DETALLE_COTIZACION": "idCotizacion",
    "DETALLE_FACTURA": "idFactura",
    "DETALLE_DEVOLUCION": "idDevolucion",
}


class ConsultaMantenimientoView(APIView):
    permission_classes = [SoloGerente]
    http_method_names = ["get", "head", "options"]

    def get(self, request, tabla):
        tabla = tabla.upper()

        if tabla not in CONSULTAS:
            raise NotFound("Consulta no encontrada")

        columna_orden, joins, adicionales, buscables = CONSULTAS[tabla]

        extra = f", {adicionales}" if adicionales else ""

        sql = (
            f"SELECT TOP (200) t.*{extra} "
            f"FROM [dbo].[{tabla}] t {joins}"
        )

        condiciones = []
        parametros = []

        # Filtrar por una compra, factura, entrega, etc.
        padre = request.query_params.get("padre", "")

        if padre and tabla in DETALLES:
            try:
                padre_id = int(padre)
                if padre_id <= 0:
                    raise ValueError
            except ValueError:
                return Response(
                    {"mensaje": "Identificador inválido."},
                    status=400
                )

            condiciones.append(
                f"t.[{DETALLES[tabla]}] = %s"
            )
            parametros.append(padre_id)

        # Buscar en nombres, códigos y registros relacionados.
        busqueda = request.query_params.get(
            "q", ""
        ).strip()[:80]

        if busqueda:
            condiciones.append(
                f"CONCAT_WS(' ', {buscables}) LIKE %s"
            )
            parametros.append(f"%{busqueda}%")

        if condiciones:
            sql += " WHERE " + " AND ".join(condiciones)

        sql += f" ORDER BY t.[{columna_orden}] DESC"

        if tabla == "DETALLE_DEVOLUCION":
            sql += ", t.[idDetalleFactura] DESC"

        with connection.cursor() as cursor:
            cursor.execute(sql, parametros)

            columnas = [
                campo[0].lower()
                for campo in cursor.description
            ]

            registros = [
                dict(zip(columnas, fila))
                for fila in cursor.fetchall()
            ]

        return Response(registros)
