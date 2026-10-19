USE PintureriaDB;
GO

/* ===========================================================================
   0005 - Finanzas y Contabilidad (reportes financieros)

   Requiere: 0004_reportes_bi (usa vw_FacturaVigente, vw_InventarioActual,
             vw_InventarioPorLote).

   Que agrega:
     Tabla              DETALLE_FACTURA_LOTE   (de que lote salio cada linea vendida)
     Procedimientos     sp_ConsumirLotesPEPS   (la facturacion lo llama por linea)
                        sp_RevertirLotesFactura (la anulacion lo llama por factura)
     Vista              vw_LineaFacturaCosto
     Funcion            fn_ResumenVentas
     Reportes           sp_Finanzas_EstadoResultados   (ingresos, costo, utilidad bruta)
                        sp_Finanzas_UtilidadPorProducto
                        sp_Finanzas_ValorInventario
                        sp_Finanzas_CuentasPorPagar
                        sp_Finanzas_Iva

   COMO SE ENCHUFA LA FACTURACION (para quien haga el SP de facturar):
     Dentro de su transaccion, despues de insertar cada fila de DETALLE_FACTURA:
         EXEC dbo.sp_ConsumirLotesPEPS
              @idDetalleFactura = @idDetalle,
              @idUsuario = @idUsuario,            -- opcional
              @idTipoMovimiento = @idMovSalida;   -- opcional: registra en MODIFICACION_INVENTARIO
     El procedimiento descuenta LOTE.cantidadDisponible empezando por el lote mas
     antiguo (PEPS), guarda la liga en DETALLE_FACTURA_LOTE y lanza error 50033
     si no hay existencia suficiente. Si ya hay una transaccion abierta la usa;
     si no, abre la suya.
     Para anular una factura:
         EXEC dbo.sp_RevertirLotesFactura @idFactura = @id;

   Supuestos (si no se cumplen, cambiar SOLO lo indicado):
     1. Los precios de venta INCLUYEN IVA (tasa por parametro, 12 % por defecto).
        Los costos de compra (costoUnitarioReal) NO incluyen IVA.
     2. Todo se asigna al periodo de la fecha de la FACTURA: las devoluciones y el
        costo se restan del periodo de la factura original.
     3. Las lineas vendidas sin filas en DETALLE_FACTURA_LOTE (facturadas antes de
        enchufar PEPS) cuentan con costo 0 y se avisan en el estado de resultados.
     4. No existe tabla de pagos a proveedores: "por pagar" es una ESTIMACION =
        valor recibido de compras no canceladas.
   =========================================================================== */


/* ---------------------------------------------------------------------------
   1. TABLA PUENTE: cada linea de factura con los lotes de los que salio.
      costoUnitario es una foto del costo del lote al vender (no cambia si
      luego se corrige la entrega). revertido = 1 cuando se anulo la factura.
   ---------------------------------------------------------------------------*/
IF OBJECT_ID('dbo.DETALLE_FACTURA_LOTE', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.DETALLE_FACTURA_LOTE (
        idDetalleFactura INT NOT NULL,
        idLote           INT NOT NULL,
        cantidad         INT NOT NULL,
        costoUnitario    DECIMAL(10,2) NOT NULL,
        revertido        BIT NOT NULL CONSTRAINT DF_DETALLE_FACTURA_LOTE_revertido DEFAULT 0,
        CONSTRAINT PK_DETALLE_FACTURA_LOTE PRIMARY KEY (idDetalleFactura, idLote),
        CONSTRAINT FK_DETALLE_FACTURA_LOTE_detalle FOREIGN KEY (idDetalleFactura)
            REFERENCES dbo.DETALLE_FACTURA (idDetalleFactura),
        CONSTRAINT FK_DETALLE_FACTURA_LOTE_lote FOREIGN KEY (idLote)
            REFERENCES dbo.LOTE (idLote),
        CONSTRAINT CK_DETALLE_FACTURA_LOTE_cantidad CHECK (cantidad > 0)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
                WHERE name = 'IX_DETALLE_FACTURA_LOTE_lote'
                  AND object_id = OBJECT_ID('dbo.DETALLE_FACTURA_LOTE'))
    CREATE INDEX IX_DETALLE_FACTURA_LOTE_lote ON dbo.DETALLE_FACTURA_LOTE (idLote);
GO


/* ---------------------------------------------------------------------------
   2. PEPS: da salida a una linea de factura desde los lotes mas antiguos.
      Errores: 50030 linea inexistente, 50031 linea ya asignada,
               50032 falta usuario para el movimiento, 50033 sin existencia.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_ConsumirLotesPEPS
    @idDetalleFactura INT,
    @idUsuario        INT = NULL,
    @idTipoMovimiento INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idProducto INT, @pendiente INT;

    SELECT @idProducto = DF.idProducto,
           @pendiente  = DF.cantidad
      FROM dbo.DETALLE_FACTURA DF
     WHERE DF.idDetalleFactura = @idDetalleFactura;

    IF @idProducto IS NULL
        THROW 50030, N'La linea de factura no existe.', 1;
    IF EXISTS (SELECT 1 FROM dbo.DETALLE_FACTURA_LOTE
                WHERE idDetalleFactura = @idDetalleFactura AND revertido = 0)
        THROW 50031, N'La linea de factura ya tiene lotes asignados.', 1;
    IF @idTipoMovimiento IS NOT NULL AND @idUsuario IS NULL
        THROW 50032, N'Para registrar el movimiento de inventario indique el usuario.', 1;

    DECLARE @propia BIT = 0;
    IF @@TRANCOUNT = 0
    BEGIN
        BEGIN TRANSACTION;
        SET @propia = 1;
    END

    BEGIN TRY
        DECLARE @idLote INT, @disponible INT, @costo DECIMAL(10,2), @toma INT;

        -- Lotes del producto, del mas antiguo al mas nuevo. UPDLOCK evita que dos
        -- ventas simultaneas tomen la misma existencia.
        DECLARE lotes CURSOR LOCAL STATIC FORWARD_ONLY READ_ONLY FOR
            SELECT L.idLote, L.cantidadDisponible, DE.costoUnitarioReal
              FROM dbo.LOTE L WITH (UPDLOCK, ROWLOCK)
              INNER JOIN dbo.DETALLE_ENTREGA DE ON DE.idDetalleEntrega = L.idDetalleEntrega
              INNER JOIN dbo.DETALLE_COMPRA DC  ON DC.idDetalleCompra = DE.idDetalleCompra
              INNER JOIN dbo.ESTANTE ES         ON ES.idEstante = L.idEstante
              INNER JOIN dbo.BODEGA B           ON B.idBodega = ES.idBodega
             WHERE DC.idProducto = @idProducto
               AND L.cantidadDisponible > 0
               AND ES.activo = 1
               AND B.activo = 1
             ORDER BY L.fechaIngreso, L.idLote;

        OPEN lotes;
        FETCH NEXT FROM lotes INTO @idLote, @disponible, @costo;

        WHILE @@FETCH_STATUS = 0 AND @pendiente > 0
        BEGIN
            SET @toma = CASE WHEN @disponible < @pendiente THEN @disponible ELSE @pendiente END;

            UPDATE dbo.LOTE
               SET cantidadDisponible = cantidadDisponible - @toma
             WHERE idLote = @idLote;

            INSERT INTO dbo.DETALLE_FACTURA_LOTE (idDetalleFactura, idLote, cantidad, costoUnitario)
            VALUES (@idDetalleFactura, @idLote, @toma, @costo);

            IF @idTipoMovimiento IS NOT NULL
                INSERT INTO dbo.MODIFICACION_INVENTARIO (idLote, idTipoMovimiento, idUsuario, cantidad, observaciones)
                VALUES (@idLote, @idTipoMovimiento, @idUsuario, @toma,
                        CONCAT('Venta - detalle de factura ', @idDetalleFactura));

            SET @pendiente = @pendiente - @toma;
            FETCH NEXT FROM lotes INTO @idLote, @disponible, @costo;
        END

        CLOSE lotes;
        DEALLOCATE lotes;

        IF @pendiente > 0
            THROW 50033, N'No hay existencia suficiente del producto para completar la venta.', 1;

        IF @propia = 1 COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @propia = 1 AND @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


/* ---------------------------------------------------------------------------
   3. ANULACION: regresa a cada lote lo que se le habia sacado.
      Las filas se conservan con revertido = 1 (historial). Error 50034 si la
      factura no tiene lotes por revertir.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_RevertirLotesFactura
    @idFactura        INT,
    @idUsuario        INT = NULL,
    @idTipoMovimiento INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @idTipoMovimiento IS NOT NULL AND @idUsuario IS NULL
        THROW 50032, N'Para registrar el movimiento de inventario indique el usuario.', 1;

    DECLARE @propia BIT = 0;
    IF @@TRANCOUNT = 0
    BEGIN
        BEGIN TRANSACTION;
        SET @propia = 1;
    END

    BEGIN TRY
        DECLARE @Filas TABLE (idLote INT NOT NULL, cantidad INT NOT NULL);

        UPDATE FL
           SET FL.revertido = 1
        OUTPUT inserted.idLote, inserted.cantidad INTO @Filas
          FROM dbo.DETALLE_FACTURA_LOTE FL
          INNER JOIN dbo.DETALLE_FACTURA DF ON DF.idDetalleFactura = FL.idDetalleFactura
         WHERE DF.idFactura = @idFactura
           AND FL.revertido = 0;

        IF NOT EXISTS (SELECT 1 FROM @Filas)
            THROW 50034, N'La factura no tiene lotes por revertir.', 1;

        UPDATE L
           SET L.cantidadDisponible = L.cantidadDisponible + X.cantidad
          FROM dbo.LOTE L
          INNER JOIN (SELECT idLote, SUM(cantidad) AS cantidad
                        FROM @Filas GROUP BY idLote) X ON X.idLote = L.idLote;

        IF @idTipoMovimiento IS NOT NULL
            INSERT INTO dbo.MODIFICACION_INVENTARIO (idLote, idTipoMovimiento, idUsuario, cantidad, observaciones)
            SELECT X.idLote, @idTipoMovimiento, @idUsuario, X.cantidad,
                   CONCAT('Anulacion de factura ', @idFactura)
              FROM (SELECT idLote, SUM(cantidad) AS cantidad
                      FROM @Filas GROUP BY idLote) X;

        IF @propia = 1 COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @propia = 1 AND @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


/* ---------------------------------------------------------------------------
   4. VISTA: cada linea vendida con su costo PEPS y sus devoluciones.
      costoNeto descuenta, proporcionalmente, lo devuelto.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER VIEW dbo.vw_LineaFacturaCosto
AS
SELECT DF.idDetalleFactura,
       F.idFactura,
       F.fecha,
       DF.idProducto,
       DF.cantidad,
       DF.subtotal                                  AS ingresoLinea,
       CAST(ISNULL(DV.cantidad, 0) AS INT)          AS cantidadDevuelta,
       CAST(ISNULL(DV.monto, 0) AS DECIMAL(14,2))   AS montoDevuelto,
       CAST(ISNULL(CO.costo, 0) AS DECIMAL(14,2))   AS costoBruto,
       CAST(ISNULL(CO.costo, 0) * (DF.cantidad - ISNULL(DV.cantidad, 0))
            / NULLIF(DF.cantidad, 0) AS DECIMAL(14,2)) AS costoNeto,
       CAST(CASE WHEN CO.costo IS NULL THEN 0 ELSE 1 END AS BIT) AS tieneCosto
  FROM dbo.DETALLE_FACTURA DF
  INNER JOIN dbo.vw_FacturaVigente F ON F.idFactura = DF.idFactura
  LEFT JOIN (
        SELECT FL.idDetalleFactura, SUM(FL.cantidad * FL.costoUnitario) AS costo
          FROM dbo.DETALLE_FACTURA_LOTE FL
         WHERE FL.revertido = 0
         GROUP BY FL.idDetalleFactura
  ) CO ON CO.idDetalleFactura = DF.idDetalleFactura
  LEFT JOIN (
        SELECT DD.idDetalleFactura, SUM(DD.cantidad) AS cantidad, SUM(DD.subtotal) AS monto
          FROM dbo.DETALLE_DEVOLUCION DD
          INNER JOIN dbo.DEVOLUCION D ON D.idDevolucion = DD.idDevolucion
          INNER JOIN dbo.ESTADO ED    ON ED.idEstado = D.idEstado
         WHERE ED.nombre NOT LIKE 'Anulad%'
         GROUP BY DD.idDetalleFactura
  ) DV ON DV.idDetalleFactura = DF.idDetalleFactura;
GO


/* ---------------------------------------------------------------------------
   5. FUNCION: ventas brutas y devoluciones de las facturas del periodo.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER FUNCTION dbo.fn_ResumenVentas
(
    @desde DATE,
    @hasta DATE
)
RETURNS TABLE
AS
RETURN
(
    SELECT CAST(ISNULL(SUM(F.total), 0) AS DECIMAL(14,2)) AS ventasBrutas,
           CAST(ISNULL(SUM(ISNULL(DV.total, 0)), 0) AS DECIMAL(14,2)) AS devoluciones
      FROM dbo.vw_FacturaVigente F
      LEFT JOIN (
            SELECT D.idFactura, SUM(D.total) AS total
              FROM dbo.DEVOLUCION D
              INNER JOIN dbo.ESTADO ED ON ED.idEstado = D.idEstado
             WHERE ED.nombre NOT LIKE 'Anulad%'
             GROUP BY D.idFactura
      ) DV ON DV.idFactura = F.idFactura
     WHERE F.fecha >= @desde
       AND F.fecha < DATEADD(DAY, 1, @hasta)
);
GO


/* ---------------------------------------------------------------------------
   6. REPORTE: estado de resultados simple del periodo.
      Devuelve concepto / monto / tipo ('moneda', 'porcentaje' o 'cantidad').
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Finanzas_EstadoResultados
    @desde   DATE,
    @hasta   DATE,
    @tasaIva DECIMAL(5,2) = 12
AS
BEGIN
    SET NOCOUNT ON;

    IF @desde IS NULL OR @hasta IS NULL OR @desde > @hasta
        THROW 50010, N'Indique un rango de fechas valido: desde no puede ser mayor que hasta.', 1;
    IF @tasaIva IS NULL OR @tasaIva < 0 OR @tasaIva > 100
        THROW 50012, N'La tasa de IVA debe estar entre 0 y 100.', 1;

    DECLARE @brutas DECIMAL(14,2), @devol DECIMAL(14,2),
            @costo DECIMAL(14,2), @sinCosto INT;

    SELECT @brutas = ventasBrutas, @devol = devoluciones
      FROM dbo.fn_ResumenVentas(@desde, @hasta);

    SELECT @costo    = CAST(ISNULL(SUM(L.costoNeto), 0) AS DECIMAL(14,2)),
           @sinCosto = ISNULL(SUM(CASE WHEN L.tieneCosto = 0 THEN 1 ELSE 0 END), 0)
      FROM dbo.vw_LineaFacturaCosto L
     WHERE L.fecha >= @desde AND L.fecha < DATEADD(DAY, 1, @hasta);

    DECLARE @netas  DECIMAL(14,2) = @brutas - @devol;
    DECLARE @iva    DECIMAL(14,2) = ROUND(@netas * @tasaIva / (100 + @tasaIva), 2);
    DECLARE @sinIva DECIMAL(14,2) = @netas - @iva;
    DECLARE @util   DECIMAL(14,2) = @sinIva - @costo;

    SELECT R.concepto, R.monto, R.tipo
      FROM (VALUES
        (1, CAST('Ventas brutas (con IVA)' AS VARCHAR(60)),        @brutas, CAST('moneda' AS VARCHAR(12))),
        (2, CAST('(-) Devoluciones' AS VARCHAR(60)),               @devol,  'moneda'),
        (3, CAST('Ventas netas (con IVA)' AS VARCHAR(60)),         @netas,  'moneda'),
        (4, CAST('(-) IVA incluido en las ventas' AS VARCHAR(60)), @iva,    'moneda'),
        (5, CAST('Ventas netas sin IVA' AS VARCHAR(60)),           @sinIva, 'moneda'),
        (6, CAST('(-) Costo de ventas (PEPS)' AS VARCHAR(60)),     @costo,  'moneda'),
        (7, CAST('Utilidad bruta' AS VARCHAR(60)),                 @util,   'moneda'),
        (8, CAST('Margen bruto' AS VARCHAR(60)),
            CAST(CASE WHEN @sinIva = 0 THEN 0 ELSE @util * 100 / @sinIva END AS DECIMAL(14,2)),
            'porcentaje'),
        (9, CAST('Lineas vendidas sin costo PEPS registrado' AS VARCHAR(60)),
            CAST(@sinCosto AS DECIMAL(14,2)), 'cantidad')
      ) AS R(orden, concepto, monto, tipo)
     ORDER BY R.orden;
END
GO


/* ---------------------------------------------------------------------------
   7. REPORTE: utilidad por producto en el periodo.
      El ingreso es el de la linea (descuento de linea incluido, sin el
      descuento global de la factura) menos lo devuelto, con IVA.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Finanzas_UtilidadPorProducto
    @desde   DATE,
    @hasta   DATE,
    @top     INT = 10,
    @tasaIva DECIMAL(5,2) = 12
AS
BEGIN
    SET NOCOUNT ON;

    IF @desde IS NULL OR @hasta IS NULL OR @desde > @hasta
        THROW 50010, N'Indique un rango de fechas valido: desde no puede ser mayor que hasta.', 1;
    IF @top IS NULL OR @top < 1
        THROW 50011, N'La cantidad de filas (top) debe ser mayor o igual a 1.', 1;
    IF @tasaIva IS NULL OR @tasaIva < 0 OR @tasaIva > 100
        THROW 50012, N'La tasa de IVA debe estar entre 0 y 100.', 1;

    SELECT TOP (@top)
           ROW_NUMBER() OVER (ORDER BY X.utilidad DESC, PD.nombreCompleto) AS posicion,
           PD.idProducto,
           PD.codigoProducto,
           PD.nombreCompleto AS producto,
           X.cantidadNeta,
           X.ingresoSinIva,
           X.costo,
           X.utilidad,
           CAST(CASE WHEN X.ingresoSinIva = 0 THEN 0
                     ELSE X.utilidad * 100 / X.ingresoSinIva END AS DECIMAL(8,2)) AS margenPorcentaje,
           X.lineasSinCosto
      FROM (
            SELECT L.idProducto,
                   CAST(SUM(L.cantidad - L.cantidadDevuelta) AS INT) AS cantidadNeta,
                   CAST(SUM((L.ingresoLinea - L.montoDevuelto) * 100 / (100 + @tasaIva)) AS DECIMAL(14,2)) AS ingresoSinIva,
                   CAST(SUM(L.costoNeto) AS DECIMAL(14,2)) AS costo,
                   CAST(SUM((L.ingresoLinea - L.montoDevuelto) * 100 / (100 + @tasaIva) - L.costoNeto) AS DECIMAL(14,2)) AS utilidad,
                   SUM(CASE WHEN L.tieneCosto = 0 THEN 1 ELSE 0 END) AS lineasSinCosto
              FROM dbo.vw_LineaFacturaCosto L
             WHERE L.fecha >= @desde AND L.fecha < DATEADD(DAY, 1, @hasta)
             GROUP BY L.idProducto
           ) X
      INNER JOIN dbo.vw_ProductoDescripcion PD ON PD.idProducto = X.idProducto
     ORDER BY posicion;
END
GO


/* ---------------------------------------------------------------------------
   8. REPORTE: valor del inventario por categoria, con fila de total al final.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Finanzas_ValorInventario
AS
BEGIN
    SET NOCOUNT ON;

    SELECT R.categoria, R.productos, R.unidades, R.valorInventario
      FROM (
            SELECT CAST(IA.categoria AS VARCHAR(60)) AS categoria,
                   SUM(CASE WHEN IA.existencia > 0 THEN 1 ELSE 0 END) AS productos,
                   CAST(SUM(IA.existencia) AS INT) AS unidades,
                   CAST(SUM(IA.valorInventario) AS DECIMAL(14,2)) AS valorInventario,
                   0 AS orden
              FROM dbo.vw_InventarioActual IA
             GROUP BY IA.categoria
            UNION ALL
            SELECT CAST('TOTAL' AS VARCHAR(60)),
                   SUM(CASE WHEN IA.existencia > 0 THEN 1 ELSE 0 END),
                   CAST(ISNULL(SUM(IA.existencia), 0) AS INT),
                   CAST(ISNULL(SUM(IA.valorInventario), 0) AS DECIMAL(14,2)),
                   1
              FROM dbo.vw_InventarioActual IA
           ) R
     ORDER BY R.orden, R.categoria;
END
GO


/* ---------------------------------------------------------------------------
   9. REPORTE: compras por proveedor y cuentas por pagar (ESTIMADO: no hay
      tabla de pagos a proveedores, se toma todo lo recibido como pendiente).
      Las fechas son opcionales y filtran por fecha de la compra.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Finanzas_CuentasPorPagar
    @desde DATE = NULL,
    @hasta DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF (@desde IS NULL AND @hasta IS NOT NULL)
       OR (@desde IS NOT NULL AND @hasta IS NULL)
       OR @desde > @hasta
        THROW 50010, N'Indique ambas fechas o ninguna, y que desde no sea mayor que hasta.', 1;

    SELECT PV.idProveedor,
           PV.nombreProveedor AS proveedor,
           COUNT(DISTINCT C.idCompra) AS compras,
           CAST(SUM(DC.subtotal) AS DECIMAL(14,2)) AS totalOrdenado,
           CAST(SUM(ISNULL(EN.valor, 0)) AS DECIMAL(14,2)) AS valorRecibido,
           CAST(SUM(CASE WHEN DC.cantidad > ISNULL(EN.cantidad, 0)
                         THEN (DC.cantidad - ISNULL(EN.cantidad, 0)) * DC.costoUnitario
                         ELSE 0 END) AS DECIMAL(14,2)) AS valorPendienteRecibir,
           CAST(SUM(ISNULL(EN.valor, 0)) AS DECIMAL(14,2)) AS porPagarEstimado
      FROM dbo.COMPRA C
      INNER JOIN dbo.ESTADO EC         ON EC.idEstado = C.idEstado
      INNER JOIN dbo.PROVEEDOR PV      ON PV.idProveedor = C.idProveedor
      INNER JOIN dbo.DETALLE_COMPRA DC ON DC.idCompra = C.idCompra
      INNER JOIN dbo.ESTADO ED         ON ED.idEstado = DC.idEstado
      LEFT JOIN (
            SELECT DE.idDetalleCompra,
                   SUM(DE.cantidadEntregada) AS cantidad,
                   SUM(DE.cantidadEntregada * DE.costoUnitarioReal) AS valor
              FROM dbo.DETALLE_ENTREGA DE
             GROUP BY DE.idDetalleCompra
      ) EN ON EN.idDetalleCompra = DC.idDetalleCompra
     WHERE EC.nombre NOT LIKE 'Cancelad%' AND EC.nombre NOT LIKE 'Anulad%'
       AND ED.nombre NOT LIKE 'Cancelad%' AND ED.nombre NOT LIKE 'Anulad%'
       AND (@desde IS NULL OR C.fechaCompra >= @desde)
       AND (@hasta IS NULL OR C.fechaCompra < DATEADD(DAY, 1, @hasta))
     GROUP BY PV.idProveedor, PV.nombreProveedor
     ORDER BY porPagarEstimado DESC, PV.nombreProveedor;
END
GO


/* ---------------------------------------------------------------------------
   10. REPORTE: IVA del periodo. Debito = IVA de las ventas netas. Credito =
       IVA de lo recibido de proveedores (costos sin IVA * tasa).
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Finanzas_Iva
    @desde   DATE,
    @hasta   DATE,
    @tasaIva DECIMAL(5,2) = 12
AS
BEGIN
    SET NOCOUNT ON;

    IF @desde IS NULL OR @hasta IS NULL OR @desde > @hasta
        THROW 50010, N'Indique un rango de fechas valido: desde no puede ser mayor que hasta.', 1;
    IF @tasaIva IS NULL OR @tasaIva < 0 OR @tasaIva > 100
        THROW 50012, N'La tasa de IVA debe estar entre 0 y 100.', 1;

    DECLARE @netas DECIMAL(14,2), @compras DECIMAL(14,2);

    SELECT @netas = ventasBrutas - devoluciones
      FROM dbo.fn_ResumenVentas(@desde, @hasta);

    SELECT @compras = CAST(ISNULL(SUM(DE.cantidadEntregada * DE.costoUnitarioReal), 0) AS DECIMAL(14,2))
      FROM dbo.DETALLE_ENTREGA DE
      INNER JOIN dbo.ENTREGA E         ON E.idEntrega = DE.idEntrega
      INNER JOIN dbo.DETALLE_COMPRA DC ON DC.idDetalleCompra = DE.idDetalleCompra
      INNER JOIN dbo.COMPRA C          ON C.idCompra = DC.idCompra
      INNER JOIN dbo.ESTADO EC         ON EC.idEstado = C.idEstado
     WHERE E.fechaEntrega >= @desde AND E.fechaEntrega < DATEADD(DAY, 1, @hasta)
       AND EC.nombre NOT LIKE 'Cancelad%' AND EC.nombre NOT LIKE 'Anulad%';

    DECLARE @debito  DECIMAL(14,2) = ROUND(@netas * @tasaIva / (100 + @tasaIva), 2);
    DECLARE @credito DECIMAL(14,2) = ROUND(@compras * @tasaIva / 100, 2);

    SELECT R.concepto, R.monto
      FROM (VALUES
        (1, CAST('Ventas netas (con IVA)' AS VARCHAR(60)),            @netas),
        (2, CAST('IVA debito fiscal (ventas)' AS VARCHAR(60)),        @debito),
        (3, CAST('Compras recibidas (sin IVA)' AS VARCHAR(60)),       @compras),
        (4, CAST('IVA credito fiscal (compras)' AS VARCHAR(60)),      @credito),
        (5, CAST('IVA por pagar (debito - credito)' AS VARCHAR(60)),  @debito - @credito)
      ) AS R(orden, concepto, monto)
     ORDER BY R.orden;
END
GO


/* ---------------------------------------------------------------------------
   11. PERMISOS: solo si app_django existe y no es quien ejecuta el script ni el
       propietario de la base (el propietario ya tiene todos los permisos y
       SQL Server rechaza el GRANT con "Cannot grant, deny, or revoke...").
   ---------------------------------------------------------------------------*/
IF DATABASE_PRINCIPAL_ID('app_django') IS NOT NULL
   AND DATABASE_PRINCIPAL_ID('app_django') <> USER_ID()      -- no darse permisos a si mismo
   AND IS_ROLEMEMBER('db_owner', 'app_django') <> 1          -- el propietario ya tiene todo
BEGIN
    GRANT SELECT  ON dbo.DETALLE_FACTURA_LOTE TO app_django;
    GRANT INSERT  ON dbo.DETALLE_FACTURA_LOTE TO app_django;
    GRANT UPDATE  ON dbo.DETALLE_FACTURA_LOTE TO app_django;
    GRANT SELECT  ON dbo.vw_LineaFacturaCosto TO app_django;
    GRANT SELECT  ON dbo.fn_ResumenVentas     TO app_django;
    GRANT EXECUTE ON dbo.sp_ConsumirLotesPEPS          TO app_django;
    GRANT EXECUTE ON dbo.sp_RevertirLotesFactura       TO app_django;
    GRANT EXECUTE ON dbo.sp_Finanzas_EstadoResultados  TO app_django;
    GRANT EXECUTE ON dbo.sp_Finanzas_UtilidadPorProducto TO app_django;
    GRANT EXECUTE ON dbo.sp_Finanzas_ValorInventario   TO app_django;
    GRANT EXECUTE ON dbo.sp_Finanzas_CuentasPorPagar   TO app_django;
    GRANT EXECUTE ON dbo.sp_Finanzas_Iva               TO app_django;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0005_finanzas')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0005_finanzas');
GO
