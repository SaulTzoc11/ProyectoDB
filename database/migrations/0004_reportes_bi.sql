USE PintureriaDB;
GO

/* ===========================================================================
   0004 - BI y Reporting

   Que agrega:
     Vistas de apoyo    vw_FacturaVigente, vw_ProductoDescripcion,
                        vw_InventarioPorLote, vw_InventarioActual
     Funcion            fn_VentasPorProducto
     Procedimientos     sp_Reporte_TotalFacturado           (reporte 1)
                        sp_Reporte_ProductosMasIngresos     (reporte 2)
                        sp_Reporte_ProductosMasVendidos     (reporte 3)
                        sp_Reporte_InventarioActual         (reporte 4)
                        sp_Reporte_ProductosMenosVendidos   (reporte 5)
                        sp_Reporte_ProductosSinStock        (reporte 6)
                        sp_Reporte_Factura                  (reporte 7, encabezado)
                        sp_Reporte_FacturaDetalle           (reporte 7, lineas)
                        sp_Reporte_FacturaPagos             (reporte 7, pagos)

   Todo es de solo lectura: no modifica datos ni tablas.

   Supuestos (si no se cumplen, cambiar SOLO la vista o funcion indicada):
     1. Una factura anulada tiene un ESTADO cuyo nombre empieza con 'Anulad'.
        Se centraliza en vw_FacturaVigente; las demas consultas la reutilizan.
     2. Los montos de DETALLE_FACTURA.subtotal y FACTURA.total son la fuente
        de verdad: no se recalculan descuentos.
     3. El inventario disponible considera solo bodegas y estantes activos,
        igual que la consulta de existencias que ya usa la aplicacion.
     4. Los rangos de fechas son inclusivos en ambos extremos.
   =========================================================================== */


/* ---------------------------------------------------------------------------
   1. VISTA: facturas que cuentan para los reportes (no anuladas).
   ---------------------------------------------------------------------------*/
CREATE OR ALTER VIEW dbo.vw_FacturaVigente
AS
SELECT F.idFactura,
       F.idCliente,
       F.idUsuario,
       F.idCotizacion,
       F.noFactura,
       F.fecha,
       F.subtotal,
       F.descuento,
       F.total,
       F.observaciones,
       E.nombre AS estado
  FROM dbo.FACTURA F
  INNER JOIN dbo.ESTADO E ON E.idEstado = F.idEstado
 WHERE E.nombre NOT LIKE 'Anulad%';
GO

/* ---------------------------------------------------------------------------
   2. VISTA: un producto con su descripcion legible (nombre, presentacion, color).
   ---------------------------------------------------------------------------*/
CREATE OR ALTER VIEW dbo.vw_ProductoDescripcion
AS
SELECT P.idProducto,
       P.codigoProducto,
       PG.nombre AS producto,
       M.nombre  AS marca,
       CA.nombre AS categoria,
       PR.nombre AS presentacion,
       CO.nombre AS color,
       CONCAT(PG.nombre, ' ', PR.nombre,
              CASE WHEN CO.nombre IS NULL THEN '' ELSE CONCAT(' ', CO.nombre) END) AS nombreCompleto,
       CAST(CASE WHEN P.activo = 1 AND PG.activo = 1 THEN 1 ELSE 0 END AS BIT) AS activo
  FROM dbo.PRODUCTO P
  INNER JOIN dbo.PRODUCTO_GENERAL PG ON PG.idProductoGeneral = P.idProductoGeneral
  INNER JOIN dbo.MARCA M             ON M.idMarca = PG.idMarca
  INNER JOIN dbo.CATEGORIA CA        ON CA.idCategoria = PG.idCategoria
  INNER JOIN dbo.PRESENTACION PR     ON PR.idPresentacion = P.idPresentacion
  LEFT  JOIN dbo.COLOR CO            ON CO.idColor = P.idColor;
GO

/* ---------------------------------------------------------------------------
   3. VISTA: existencias por lote, con su ubicacion y su costo de adquisicion.
      El producto de un lote se obtiene por LOTE -> DETALLE_ENTREGA ->
      DETALLE_COMPRA, igual que la consulta de existencias de la aplicacion.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER VIEW dbo.vw_InventarioPorLote
AS
SELECT L.idLote,
       L.codigoLote,
       DC.idProducto,
       B.idBodega,
       B.nombre         AS bodega,
       ES.idEstante,
       ES.codigoEstante AS estante,
       L.fechaIngreso,
       L.cantidadInicial,
       L.cantidadDisponible,
       DE.costoUnitarioReal AS costoUnitario,
       CAST(L.cantidadDisponible * DE.costoUnitarioReal AS DECIMAL(14,2)) AS valorInventario
  FROM dbo.LOTE L
  INNER JOIN dbo.ESTANTE ES        ON ES.idEstante = L.idEstante
  INNER JOIN dbo.BODEGA B          ON B.idBodega = ES.idBodega
  INNER JOIN dbo.DETALLE_ENTREGA DE ON DE.idDetalleEntrega = L.idDetalleEntrega
  INNER JOIN dbo.DETALLE_COMPRA DC  ON DC.idDetalleCompra = DE.idDetalleCompra
 WHERE B.activo = 1
   AND ES.activo = 1;
GO

/* ---------------------------------------------------------------------------
   4. VISTA: existencia total y valor del inventario por producto.
      Incluye productos sin lotes (existencia 0).
   ---------------------------------------------------------------------------*/
CREATE OR ALTER VIEW dbo.vw_InventarioActual
AS
SELECT PD.idProducto,
       PD.codigoProducto,
       PD.nombreCompleto,
       PD.producto,
       PD.marca,
       PD.categoria,
       PD.presentacion,
       PD.color,
       PD.activo,
       CAST(ISNULL(SUM(IL.cantidadDisponible), 0) AS INT)           AS existencia,
       CAST(ISNULL(SUM(IL.valorInventario), 0) AS DECIMAL(14,2))    AS valorInventario,
       MIN(CASE WHEN IL.cantidadDisponible > 0 THEN IL.fechaIngreso END) AS ingresoMasAntiguo
  FROM dbo.vw_ProductoDescripcion PD
  LEFT JOIN dbo.vw_InventarioPorLote IL ON IL.idProducto = PD.idProducto
 GROUP BY PD.idProducto, PD.codigoProducto, PD.nombreCompleto, PD.producto,
          PD.marca, PD.categoria, PD.presentacion, PD.color, PD.activo;
GO

/* ---------------------------------------------------------------------------
   5. FUNCION: ventas netas por producto en un rango de fechas.
      Si @desde y @hasta son NULL, toma todo el historial.
      Descuenta las devoluciones que no estan anuladas.
      Es la base de los reportes 2, 3 y 5.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER FUNCTION dbo.fn_VentasPorProducto
(
    @desde DATE,
    @hasta DATE
)
RETURNS TABLE
AS
RETURN
(
    SELECT DF.idProducto,
           SUM(DF.cantidad)            AS cantidadVendida,
           ISNULL(SUM(DV.cantidad), 0) AS cantidadDevuelta,
           SUM(DF.subtotal)            AS montoVendido,
           ISNULL(SUM(DV.monto), 0)    AS montoDevuelto,
           MAX(F.fecha)                AS ultimaVenta
      FROM dbo.DETALLE_FACTURA DF
      INNER JOIN dbo.vw_FacturaVigente F ON F.idFactura = DF.idFactura
      LEFT JOIN (
            SELECT DD.idDetalleFactura,
                   SUM(DD.cantidad) AS cantidad,
                   SUM(DD.subtotal) AS monto
              FROM dbo.DETALLE_DEVOLUCION DD
              INNER JOIN dbo.DEVOLUCION D ON D.idDevolucion = DD.idDevolucion
              INNER JOIN dbo.ESTADO ED    ON ED.idEstado = D.idEstado
             WHERE ED.nombre NOT LIKE 'Anulad%'
             GROUP BY DD.idDetalleFactura
      ) DV ON DV.idDetalleFactura = DF.idDetalleFactura
     WHERE (@desde IS NULL OR F.fecha >= @desde)
       AND (@hasta IS NULL OR F.fecha < DATEADD(DAY, 1, @hasta))
     GROUP BY DF.idProducto
);
GO

/* ---------------------------------------------------------------------------
   6. REPORTE 1: monto facturado entre dos fechas, con el desglose por medio
      de pago. Una fila "Total" y una fila por cada medio de pago activo
      (aunque no tenga pagos, para que siempre aparezca en 0).
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_TotalFacturado
    @desde DATE,
    @hasta DATE
AS
BEGIN
    SET NOCOUNT ON;

    IF @desde IS NULL OR @hasta IS NULL OR @desde > @hasta
        THROW 50010, N'Indique un rango de fechas valido: desde no puede ser mayor que hasta.', 1;

    DECLARE @hastaExcl DATE = DATEADD(DAY, 1, @hasta);

    SELECT R.concepto, R.monto
      FROM (
            SELECT CAST('Total' AS VARCHAR(50)) AS concepto,
                   CAST(ISNULL(SUM(F.total), 0) AS DECIMAL(14,2)) AS monto,
                   0 AS orden
              FROM dbo.vw_FacturaVigente F
             WHERE F.fecha >= @desde AND F.fecha < @hastaExcl
            UNION ALL
            SELECT CAST(TP.nombre AS VARCHAR(50)),
                   CAST(ISNULL(SUM(X.monto), 0) AS DECIMAL(14,2)),
                   TP.idTipoPago
              FROM dbo.TIPO_PAGO TP
              LEFT JOIN (
                    SELECT P.idTipoPago, P.monto
                      FROM dbo.PAGO P
                      INNER JOIN dbo.vw_FacturaVigente F ON F.idFactura = P.idFactura
                     WHERE F.fecha >= @desde AND F.fecha < @hastaExcl
              ) X ON X.idTipoPago = TP.idTipoPago
             WHERE TP.activo = 1
             GROUP BY TP.nombre, TP.idTipoPago
           ) R
     ORDER BY R.orden;
END
GO

/* ---------------------------------------------------------------------------
   7. REPORTE 2: productos que mas dinero generan entre dos fechas.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_ProductosMasIngresos
    @desde DATE,
    @hasta DATE,
    @top   INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @desde IS NULL OR @hasta IS NULL OR @desde > @hasta
        THROW 50010, N'Indique un rango de fechas valido: desde no puede ser mayor que hasta.', 1;
    IF @top IS NULL OR @top < 1
        THROW 50011, N'La cantidad de filas (top) debe ser mayor o igual a 1.', 1;

    SELECT TOP (@top)
           ROW_NUMBER() OVER (ORDER BY V.montoVendido - V.montoDevuelto DESC, PD.nombreCompleto) AS posicion,
           PD.idProducto,
           PD.codigoProducto,
           PD.nombreCompleto AS producto,
           CAST(V.montoVendido AS DECIMAL(14,2))                  AS ingresoBruto,
           CAST(V.montoDevuelto AS DECIMAL(14,2))                 AS devuelto,
           CAST(V.montoVendido - V.montoDevuelto AS DECIMAL(14,2)) AS ingresoNeto
      FROM dbo.fn_VentasPorProducto(@desde, @hasta) V
      INNER JOIN dbo.vw_ProductoDescripcion PD ON PD.idProducto = V.idProducto
     ORDER BY posicion;
END
GO

/* ---------------------------------------------------------------------------
   8. REPORTE 3: productos que mas se venden (por cantidad) entre dos fechas.
      Cada presentacion y color es un producto distinto, por eso la cantidad
      se muestra con su presentacion ("10 Galon", "5 Unidad").
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_ProductosMasVendidos
    @desde DATE,
    @hasta DATE,
    @top   INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF @desde IS NULL OR @hasta IS NULL OR @desde > @hasta
        THROW 50010, N'Indique un rango de fechas valido: desde no puede ser mayor que hasta.', 1;
    IF @top IS NULL OR @top < 1
        THROW 50011, N'La cantidad de filas (top) debe ser mayor o igual a 1.', 1;

    SELECT TOP (@top)
           ROW_NUMBER() OVER (ORDER BY V.cantidadVendida - V.cantidadDevuelta DESC, PD.nombreCompleto) AS posicion,
           PD.idProducto,
           PD.codigoProducto,
           PD.nombreCompleto AS producto,
           PD.presentacion,
           V.cantidadVendida,
           V.cantidadDevuelta,
           V.cantidadVendida - V.cantidadDevuelta AS cantidadNeta,
           CONCAT(CAST(V.cantidadVendida - V.cantidadDevuelta AS VARCHAR(12)), ' ', PD.presentacion) AS cantidadTexto
      FROM dbo.fn_VentasPorProducto(@desde, @hasta) V
      INNER JOIN dbo.vw_ProductoDescripcion PD ON PD.idProducto = V.idProducto
     ORDER BY posicion;
END
GO

/* ---------------------------------------------------------------------------
   9. REPORTE 4: inventario actual por lote. Los lotes de cada producto salen
      ordenados del mas antiguo al mas nuevo (PEPS): ordenSalida = 1 es el
      primero que debe venderse. El orden se calcula con TODOS los lotes del
      producto, aunque se filtre por bodega.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_InventarioActual
    @idBodega INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    WITH Lotes AS (
        SELECT PD.idProducto,
               PD.codigoProducto,
               PD.nombreCompleto AS producto,
               PD.categoria,
               IL.codigoLote,
               IL.idBodega,
               IL.bodega,
               IL.estante,
               IL.fechaIngreso,
               DATEDIFF(DAY, IL.fechaIngreso, GETDATE()) AS diasEnBodega,
               IL.cantidadDisponible,
               IL.costoUnitario,
               IL.valorInventario,
               ROW_NUMBER() OVER (PARTITION BY IL.idProducto
                                  ORDER BY IL.fechaIngreso, IL.idLote) AS ordenSalida
          FROM dbo.vw_InventarioPorLote IL
          INNER JOIN dbo.vw_ProductoDescripcion PD ON PD.idProducto = IL.idProducto
         WHERE IL.cantidadDisponible > 0
    )
    SELECT idProducto, codigoProducto, producto, categoria,
           codigoLote, bodega, estante, fechaIngreso, diasEnBodega,
           cantidadDisponible, costoUnitario, valorInventario, ordenSalida
      FROM Lotes
     WHERE @idBodega IS NULL OR idBodega = @idBodega
     ORDER BY producto, ordenSalida;
END
GO

/* ---------------------------------------------------------------------------
   10. REPORTE 5: productos con menos ventas. Incluye los que nunca se han
       vendido (cantidad 0), que salen primero. Las fechas son opcionales:
       sin fechas se usa todo el historial.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_ProductosMenosVendidos
    @desde DATE = NULL,
    @hasta DATE = NULL,
    @top   INT  = 10
AS
BEGIN
    SET NOCOUNT ON;

    IF (@desde IS NULL AND @hasta IS NOT NULL)
       OR (@desde IS NOT NULL AND @hasta IS NULL)
       OR @desde > @hasta
        THROW 50010, N'Indique ambas fechas o ninguna, y que desde no sea mayor que hasta.', 1;
    IF @top IS NULL OR @top < 1
        THROW 50011, N'La cantidad de filas (top) debe ser mayor o igual a 1.', 1;

    SELECT TOP (@top)
           ROW_NUMBER() OVER (ORDER BY ISNULL(V.cantidadVendida - V.cantidadDevuelta, 0),
                                       V.ultimaVenta, PD.nombreCompleto) AS posicion,
           PD.idProducto,
           PD.codigoProducto,
           PD.nombreCompleto AS producto,
           PD.presentacion,
           ISNULL(V.cantidadVendida, 0)                      AS cantidadVendida,
           ISNULL(V.cantidadDevuelta, 0)                     AS cantidadDevuelta,
           ISNULL(V.cantidadVendida - V.cantidadDevuelta, 0) AS cantidadNeta,
           CAST(ISNULL(V.montoVendido - V.montoDevuelto, 0) AS DECIMAL(14,2)) AS ingresoNeto,
           V.ultimaVenta
      FROM dbo.vw_ProductoDescripcion PD
      LEFT JOIN dbo.fn_VentasPorProducto(@desde, @hasta) V ON V.idProducto = PD.idProducto
     WHERE PD.activo = 1
     ORDER BY posicion;
END
GO

/* ---------------------------------------------------------------------------
   11. REPORTE 6: productos activos sin existencia que hay que comprar.
       Para no pedir de mas, muestra cuanto esta pedido y aun no se ha
       recibido, y el ultimo proveedor que lo surtio.
       Se ignoran los detalles de compra cancelados o anulados.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_ProductosSinStock
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IA.idProducto,
           IA.codigoProducto,
           IA.nombreCompleto AS producto,
           IA.categoria,
           IA.presentacion,
           IA.existencia,
           ISNULL(PEN.pendienteDeRecibir, 0) AS pendienteDeRecibir,
           UP.nombreProveedor                AS ultimoProveedor,
           UP.fechaCompra                    AS ultimaCompra
      FROM dbo.vw_InventarioActual IA
      LEFT JOIN (
            SELECT DC.idProducto,
                   SUM(CASE WHEN DC.cantidad > ISNULL(EN.entregada, 0)
                            THEN DC.cantidad - ISNULL(EN.entregada, 0)
                            ELSE 0 END) AS pendienteDeRecibir
              FROM dbo.DETALLE_COMPRA DC
              INNER JOIN dbo.ESTADO ED ON ED.idEstado = DC.idEstado
              LEFT JOIN (
                    SELECT DE.idDetalleCompra,
                           SUM(DE.cantidadEntregada) AS entregada
                      FROM dbo.DETALLE_ENTREGA DE
                     GROUP BY DE.idDetalleCompra
              ) EN ON EN.idDetalleCompra = DC.idDetalleCompra
             WHERE ED.nombre NOT LIKE 'Cancelad%'
               AND ED.nombre NOT LIKE 'Anulad%'
             GROUP BY DC.idProducto
      ) PEN ON PEN.idProducto = IA.idProducto
      OUTER APPLY (
            SELECT TOP (1) PV.nombreProveedor, C.fechaCompra
              FROM dbo.DETALLE_COMPRA DC2
              INNER JOIN dbo.COMPRA C     ON C.idCompra = DC2.idCompra
              INNER JOIN dbo.PROVEEDOR PV ON PV.idProveedor = C.idProveedor
             WHERE DC2.idProducto = IA.idProducto
             ORDER BY C.fechaCompra DESC, C.idCompra DESC
      ) UP
     WHERE IA.activo = 1
       AND IA.existencia <= 0
     ORDER BY IA.categoria, IA.nombreCompleto;
END
GO

/* ---------------------------------------------------------------------------
   12. REPORTE 7: busqueda de una factura por su numero.
       Son tres procedimientos de un solo resultado cada uno (encabezado,
       lineas y pagos) para que cualquier cliente los consuma sin manejar
       varios resultados. Si la factura no existe lanzan el error 50020.
       Una factura anulada tambien se consulta, mostrando su estado.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_Factura
    @noFactura VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SET @noFactura = LTRIM(RTRIM(@noFactura));

    IF NOT EXISTS (SELECT 1 FROM dbo.FACTURA WHERE noFactura = @noFactura)
        THROW 50020, N'No existe una factura con ese numero.', 1;

    SELECT F.idFactura,
           F.noFactura,
           F.fecha,
           E.nombre AS estado,
           C.nombreCliente AS cliente,
           C.nit,
           TC.nombre AS tipoCliente,
           CONCAT(U.nombres, ' ', U.apellidos) AS empleado,
           U.nombreUsuario AS usuarioEmpleado,
           CO.codigoCotizacion,
           F.subtotal,
           F.descuento,
           F.total,
           CAST(ISNULL(PG.pagado, 0) AS DECIMAL(14,2)) AS totalPagado,
           CAST(CASE WHEN E.nombre LIKE 'Anulad%' THEN 0
                     ELSE F.total - ISNULL(PG.pagado, 0) END AS DECIMAL(14,2)) AS saldo,
           F.observaciones
      FROM dbo.FACTURA F
      INNER JOIN dbo.ESTADO E        ON E.idEstado = F.idEstado
      INNER JOIN dbo.CLIENTE C       ON C.idCliente = F.idCliente
      INNER JOIN dbo.TIPO_CLIENTE TC ON TC.idTipoCliente = C.idTipoCliente
      INNER JOIN dbo.USUARIO U       ON U.idUsuario = F.idUsuario
      LEFT  JOIN dbo.COTIZACION CO   ON CO.idCotizacion = F.idCotizacion
      LEFT  JOIN (
            SELECT P.idFactura, SUM(P.monto) AS pagado
              FROM dbo.PAGO P
             GROUP BY P.idFactura
      ) PG ON PG.idFactura = F.idFactura
     WHERE F.noFactura = @noFactura;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Reporte_FacturaDetalle
    @noFactura VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SET @noFactura = LTRIM(RTRIM(@noFactura));

    IF NOT EXISTS (SELECT 1 FROM dbo.FACTURA WHERE noFactura = @noFactura)
        THROW 50020, N'No existe una factura con ese numero.', 1;

    SELECT DF.idDetalleFactura,
           PD.codigoProducto,
           PD.nombreCompleto AS producto,
           PD.presentacion,
           DF.cantidad,
           DF.precioUnitario,
           DF.descuento,
           DF.subtotal
      FROM dbo.DETALLE_FACTURA DF
      INNER JOIN dbo.FACTURA F                 ON F.idFactura = DF.idFactura
      INNER JOIN dbo.vw_ProductoDescripcion PD ON PD.idProducto = DF.idProducto
     WHERE F.noFactura = @noFactura
     ORDER BY DF.idDetalleFactura;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Reporte_FacturaPagos
    @noFactura VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SET @noFactura = LTRIM(RTRIM(@noFactura));

    IF NOT EXISTS (SELECT 1 FROM dbo.FACTURA WHERE noFactura = @noFactura)
        THROW 50020, N'No existe una factura con ese numero.', 1;

    SELECT P.idPago,
           TP.nombre AS medioPago,
           P.monto,
           P.fecha,
           P.observaciones,
           CONCAT(U.nombres, ' ', U.apellidos) AS cobradoPor
      FROM dbo.PAGO P
      INNER JOIN dbo.FACTURA F     ON F.idFactura = P.idFactura
      INNER JOIN dbo.TIPO_PAGO TP  ON TP.idTipoPago = P.idTipoPago
      INNER JOIN dbo.USUARIO U     ON U.idUsuario = P.idUsuario
     WHERE F.noFactura = @noFactura
     ORDER BY P.fecha, P.idPago;
END
GO

/* ---------------------------------------------------------------------------
   13. PERMISOS: solo si existe el usuario de la aplicacion (app_django).
   ---------------------------------------------------------------------------*/
IF DATABASE_PRINCIPAL_ID('app_django') IS NOT NULL
   AND DATABASE_PRINCIPAL_ID('app_django') <> USER_ID()      -- no darse permisos a si mismo
   AND IS_ROLEMEMBER('db_owner', 'app_django') <> 1          -- el propietario ya tiene todo
BEGIN
    GRANT SELECT ON dbo.vw_FacturaVigente      TO app_django;
    GRANT SELECT ON dbo.vw_ProductoDescripcion TO app_django;
    GRANT SELECT ON dbo.vw_InventarioPorLote   TO app_django;
    GRANT SELECT ON dbo.vw_InventarioActual    TO app_django;
    GRANT SELECT ON dbo.fn_VentasPorProducto   TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_TotalFacturado         TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_ProductosMasIngresos   TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_ProductosMasVendidos   TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_InventarioActual       TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_ProductosMenosVendidos TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_ProductosSinStock      TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_Factura                TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_FacturaDetalle         TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_FacturaPagos           TO app_django;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0004_reportes_bi')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0004_reportes_bi');
GO
