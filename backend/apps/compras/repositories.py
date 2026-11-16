
import json
from django.db import connection


def crear_orden_compra(id_proveedor, id_usuario, observaciones, detalle):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            EXEC dbo.sp_CrearOrdenCompra
                @idProveedor = %s,
                @idUsuario = %s,
                @observaciones = %s,
                @detalle = %s
            """,
            [
                id_proveedor,
                id_usuario,
                observaciones,
                json.dumps(detalle, default=str),
            ]
        )

        fila = cursor.fetchone()

        return {
            "idCompra": fila[0],
            "codigoCompra": fila[1],
            "total": str(fila[2]),
            "mensaje": fila[3],
        }


def listar_ordenes_compra():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                c.idCompra,
                c.codigoCompra,
                p.nombreProveedor,
                c.fechaCompra,
                c.total,
                e.nombre
            FROM COMPRA c
            INNER JOIN PROVEEDOR p
                ON c.idProveedor = p.idProveedor
            INNER JOIN ESTADO e
                ON c.idEstado = e.idEstado
            ORDER BY c.idCompra DESC
        """)

        return [
            {
                "idCompra": fila[0],
                "codigoCompra": fila[1],
                "proveedor": fila[2],
                "fecha": fila[3].isoformat() if fila[3] else "",
                "total": str(fila[4]),
                "estado": fila[5]
            }
            for fila in cursor.fetchall()
        ]

def obtener_pendientes_bodega():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                c.idCompra, c.codigoCompra,
                p.nombreProveedor,
                d.idDetalleCompra, d.idProducto,
                d.cantidad,
                d.cantidad - COALESCE(r.recibido, 0)
            FROM COMPRA c
            JOIN PROVEEDOR p
                ON p.idProveedor = c.idProveedor
            JOIN DETALLE_COMPRA d
                ON d.idCompra = c.idCompra
            OUTER APPLY (
                SELECT SUM(de.cantidadEntregada) recibido
                FROM DETALLE_ENTREGA de
                JOIN ENTREGA e
                    ON e.idEntrega = de.idEntrega
                JOIN ESTADO es
                    ON es.idEstado = e.idEstado
                WHERE de.idDetalleCompra = d.idDetalleCompra
                  AND es.nombre <> 'Anulada'
            ) r
            JOIN ESTADO ec
                ON ec.idEstado = c.idEstado
            WHERE ec.nombre IN ('Pendiente', 'Parcial')
              AND d.cantidad > COALESCE(r.recibido, 0)
            ORDER BY c.idCompra DESC, d.idDetalleCompra
        """)

        return [
            {
                "idCompra": f[0],
                "codigoCompra": f[1],
                "proveedor": f[2],
                "idDetalleCompra": f[3],
                "idProducto": f[4],
                "solicitado": f[5],
                "pendiente": f[6]
            }
            for f in cursor.fetchall()
        ]


def obtener_estantes_bodega():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT e.idEstante, e.codigoEstante,
                   b.nombre
            FROM ESTANTE e
            JOIN BODEGA b ON b.idBodega = e.idBodega
            WHERE e.activo = 1 AND b.activo = 1
        """)
        return [
            {
                "idEstante": f[0],
                "nombre": f"{f[2]} - {f[1]}"
            }
            for f in cursor.fetchall()
        ]


def registrar_ingreso_bodega(id_compra, id_usuario,
                             observaciones, detalle):
    with connection.cursor() as cursor:
        cursor.execute("""
            EXEC dbo.sp_RegistrarIngresoBodega
                @idCompra = %s,
                @idUsuario = %s,
                @observaciones = %s,
                @detalle = %s
        """, [
            id_compra,
            id_usuario,
            observaciones,
            json.dumps(detalle, default=str)
        ])

        f = cursor.fetchone()
        return {
            "idEntrega": f[0],
            "codigoEntrega": f[1],
            "estadoOrden": f[2],
            "mensaje": f[3]
        }

