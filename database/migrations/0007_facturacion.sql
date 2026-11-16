USE PintureriaDB;
GO

/* ===========================================================================
   0007 - Facturacion (SP transaccional)
   Que agrega:
     Datos base     ESTADO 'Facturada' (cotizacion), 'Emitida' y 'Anulada' (factura),
                    TIPO_PAGO Efectivo/Cheque/Tarjeta, TIPO_MOVIMIENTO de venta/anulacion,
                    ACCION 'FACTURAR', TABLA 'FACTURA'
     Secuencia      seq_noFactura  ->  FAC-AAAA-000001
     Procedimiento  sp_FacturarJson

   Flujo de sp_FacturarJson:
     A) Con cotizacion:  @idCotizacion (debe estar 'Confirmada' y sin factura).
     B) Sin cotizacion:  @idCliente + @detalleJson. El SP "cotiza en el momento":
        llama a sp_GenerarCotizacionJson y sp_ConfirmarCotizacion (las que ya existen,
        sin modificarlas) y sigue como en A.
     Pagos en JSON:  [ {"idTipoPago": 1, "monto": 500.00, "observaciones": "..."} ]
     La suma de los pagos debe ser igual al total de la cotizacion.

   Convencion de descuentos (misma de la cotizacion):
     DETALLE_FACTURA.descuento = PORCENTAJE de la linea
     FACTURA.descuento (DECIMAL(5,2)) = PORCENTAJE efectivo global
                                        (monto descontado * 100 / subtotal).
     El monto en quetzales es subtotal - total.

   Errores propios: 50040 pagos invalidos, 50041 cotizacion no facturable,
     50042 cotizacion cambio de estado, 50043 sin existencia, 50044 pagos no cuadran,
     50045 faltan datos. Los de PEPS (5003x) y cotizacion (5000x/5002x) se propagan.
   =========================================================================== */

/* ---------------------------------------------------------------------------
   1. Datos base (solo si no existen)
   ---------------------------------------------------------------------------*/
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Facturada') INSERT dbo.ESTADO (nombre) VALUES ('Facturada');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Emitida')   INSERT dbo.ESTADO (nombre) VALUES ('Emitida');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Anulada')   INSERT dbo.ESTADO (nombre) VALUES ('Anulada');

IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_PAGO WHERE nombre = 'Efectivo') INSERT dbo.TIPO_PAGO (nombre, descripcion) VALUES ('Efectivo', 'Pago en efectivo');
IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_PAGO WHERE nombre = 'Cheque')   INSERT dbo.TIPO_PAGO (nombre, descripcion) VALUES ('Cheque',   'Pago con cheque');
IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_PAGO WHERE nombre = 'Tarjeta')  INSERT dbo.TIPO_PAGO (nombre, descripcion) VALUES ('Tarjeta',  'Pago con tarjeta');

IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_MOVIMIENTO WHERE nombre = 'Salida por venta')
    INSERT dbo.TIPO_MOVIMIENTO (nombre, descripcion) VALUES ('Salida por venta', 'Salida de lote por facturacion (PEPS)');
IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_MOVIMIENTO WHERE nombre = 'Entrada por anulacion')
    INSERT dbo.TIPO_MOVIMIENTO (nombre, descripcion) VALUES ('Entrada por anulacion', 'Regreso a lote por anulacion de factura');

IF NOT EXISTS (SELECT 1 FROM dbo.ACCION WHERE nombre = 'FACTURAR')
    INSERT dbo.ACCION (nombre, descripcion) VALUES ('FACTURAR', 'Emision de una factura');
IF NOT EXISTS (SELECT 1 FROM dbo.TABLA WHERE nombre = 'FACTURA')
    INSERT dbo.TABLA (nombre) VALUES ('FACTURA');
GO

IF OBJECT_ID('dbo.seq_noFactura', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_noFactura AS INT START WITH 1 INCREMENT BY 1;
GO

/* ---------------------------------------------------------------------------
   2. sp_FacturarJson
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_FacturarJson
    @idUsuario     INT,
    @pagosJson     NVARCHAR(MAX),
    @idCotizacion  INT           = NULL,
    @idCliente     INT           = NULL,
    @detalleJson   NVARCHAR(MAX) = NULL,
    @observaciones VARCHAR(250)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idEstadoConfirmada INT, @idEstadoFacturada INT, @idEstadoEmitida INT,
            @idMovSalida INT, @idAccion INT, @idTabla INT,
            @idFactura INT, @noFactura VARCHAR(30),
            @bruto DECIMAL(12,2), @neto DECIMAL(12,2), @pagado DECIMAL(12,2),
            @pct DECIMAL(5,2), @estadoCot VARCHAR(50), @codigoCot VARCHAR(30),
            @idFalta INT, @nombreFalta NVARCHAR(200), @msg NVARCHAR(300),
            @idDetalle INT, @lineas INT;

    DECLARE @Pagos TABLE (idTipoPago INT NOT NULL, monto DECIMAL(10,2) NOT NULL, observaciones VARCHAR(100) NULL);
    DECLARE @Req   TABLE (idProducto INT NOT NULL PRIMARY KEY, cantidad INT NOT NULL);
    DECLARE @CotNueva TABLE (idCotizacion INT, codigoCotizacion VARCHAR(30), total DECIMAL(12,2));
    DECLARE @CotConf  TABLE (idCotizacion INT, codigoCotizacion VARCHAR(30), estado VARCHAR(50));

    BEGIN TRY
        /* ---------- 1. Validaciones generales (sin transaccion abierta) ---------- */
        IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO WHERE idUsuario = @idUsuario AND activo = 1)
            THROW 50004, 'El usuario no existe o está inactivo.', 1;

        IF @pagosJson IS NULL OR ISJSON(@pagosJson) = 0
            THROW 50040, 'Los pagos no son un JSON válido.', 1;

        INSERT @Pagos (idTipoPago, monto, observaciones)
        SELECT idTipoPago, monto, observaciones
        FROM OPENJSON(@pagosJson)
             WITH (idTipoPago INT           '$.idTipoPago',
                   monto      DECIMAL(10,2) '$.monto',
                   observaciones VARCHAR(100) '$.observaciones');

        IF NOT EXISTS (SELECT 1 FROM @Pagos)
            THROW 50040, 'Debe indicar al menos un medio de pago.', 1;
        IF EXISTS (SELECT 1 FROM @Pagos WHERE idTipoPago IS NULL OR monto IS NULL OR monto <= 0)
            THROW 50040, 'Cada pago requiere tipo de pago y un monto mayor a cero.', 1;
        IF EXISTS (SELECT 1 FROM @Pagos p
                   LEFT JOIN dbo.TIPO_PAGO tp ON tp.idTipoPago = p.idTipoPago AND tp.activo = 1
                   WHERE tp.idTipoPago IS NULL)
            THROW 50040, 'Hay medios de pago inexistentes o inactivos.', 1;

        SELECT @idEstadoConfirmada = idEstado FROM dbo.ESTADO WHERE nombre = 'Confirmada';
        SELECT @idEstadoFacturada  = idEstado FROM dbo.ESTADO WHERE nombre = 'Facturada';
        SELECT @idEstadoEmitida    = idEstado FROM dbo.ESTADO WHERE nombre = 'Emitida';
        SELECT @idMovSalida        = idTipoMovimiento FROM dbo.TIPO_MOVIMIENTO WHERE nombre = 'Salida por venta';
        SELECT @idAccion = idAccion FROM dbo.ACCION WHERE nombre = 'FACTURAR';
        SELECT @idTabla  = idTabla  FROM dbo.TABLA  WHERE nombre = 'FACTURA';
        IF @idEstadoConfirmada IS NULL OR @idEstadoFacturada IS NULL OR @idEstadoEmitida IS NULL
           OR @idMovSalida IS NULL OR @idAccion IS NULL OR @idTabla IS NULL
            THROW 50045, 'Faltan datos base de facturación. Aplique la migración 0007 completa.', 1;

        /* ---------- 2. Que se va a vender (cotizacion existente o JSON) ---------- */
        IF @idCotizacion IS NOT NULL
        BEGIN
            SELECT @estadoCot = e.nombre, @codigoCot = c.codigoCotizacion
            FROM dbo.COTIZACION c JOIN dbo.ESTADO e ON e.idEstado = c.idEstado
            WHERE c.idCotizacion = @idCotizacion;

            IF @codigoCot IS NULL
                THROW 50041, 'La cotización no existe.', 1;
            IF @estadoCot <> 'Confirmada'
            BEGIN
                SET @msg = 'La cotización ' + @codigoCot + ' no se puede facturar: su estado es ' + @estadoCot + '.';
                THROW 50041, @msg, 1;
            END
            IF EXISTS (SELECT 1 FROM dbo.FACTURA WHERE idCotizacion = @idCotizacion)
                THROW 50041, 'La cotización ya tiene una factura.', 1;

            INSERT @Req (idProducto, cantidad)
            SELECT idProducto, SUM(cantidad)
            FROM dbo.DETALLE_COTIZACION WHERE idCotizacion = @idCotizacion
            GROUP BY idProducto;
        END
        ELSE
        BEGIN
            IF @idCliente IS NULL OR @detalleJson IS NULL OR ISJSON(@detalleJson) = 0
                THROW 50045, 'Sin cotización se requiere idCliente y un detalle JSON válido.', 1;

            INSERT @Req (idProducto, cantidad)
            SELECT idProducto, SUM(ISNULL(cantidad, 0))
            FROM OPENJSON(@detalleJson)
                 WITH (idProducto INT '$.idProducto', cantidad INT '$.cantidad')
            WHERE idProducto IS NOT NULL
            GROUP BY idProducto;
        END

        /* ---------- 3. Existencia suficiente (mismo criterio que PEPS) ----------
           Se revisa ANTES de cotizar para no dejar cotizaciones huerfanas por falta de stock.
           PEPS vuelve a validar dentro de la transaccion (con bloqueo).            */
        SELECT TOP (1) @idFalta = r.idProducto
        FROM @Req r
        CROSS APPLY (
            SELECT ISNULL(SUM(L.cantidadDisponible), 0) AS disponible
            FROM dbo.LOTE L
            JOIN dbo.DETALLE_ENTREGA DE ON DE.idDetalleEntrega = L.idDetalleEntrega
            JOIN dbo.DETALLE_COMPRA  DC ON DC.idDetalleCompra  = DE.idDetalleCompra
            JOIN dbo.ESTANTE ES         ON ES.idEstante = L.idEstante
            JOIN dbo.BODEGA  B          ON B.idBodega   = ES.idBodega
            WHERE DC.idProducto = r.idProducto AND L.cantidadDisponible > 0
              AND ES.activo = 1 AND B.activo = 1
        ) s
        WHERE s.disponible < r.cantidad;

        IF @idFalta IS NOT NULL
        BEGIN
            SELECT @nombreFalta = nombreCompleto FROM dbo.vw_ProductoDescripcion WHERE idProducto = @idFalta;
            SET @msg = 'Existencia insuficiente de: ' + ISNULL(@nombreFalta, CAST(@idFalta AS VARCHAR(10))) + '.';
            THROW 50043, @msg, 1;
        END

        /* ---------- 4. Sin cotizacion: cotizar y confirmar en el momento ---------- */
        IF @idCotizacion IS NULL
        BEGIN
            INSERT @CotNueva EXEC dbo.sp_GenerarCotizacionJson
                 @idCliente = @idCliente, @idUsuario = @idUsuario,
                 @observaciones = @observaciones, @detalleJson = @detalleJson;
            SELECT TOP (1) @idCotizacion = idCotizacion FROM @CotNueva;

            INSERT @CotConf EXEC dbo.sp_ConfirmarCotizacion
                 @idCotizacion = @idCotizacion, @idUsuario = @idUsuario;
        END

        /* ---------- 5. Los pagos deben cuadrar con el total ---------- */
        SELECT @idCliente = c.idCliente, @bruto = c.subtotal, @neto = c.total
        FROM dbo.COTIZACION c WHERE c.idCotizacion = @idCotizacion;

        SELECT @pagado = SUM(monto) FROM @Pagos;
        IF @pagado <> @neto
        BEGIN
            SET @msg = 'Los pagos (Q' + CONVERT(VARCHAR(20), @pagado) + ') no coinciden con el total (Q'
                     + CONVERT(VARCHAR(20), @neto) + ').';
            THROW 50044, @msg, 1;
        END

        SET @pct = CASE WHEN @bruto = 0 THEN 0
                        ELSE CAST(ROUND((@bruto - @neto) * 100.0 / @bruto, 2) AS DECIMAL(5,2)) END;

        /* ---------- 6. Transaccion: factura + detalle + PEPS + pagos + bitacora ---------- */
        BEGIN TRAN;

        -- Condicion de estado en el UPDATE: si dos cajeros facturan la misma cotizacion, solo uno pasa.
        UPDATE dbo.COTIZACION SET idEstado = @idEstadoFacturada
        WHERE idCotizacion = @idCotizacion AND idEstado = @idEstadoConfirmada;
        IF @@ROWCOUNT = 0
            THROW 50042, 'La cotización cambió de estado mientras se facturaba. Intente de nuevo.', 1;

        SET @noFactura = 'FAC-' + CAST(YEAR(SYSDATETIME()) AS CHAR(4)) + '-'
                       + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.seq_noFactura AS VARCHAR(10)), 6);

        INSERT dbo.FACTURA (idCliente, idUsuario, idCotizacion, idEstado, noFactura,
                            subtotal, descuento, total, observaciones)
        VALUES (@idCliente, @idUsuario, @idCotizacion, @idEstadoEmitida, @noFactura,
                @bruto, @pct, @neto, @observaciones);
        SET @idFactura = SCOPE_IDENTITY();

        INSERT dbo.DETALLE_FACTURA (idFactura, idProducto, cantidad, precioUnitario, descuento, subtotal)
        SELECT @idFactura, idProducto, cantidad, precioUnitario, descuento, subtotal
        FROM dbo.DETALLE_COTIZACION WHERE idCotizacion = @idCotizacion;
        SET @lineas = @@ROWCOUNT;

        -- Salida de inventario por linea, del lote mas antiguo (PEPS). Usa esta transaccion.
        DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
            SELECT idDetalleFactura FROM dbo.DETALLE_FACTURA WHERE idFactura = @idFactura;
        OPEN cur;
        FETCH NEXT FROM cur INTO @idDetalle;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            EXEC dbo.sp_ConsumirLotesPEPS @idDetalleFactura = @idDetalle,
                                          @idUsuario = @idUsuario,
                                          @idTipoMovimiento = @idMovSalida;
            FETCH NEXT FROM cur INTO @idDetalle;
        END
        CLOSE cur; DEALLOCATE cur;

        INSERT dbo.PAGO (idFactura, idTipoPago, idUsuario, monto, observaciones)
        SELECT @idFactura, idTipoPago, @idUsuario, monto, observaciones FROM @Pagos;

        INSERT dbo.MOVIMIENTO (idUsuario, idAccion, idTabla, informacionModificada)
        VALUES (@idUsuario, @idAccion, @idTabla,
                LEFT('Factura ' + @noFactura + ' emitida desde cotizacion ' + ISNULL(@codigoCot, CAST(@idCotizacion AS VARCHAR(10)))
                     + '. Lineas: ' + CAST(@lineas AS VARCHAR(10)) + '. Total: Q' + CONVERT(VARCHAR(20), @neto), 255));

        COMMIT;

        SELECT @idFactura AS idFactura, @noFactura AS noFactura, @idCotizacion AS idCotizacion, @neto AS total;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

/* ---------------------------------------------------------------------------
   3. Permisos (mismo criterio que 0005)
   ---------------------------------------------------------------------------*/
IF DATABASE_PRINCIPAL_ID('app_django') IS NOT NULL
   AND DATABASE_PRINCIPAL_ID('app_django') <> USER_ID()
   AND IS_ROLEMEMBER('db_owner', 'app_django') <> 1
BEGIN
    GRANT EXECUTE ON dbo.sp_FacturarJson TO app_django;
END
GO

IF OBJECT_ID('dbo.sp_FacturarJson', 'P') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0007_facturacion')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0007_facturacion');
GO