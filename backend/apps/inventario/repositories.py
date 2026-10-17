from django.db import connection

CONSULTA_EXISTENCIAS = """
    SELECT B.nombre, E.codigoEstante, SUM(L.cantidadDisponible)
    FROM LOTE AS L
    INNER JOIN ESTANTE AS E ON L.idEstante = E.idEstante
    INNER JOIN BODEGA AS B ON E.idBodega = B.idBodega
    INNER JOIN DETALLE_ENTREGA AS DE ON L.idDetalleEntrega = DE.idDetalleEntrega
    INNER JOIN DETALLE_COMPRA AS DC ON DE.idDetalleCompra = DC.idDetalleCompra
    WHERE DC.idProducto = %s
      AND B.activo = 1
      AND E.activo = 1
      AND L.cantidadDisponible > 0
    GROUP BY B.nombre, E.codigoEstante
    ORDER BY B.nombre, E.codigoEstante
"""


def existencias_de_producto(id_producto):
    with connection.cursor() as cursor:
        cursor.execute(CONSULTA_EXISTENCIAS, [id_producto])
        filas = cursor.fetchall()

    ubicaciones = [
        {"bodega": fila[0], "estante": fila[1], "cantidad": fila[2]}
        for fila in filas
    ]

    return {
        "stock": sum(ubicacion["cantidad"] for ubicacion in ubicaciones),
        "ubicaciones": ubicaciones,
    }
