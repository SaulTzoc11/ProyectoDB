
USE PintureriaDB;
GO

CREATE OR ALTER PROCEDURE dbo.sp_CrearOrdenCompra
    @idProveedor INT,
    @idUsuario INT,
    @observaciones VARCHAR(250) = NULL,
    @detalle NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idCompra INT;
    DECLARE @idEstado INT;
    DECLARE @codigoCompra VARCHAR(20);
    DECLARE @total DECIMAL(10,2);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Valida proveedor
        IF NOT EXISTS ( SELECT 1 FROM dbo.PROVEEDOR WHERE idProveedor = @idProveedor AND activo = 1)
            THROW 50001, 'Proveedor no valido.', 1;

        -- Validar usuario
        IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO WHERE idUsuario = @idUsuario AND activo = 1)
            THROW 50002, 'Usuario no valido o inactivo.', 1;

        -- Obtener estado 
        SELECT @idEstado = idEstado
        FROM dbo.ESTADO
        WHERE nombre = 'Pendiente';

        IF @idEstado IS NULL
            THROW 50003, 'No existen pendientes.', 1;

        -- Validar JSON
        IF @detalle IS NULL OR ISJSON(@detalle) <> 1
            THROW 50004, 'El detalle debe ser JSON valido.', 1;

        DECLARE @productos TABLE (
            idProducto INT,
            cantidad INT,
            costoUnitario DECIMAL(10,2)
        );

        INSERT INTO @productos (
            idProducto, cantidad, costoUnitario
        )
        SELECT idProducto, cantidad, costoUnitario
        FROM OPENJSON(@detalle)
        WITH (
            idProducto INT '$.idProducto',
            cantidad INT '$.cantidad',
            costoUnitario DECIMAL(10,2) '$.costoUnitario'
        );

        -- Validaciones de productos
        IF NOT EXISTS (SELECT 1 FROM @productos)
            THROW 50005, 'Agrega al menos un producto.', 1;

        IF EXISTS (
            SELECT 1 FROM @productos
            WHERE idProducto IS NULL
               OR cantidad IS NULL
               OR costoUnitario IS NULL
               OR cantidad <= 0
               OR costoUnitario <= 0
        )
            THROW 50006, 'Cantidad o costo no valido.', 1;

        IF EXISTS (
            SELECT idProducto FROM @productos
            GROUP BY idProducto HAVING COUNT(*) > 1
        )
            THROW 50007, 'Hay productos duplicados.', 1;

        IF EXISTS (
            SELECT 1 FROM @productos d
            LEFT JOIN dbo.PRODUCTO p
                ON p.idProducto = d.idProducto
            WHERE p.idProducto IS NULL OR p.activo = 0
        )
            THROW 50008, 'Hay productos inexistentes o inactivos.', 1;

        -- Calcular total
        SELECT @total = SUM(
            CONVERT(DECIMAL(19,2), cantidad) * costoUnitario
        )
        FROM @productos;

        IF @total > 99999999.99
            THROW 50009, 'El total excede el limite permitido.', 1;

        -- Generar codigo unico
        SET @codigoCompra = 'OC-' +
            LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 17);

        -- Insertar encabezado
        INSERT INTO dbo.COMPRA (
            idProveedor, idUsuario, idEstado,
            codigoCompra, total, observaciones
        )
        VALUES (
            @idProveedor, @idUsuario, @idEstado,
            @codigoCompra, @total, @observaciones
        );

        SET @idCompra = CONVERT(INT, SCOPE_IDENTITY());

        -- Insertar detalle
        INSERT INTO dbo.DETALLE_COMPRA (
            idCompra, idProducto, idEstado,
            cantidad, costoUnitario, subtotal
        )
        SELECT
            @idCompra, idProducto, @idEstado,
            cantidad, costoUnitario,
            cantidad * costoUnitario
        FROM @productos;

        COMMIT TRANSACTION;

        -- Devolver orden creada
        SELECT
            @idCompra AS idCompra,
            @codigoCompra AS codigoCompra,
            @total AS total,
            'Orden creada correctamente' AS mensaje;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO
