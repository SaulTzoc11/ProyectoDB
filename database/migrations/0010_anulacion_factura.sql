USE PintureriaDB;
GO

/* ===========================================================================
   0010 - Anulacion de factura (SP transaccional)
   Que agrega:
     Datos base     ACCION 'ANULAR'
     Procedimiento  sp_AnularFactura
   Flujo de sp_AnularFactura (todo en una sola transaccion):
     1. Busca la factura por noFactura; debe estar 'Emitida'.
     2. Regresa al inventario lo que salio de cada lote (sp_RevertirLotesFactura,
        de la 0005), registrando 'Entrada por anulacion' en MODIFICACION_INVENTARIO.
     3. Cambia la factura a 'Anulada' y deja subtotal/total en 0.
        El monto original queda en observaciones y en la bitacora.
     4. Registra en MOVIMIENTO quien anulo, cuando y que factura.
   Los PAGO y DETALLE_FACTURA se conservan como historial; los reportes ya
   excluyen las anuladas (vw_FacturaVigente).
   Errores propios: 50050 faltan datos, 50051 factura no existe,
     50052 factura no anulable, 50053 cambio de estado durante la anulacion,
     50054 factura sin registro de lotes. Los de PEPS (5003x) se propagan.
   =========================================================================== */

/* ---------------------------------------------------------------------------
   1. Datos base (solo si no existen)
   ---------------------------------------------------------------------------*/
IF NOT EXISTS (SELECT 1 FROM dbo.ACCION WHERE nombre = 'ANULAR')
    INSERT dbo.ACCION (nombre, descripcion) VALUES ('ANULAR', 'Anulacion de una factura');
GO

/* ---------------------------------------------------------------------------
   2. Procedimiento
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_AnularFactura
    @noFactura VARCHAR(50),
    @idUsuario INT,
    @motivo    VARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idFactura INT, @estado VARCHAR(50), @totalOriginal DECIMAL(10,2),
            @obsOriginal VARCHAR(250), @idEstadoEmitida INT, @idEstadoAnulada INT,
            @idMovEntrada INT, @idAccion INT, @idTabla INT, @msg NVARCHAR(300);

    BEGIN TRY
        /* ---------- 1. Validaciones generales ---------- */
        IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO WHERE idUsuario = @idUsuario AND activo = 1)
            THROW 50004, 'El usuario no existe o está inactivo.', 1;

        IF NULLIF(LTRIM(RTRIM(@noFactura)), '') IS NULL
            THROW 50050, 'Indique el número de factura a anular.', 1;

        SELECT @idEstadoEmitida = idEstado FROM dbo.ESTADO WHERE nombre = 'Emitida';
        SELECT @idEstadoAnulada = idEstado FROM dbo.ESTADO WHERE nombre = 'Anulada';
        SELECT @idMovEntrada    = idTipoMovimiento FROM dbo.TIPO_MOVIMIENTO WHERE nombre = 'Entrada por anulacion';
        SELECT @idAccion = idAccion FROM dbo.ACCION WHERE nombre = 'ANULAR';
        SELECT @idTabla  = idTabla  FROM dbo.TABLA  WHERE nombre = 'FACTURA';
        IF @idEstadoEmitida IS NULL OR @idEstadoAnulada IS NULL OR @idMovEntrada IS NULL
           OR @idAccion IS NULL OR @idTabla IS NULL
            THROW 50050, 'Faltan datos base de anulación. Aplique las migraciones 0007 y 0010 completas.', 1;

        /* ---------- 2. Transaccion ---------- */
        BEGIN TRAN;

        -- UPDLOCK: si dos usuarios anulan la misma factura, el segundo espera y luego falla.
        SELECT @idFactura = F.idFactura, @estado = E.nombre,
               @totalOriginal = F.total, @obsOriginal = F.observaciones
          FROM dbo.FACTURA F WITH (UPDLOCK, ROWLOCK)
          JOIN dbo.ESTADO E ON E.idEstado = F.idEstado
         WHERE F.noFactura = @noFactura;

        IF @idFactura IS NULL
        BEGIN
            SET @msg = 'No existe la factura ' + @noFactura + '.';
            THROW 50051, @msg, 1;
        END
        IF @estado <> 'Emitida'
        BEGIN
            SET @msg = 'La factura ' + @noFactura + ' no se puede anular: su estado es ' + @estado + '.';
            THROW 50052, @msg, 1;
        END

        -- Facturas emitidas antes de la 0005 no guardaron de que lote salieron.
        IF NOT EXISTS (SELECT 1
                         FROM dbo.DETALLE_FACTURA_LOTE FL
                         JOIN dbo.DETALLE_FACTURA DF ON DF.idDetalleFactura = FL.idDetalleFactura
                        WHERE DF.idFactura = @idFactura AND FL.revertido = 0)
        BEGIN
            SET @msg = 'La factura ' + @noFactura + ' no tiene registro de lotes; no se puede regresar el inventario.';
            THROW 50054, @msg, 1;
        END

        -- Regresar al inventario (usa esta transaccion).
        EXEC dbo.sp_RevertirLotesFactura @idFactura        = @idFactura,
                                         @idUsuario        = @idUsuario,
                                         @idTipoMovimiento = @idMovEntrada;

        UPDATE dbo.FACTURA
           SET idEstado      = @idEstadoAnulada,
               subtotal      = 0,
               descuento     = 0,
               total         = 0,
               observaciones = LEFT('ANULADA (total original Q' + CONVERT(VARCHAR(20), @totalOriginal) + ')'
                                    + ISNULL('. Motivo: ' + NULLIF(@motivo, ''), '')
                                    + ISNULL(' | ' + @obsOriginal, ''), 250)
         WHERE idFactura = @idFactura AND idEstado = @idEstadoEmitida;
        IF @@ROWCOUNT = 0
            THROW 50053, 'La factura cambió de estado mientras se anulaba. Intente de nuevo.', 1;

        INSERT dbo.MOVIMIENTO (idUsuario, idAccion, idTabla, informacionModificada)
        VALUES (@idUsuario, @idAccion, @idTabla,
                LEFT('Factura ' + @noFactura + ' anulada. Total original: Q' + CONVERT(VARCHAR(20), @totalOriginal)
                     + '. Inventario devuelto a sus lotes' + ISNULL('. Motivo: ' + NULLIF(@motivo, ''), ''), 255));

        COMMIT;

        SELECT @idFactura AS idFactura, @noFactura AS noFactura,
               @totalOriginal AS totalAnulado, 'Anulada' AS estado;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

/* ---------------------------------------------------------------------------
   3. Permisos (mismo criterio que 0005 y 0007)
   ---------------------------------------------------------------------------*/
IF DATABASE_PRINCIPAL_ID('app_django') IS NOT NULL
   AND DATABASE_PRINCIPAL_ID('app_django') <> USER_ID()
   AND IS_ROLEMEMBER('db_owner', 'app_django') <> 1
BEGIN
    GRANT EXECUTE ON dbo.sp_AnularFactura TO app_django;
END
GO

IF OBJECT_ID('dbo.sp_AnularFactura', 'P') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0010_anulacion_factura')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0010_anulacion_factura');
GO
