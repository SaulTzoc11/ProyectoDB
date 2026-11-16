USE PintureriaDB;
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegistrarIngresoBodega
    @idCompra INT,
    @idUsuario INT,
    @observaciones VARCHAR(250) = NULL,
    @detalle NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @pendiente INT, @parcial INT, @completa INT, @vigente INT;
    DECLARE @entrada INT, @idEntrega INT, @codigoEntrega VARCHAR(30);
    DECLARE @idDetalleCompra INT, @idEstante INT, @cantidad INT;
    DECLARE @costo DECIMAL(10,2), @idDetalleEntrega INT, @idLote INT;
    DECLARE @numero INT = 1, @maximo INT, @estadoFinal VARCHAR(20);

    DECLARE @productos TABLE (
        numero INT IDENTITY(1,1),
        idDetalleCompra INT,
        idEstante INT,
        cantidad INT,
        costoUnitarioReal DECIMAL(10,2)
    );

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Bloquea la orden mientras se registra la recepción.
        IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA WITH (UPDLOCK, HOLDLOCK)
                       WHERE idCompra = @idCompra)
            THROW 50001, 'La orden de compra no existe.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO
                       WHERE idUsuario = @idUsuario AND activo = 1)
            THROW 50002, 'El usuario no existe o está inactivo.', 1;

        SELECT @pendiente = idEstado FROM dbo.ESTADO WHERE nombre = 'Pendiente';
        SELECT @parcial = idEstado FROM dbo.ESTADO WHERE nombre = 'Parcial';
        SELECT @completa = idEstado FROM dbo.ESTADO WHERE nombre = 'Completa';
        SELECT @vigente = idEstado FROM dbo.ESTADO WHERE nombre = 'Vigente';
        SELECT @entrada = idTipoMovimiento FROM dbo.TIPO_MOVIMIENTO
        WHERE nombre = 'Entrada por compra';

        IF @pendiente IS NULL OR @parcial IS NULL OR @completa IS NULL
           OR @vigente IS NULL OR @entrada IS NULL
            THROW 50003, 'Faltan estados o el movimiento Entrada por compra.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA
                       WHERE idCompra = @idCompra AND idEstado IN (@pendiente, @parcial))
            THROW 50004, 'La orden ya está completa o no admite recepción.', 1;

        IF @detalle IS NULL OR ISJSON(@detalle) <> 1 OR LEFT(LTRIM(@detalle), 1) <> '['
            THROW 50005, 'Envía una lista JSON válida de productos.', 1;

        INSERT INTO @productos (idDetalleCompra, idEstante, cantidad, costoUnitarioReal)
        SELECT idDetalleCompra, idEstante, cantidad, costoUnitarioReal
        FROM OPENJSON(@detalle)
        WITH (
            idDetalleCompra INT '$.idDetalleCompra',
            idEstante INT '$.idEstante',
            cantidad INT '$.cantidad',
            costoUnitarioReal DECIMAL(10,2) '$.costoUnitarioReal'
        );

        IF NOT EXISTS (SELECT 1 FROM @productos)
            THROW 50006, 'Agrega al menos un producto recibido.', 1;

        IF EXISTS (SELECT 1 FROM @productos
                   WHERE idDetalleCompra IS NULL OR idEstante IS NULL
                      OR cantidad IS NULL OR cantidad <= 0
                      OR costoUnitarioReal IS NULL OR costoUnitarioReal <= 0)
            THROW 50007, 'Hay cantidades, costos o identificadores inválidos.', 1;

        IF EXISTS (SELECT idDetalleCompra FROM @productos
                   GROUP BY idDetalleCompra HAVING COUNT(*) > 1)
            THROW 50008, 'No repitas el mismo detalle en una recepción.', 1;

        IF EXISTS (
            SELECT 1 FROM @productos p
            LEFT JOIN dbo.DETALLE_COMPRA d ON d.idDetalleCompra = p.idDetalleCompra
            WHERE d.idDetalleCompra IS NULL OR d.idCompra <> @idCompra
        )
            THROW 50009, 'Un producto no pertenece a la orden.', 1;

        IF EXISTS (SELECT 1 FROM @productos p
                   LEFT JOIN dbo.ESTANTE e ON e.idEstante = p.idEstante
                   WHERE e.idEstante IS NULL OR e.activo = 0)
            THROW 50010, 'El estante no existe o está inactivo.', 1;

        -- Nunca aceptar cantidades superiores al saldo pendiente.
        IF EXISTS (
            SELECT 1 FROM @productos p
            JOIN dbo.DETALLE_COMPRA d ON d.idDetalleCompra = p.idDetalleCompra
            OUTER APPLY (
                SELECT COALESCE(SUM(de.cantidadEntregada), 0) AS recibido
                FROM dbo.DETALLE_ENTREGA de
                JOIN dbo.ENTREGA e ON e.idEntrega = de.idEntrega
                WHERE de.idDetalleCompra = d.idDetalleCompra
                  AND e.idEstado <> (SELECT idEstado FROM dbo.ESTADO WHERE nombre = 'Anulada')
            ) r
            WHERE p.cantidad > d.cantidad - r.recibido
        )
            THROW 50011, 'La cantidad recibida supera lo pendiente.', 1;

        SET @codigoEntrega = 'ENT-' + REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', '');
        -- codigoEntrega admite hasta 30 caracteres.
        SET @codigoEntrega = LEFT(@codigoEntrega, 30);

        INSERT INTO dbo.ENTREGA (idCompra, idUsuario, idEstado, codigoEntrega, observaciones)
        VALUES (@idCompra, @idUsuario, @vigente, @codigoEntrega, @observaciones);
        SET @idEntrega = CONVERT(INT, SCOPE_IDENTITY());

        SELECT @maximo = COUNT(*) FROM @productos;
        WHILE @numero <= @maximo
        BEGIN
            SELECT @idDetalleCompra = idDetalleCompra, @idEstante = idEstante,
                   @cantidad = cantidad, @costo = costoUnitarioReal
            FROM @productos WHERE numero = @numero;

            INSERT INTO dbo.DETALLE_ENTREGA
                (idEntrega, idDetalleCompra, cantidadEntregada, costoUnitarioReal)
            VALUES (@idEntrega, @idDetalleCompra, @cantidad, @costo);
            SET @idDetalleEntrega = CONVERT(INT, SCOPE_IDENTITY());

            INSERT INTO dbo.LOTE
                (idDetalleEntrega, idEstante, idEstado, codigoLote,
                 cantidadInicial, cantidadDisponible)
            VALUES
                (@idDetalleEntrega, @idEstante, @vigente,
                 'LOT-' + REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''),
                 @cantidad, @cantidad);
            SET @idLote = CONVERT(INT, SCOPE_IDENTITY());

            INSERT INTO dbo.MODIFICACION_INVENTARIO
                (idLote, idTipoMovimiento, idUsuario, cantidad, observaciones)
            VALUES (@idLote, @entrada, @idUsuario, @cantidad, 'Entrada por compra');

            SET @numero = @numero + 1;
        END;

        -- Actualiza el estado de cada línea según lo que ha llegado hasta hoy.
        UPDATE d SET idEstado = CASE
            WHEN COALESCE(r.recibido, 0) >= d.cantidad THEN @completa
            WHEN COALESCE(r.recibido, 0) > 0 THEN @parcial
            ELSE @pendiente END
        FROM dbo.DETALLE_COMPRA d
        OUTER APPLY (
            SELECT SUM(de.cantidadEntregada) AS recibido
            FROM dbo.DETALLE_ENTREGA de
            JOIN dbo.ENTREGA e ON e.idEntrega = de.idEntrega
            WHERE de.idDetalleCompra = d.idDetalleCompra AND e.idEstado <>
                (SELECT idEstado FROM dbo.ESTADO WHERE nombre = 'Anulada')
        ) r
        WHERE d.idCompra = @idCompra;

        UPDATE dbo.COMPRA SET idEstado = CASE
            WHEN NOT EXISTS (SELECT 1 FROM dbo.DETALLE_COMPRA
                             WHERE idCompra = @idCompra AND idEstado <> @completa)
            THEN @completa ELSE @parcial END
        WHERE idCompra = @idCompra;

        SELECT @estadoFinal = e.nombre
        FROM dbo.COMPRA c JOIN dbo.ESTADO e ON c.idEstado = e.idEstado
        WHERE c.idCompra = @idCompra;

        COMMIT TRANSACTION;

        SELECT @idEntrega AS idEntrega, @codigoEntrega AS codigoEntrega,
               @estadoFinal AS estadoOrden, 'Ingreso registrado correctamente' AS mensaje;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
USE PintureriaDB;
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegistrarIngresoBodega
    @idCompra INT,
    @idUsuario INT,
    @observaciones VARCHAR(250) = NULL,
    @detalle NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @pendiente INT, @parcial INT, @completa INT, @vigente INT;
    DECLARE @entrada INT, @idEntrega INT, @codigoEntrega VARCHAR(30);
    DECLARE @idDetalleCompra INT, @idEstante INT, @cantidad INT;
    DECLARE @costo DECIMAL(10,2), @idDetalleEntrega INT, @idLote INT;
    DECLARE @numero INT = 1, @maximo INT, @estadoFinal VARCHAR(20);

    DECLARE @productos TABLE (
        numero INT IDENTITY(1,1),
        idDetalleCompra INT,
        idEstante INT,
        cantidad INT,
        costoUnitarioReal DECIMAL(10,2)
    );

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Bloquea la orden mientras se registra la recepción.
        IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA WITH (UPDLOCK, HOLDLOCK)
                       WHERE idCompra = @idCompra)
            THROW 50001, 'La orden de compra no existe.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO
                       WHERE idUsuario = @idUsuario AND activo = 1)
            THROW 50002, 'El usuario no existe o está inactivo.', 1;

        SELECT @pendiente = idEstado FROM dbo.ESTADO WHERE nombre = 'Pendiente';
        SELECT @parcial = idEstado FROM dbo.ESTADO WHERE nombre = 'Parcial';
        SELECT @completa = idEstado FROM dbo.ESTADO WHERE nombre = 'Completa';
        SELECT @vigente = idEstado FROM dbo.ESTADO WHERE nombre = 'Vigente';
        SELECT @entrada = idTipoMovimiento FROM dbo.TIPO_MOVIMIENTO
        WHERE nombre = 'Entrada por compra';

        IF @pendiente IS NULL OR @parcial IS NULL OR @completa IS NULL
           OR @vigente IS NULL OR @entrada IS NULL
            THROW 50003, 'Faltan estados o el movimiento Entrada por compra.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.COMPRA
                       WHERE idCompra = @idCompra AND idEstado IN (@pendiente, @parcial))
            THROW 50004, 'La orden ya está completa o no admite recepción.', 1;

        IF @detalle IS NULL OR ISJSON(@detalle) <> 1 OR LEFT(LTRIM(@detalle), 1) <> '['
            THROW 50005, 'Envía una lista JSON válida de productos.', 1;

        INSERT INTO @productos (idDetalleCompra, idEstante, cantidad, costoUnitarioReal)
        SELECT idDetalleCompra, idEstante, cantidad, costoUnitarioReal
        FROM OPENJSON(@detalle)
        WITH (
            idDetalleCompra INT '$.idDetalleCompra',
            idEstante INT '$.idEstante',
            cantidad INT '$.cantidad',
            costoUnitarioReal DECIMAL(10,2) '$.costoUnitarioReal'
        );

        IF NOT EXISTS (SELECT 1 FROM @productos)
            THROW 50006, 'Agrega al menos un producto recibido.', 1;

        IF EXISTS (SELECT 1 FROM @productos
                   WHERE idDetalleCompra IS NULL OR idEstante IS NULL
                      OR cantidad IS NULL OR cantidad <= 0
                      OR costoUnitarioReal IS NULL OR costoUnitarioReal <= 0)
            THROW 50007, 'Hay cantidades, costos o identificadores inválidos.', 1;

        IF EXISTS (SELECT idDetalleCompra FROM @productos
                   GROUP BY idDetalleCompra HAVING COUNT(*) > 1)
            THROW 50008, 'No repitas el mismo detalle en una recepción.', 1;

        IF EXISTS (
            SELECT 1 FROM @productos p
            LEFT JOIN dbo.DETALLE_COMPRA d ON d.idDetalleCompra = p.idDetalleCompra
            WHERE d.idDetalleCompra IS NULL OR d.idCompra <> @idCompra
        )
            THROW 50009, 'Un producto no pertenece a la orden.', 1;

        IF EXISTS (SELECT 1 FROM @productos p
                   LEFT JOIN dbo.ESTANTE e ON e.idEstante = p.idEstante
                   WHERE e.idEstante IS NULL OR e.activo = 0)
            THROW 50010, 'El estante no existe o está inactivo.', 1;

        -- Nunca aceptar cantidades superiores al saldo pendiente.
        IF EXISTS (
            SELECT 1 FROM @productos p
            JOIN dbo.DETALLE_COMPRA d ON d.idDetalleCompra = p.idDetalleCompra
            OUTER APPLY (
                SELECT COALESCE(SUM(de.cantidadEntregada), 0) AS recibido
                FROM dbo.DETALLE_ENTREGA de
                JOIN dbo.ENTREGA e ON e.idEntrega = de.idEntrega
                WHERE de.idDetalleCompra = d.idDetalleCompra
                  AND e.idEstado <> (SELECT idEstado FROM dbo.ESTADO WHERE nombre = 'Anulada')
            ) r
            WHERE p.cantidad > d.cantidad - r.recibido
        )
            THROW 50011, 'La cantidad recibida supera lo pendiente.', 1;

        SET @codigoEntrega = 'ENT-' + REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', '');
        -- codigoEntrega admite hasta 30 caracteres.
        SET @codigoEntrega = LEFT(@codigoEntrega, 30);

        INSERT INTO dbo.ENTREGA (idCompra, idUsuario, idEstado, codigoEntrega, observaciones)
        VALUES (@idCompra, @idUsuario, @vigente, @codigoEntrega, @observaciones);
        SET @idEntrega = CONVERT(INT, SCOPE_IDENTITY());

        SELECT @maximo = COUNT(*) FROM @productos;
        WHILE @numero <= @maximo
        BEGIN
            SELECT @idDetalleCompra = idDetalleCompra, @idEstante = idEstante,
                   @cantidad = cantidad, @costo = costoUnitarioReal
            FROM @productos WHERE numero = @numero;

            INSERT INTO dbo.DETALLE_ENTREGA
                (idEntrega, idDetalleCompra, cantidadEntregada, costoUnitarioReal)
            VALUES (@idEntrega, @idDetalleCompra, @cantidad, @costo);
            SET @idDetalleEntrega = CONVERT(INT, SCOPE_IDENTITY());

            INSERT INTO dbo.LOTE
                (idDetalleEntrega, idEstante, idEstado, codigoLote,
                 cantidadInicial, cantidadDisponible)
            VALUES
                (@idDetalleEntrega, @idEstante, @vigente,
                 'LOT-' + REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''),
                 @cantidad, @cantidad);
            SET @idLote = CONVERT(INT, SCOPE_IDENTITY());

            INSERT INTO dbo.MODIFICACION_INVENTARIO
                (idLote, idTipoMovimiento, idUsuario, cantidad, observaciones)
            VALUES (@idLote, @entrada, @idUsuario, @cantidad, 'Entrada por compra');

            SET @numero = @numero + 1;
        END;

        -- Actualiza el estado de cada línea según lo que ha llegado hasta hoy.
        UPDATE d SET idEstado = CASE
            WHEN COALESCE(r.recibido, 0) >= d.cantidad THEN @completa
            WHEN COALESCE(r.recibido, 0) > 0 THEN @parcial
            ELSE @pendiente END
        FROM dbo.DETALLE_COMPRA d
        OUTER APPLY (
            SELECT SUM(de.cantidadEntregada) AS recibido
            FROM dbo.DETALLE_ENTREGA de
            JOIN dbo.ENTREGA e ON e.idEntrega = de.idEntrega
            WHERE de.idDetalleCompra = d.idDetalleCompra AND e.idEstado <>
                (SELECT idEstado FROM dbo.ESTADO WHERE nombre = 'Anulada')
        ) r
        WHERE d.idCompra = @idCompra;

        UPDATE dbo.COMPRA SET idEstado = CASE
            WHEN NOT EXISTS (SELECT 1 FROM dbo.DETALLE_COMPRA
                             WHERE idCompra = @idCompra AND idEstado <> @completa)
            THEN @completa ELSE @parcial END
        WHERE idCompra = @idCompra;

        SELECT @estadoFinal = e.nombre
        FROM dbo.COMPRA c JOIN dbo.ESTADO e ON c.idEstado = e.idEstado
        WHERE c.idCompra = @idCompra;

        COMMIT TRANSACTION;

        SELECT @idEntrega AS idEntrega, @codigoEntrega AS codigoEntrega,
               @estadoFinal AS estadoOrden, 'Ingreso registrado correctamente' AS mensaje;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
