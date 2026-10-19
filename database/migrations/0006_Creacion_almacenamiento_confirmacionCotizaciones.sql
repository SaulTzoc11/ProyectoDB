USE PintureriaDB;
GO

/* ===========================================================================
   MIGRACION 0004_cotizacion_procedimientos
   Modulo de cotizaciones:
     - Datos base de catalogo (estados, acciones y tabla para la bitacora)
     - Secuencia para el codigo COT-AAAA-000001
     - sp_GenerarCotizacionJson    : guarda la cotizacion (detalle como JSON, transaccional)
     - sp_ConfirmarCotizacion      : Pendiente -> Confirmada
     - sp_ObtenerCotizacionImpresion : datos de COTIZACION y DETALLE_COTIZACION para imprimir
   Es idempotente: se puede ejecutar varias veces sin duplicar nada.
   Requisito: el estado 'Vigente' (precios) y los tipos de precio 'Individual'/'Empresa'
   deben existir al USAR los procedimientos (no al crearlos).
   ===========================================================================*/

/* ---------------------------------------------------------------------------
   1. Datos base (solo se insertan si no existen)
   ---------------------------------------------------------------------------*/
/* ---------- 0) Datos base necesarios (solo se insertan si no existen) ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Pendiente')
    INSERT dbo.ESTADO (nombre) VALUES ('Pendiente');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Confirmada')
    INSERT dbo.ESTADO (nombre) VALUES ('Confirmada');

IF NOT EXISTS (SELECT 1 FROM dbo.ACCION WHERE nombre = 'INSERT')
    INSERT dbo.ACCION (nombre, descripcion) VALUES ('INSERT', 'Creación de un registro');
IF NOT EXISTS (SELECT 1 FROM dbo.ACCION WHERE nombre = 'CONFIRMAR')
    INSERT dbo.ACCION (nombre, descripcion) VALUES ('CONFIRMAR', 'Confirmación de un documento');

IF NOT EXISTS (SELECT 1 FROM dbo.TABLA WHERE nombre = 'COTIZACION')
    INSERT dbo.TABLA (nombre) VALUES ('COTIZACION');
GO

/* ---------------------------------------------------------------------------
   2. Secuencia para el codigo de cotizacion
   ---------------------------------------------------------------------------*/
IF OBJECT_ID('dbo.seq_codigoCotizacion', 'SO') IS NULL
    CREATE SEQUENCE dbo.seq_codigoCotizacion AS INT START WITH 1 INCREMENT BY 1;
GO

/* ---------------------------------------------------------------------------
   3. SP: guardar cotizacion (detalle en JSON)
   ---------------------------------------------------------------------------*/
/* =====================================================================
   2) sp_GenerarCotizacionJson
   JSON esperado:
   [ {"idProducto": 1, "cantidad": 3, "descuento": 5},
     {"idProducto": 7, "cantidad": 2} ]               -- descuento opcional (%)

   Convención: DETALLE_COTIZACION.descuento = PORCENTAJE (0-50)
               COTIZACION.descuento         = MONTO total descontado

   PRECIO: se toma el precio más reciente con estado 'Vigente' del tipo que le
   corresponde al cliente: tipo de cliente 'Empresa' -> precio 'Empresa'; cualquier
   otro -> precio 'Individual'. Si pasas @idTipoPrecio, se usa ese tipo (opcional).

   Devuelve una fila: idCotizacion, codigoCotizacion, total
   ===================================================================== */
CREATE OR ALTER PROCEDURE dbo.sp_GenerarCotizacionJson
    @idCliente     INT,
    @idUsuario     INT,
    @observaciones VARCHAR(250) = NULL,
    @detalleJson   NVARCHAR(MAX),
    @idTipoPrecio  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Constantes (cámbialas si tus nombres son otros)
    DECLARE @estadoInicial VARCHAR(50) = 'Pendiente';
    DECLARE @estadoPrecioVigente VARCHAR(50) = 'Vigente';
    -- Regla de precio: cliente de tipo 'Empresa' -> precio 'Empresa'; cualquier otro -> 'Individual'
    DECLARE @tipoClienteEmpresa  VARCHAR(20) = 'Empresa';    -- nombre en TIPO_CLIENTE
    DECLARE @tipoPrecioEmpresa   VARCHAR(50) = 'Empresa';    -- nombre en TIPO_PRECIO
    DECLARE @tipoPrecioIndividual VARCHAR(50) = 'Individual'; -- nombre en TIPO_PRECIO

    DECLARE @idCotizacion INT, @idEstado INT, @idEstadoPrecio INT,
            @idAccion INT, @idTabla INT,
            @codigo VARCHAR(30), @total DECIMAL(12,2), @lineas INT;

    DECLARE @Detalle TABLE (
        idProducto INT           NOT NULL PRIMARY KEY,
        cantidad   INT           NOT NULL,
        descuento  DECIMAL(5,2)  NOT NULL,
        precio     DECIMAL(10,2) NULL
    );

    BEGIN TRY
        /* ---------- 1. Validar y leer el JSON ---------- */
        IF @detalleJson IS NULL OR ISJSON(@detalleJson) = 0
            THROW 50020, 'El detalle no es un JSON válido.', 1;

        IF EXISTS (SELECT 1
                   FROM OPENJSON(@detalleJson) WITH (idProducto INT '$.idProducto')
                   WHERE idProducto IS NULL)
            THROW 50023, 'Cada línea del detalle debe incluir idProducto.', 1;

        INSERT @Detalle (idProducto, cantidad, descuento)
        SELECT idProducto,
               ISNULL(SUM(cantidad), 0),             -- si falta, falla la validación de abajo
               MAX(ISNULL(descuento, 0))
        FROM OPENJSON(@detalleJson)
             WITH (idProducto INT          '$.idProducto',
                   cantidad   INT          '$.cantidad',
                   descuento  DECIMAL(5,2) '$.descuento')
        GROUP BY idProducto;                         -- agrupa productos repetidos

        /* ---------- 2. Validaciones de negocio ---------- */
        IF NOT EXISTS (SELECT 1 FROM @Detalle)
            THROW 50001, 'La cotización debe tener al menos un producto.', 1;
        IF EXISTS (SELECT 1 FROM @Detalle WHERE cantidad <= 0)
            THROW 50021, 'Todas las cantidades deben ser mayores a cero.', 1;
        IF EXISTS (SELECT 1 FROM @Detalle WHERE descuento < 0 OR descuento > 50)
            THROW 50022, 'El descuento debe estar entre 0 y 50.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.CLIENTE WHERE idCliente = @idCliente AND activo = 1)
            THROW 50002, 'El cliente no existe o está inactivo.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO WHERE idUsuario = @idUsuario AND activo = 1)
            THROW 50004, 'El usuario no existe o está inactivo.', 1;
        IF EXISTS (SELECT 1
                   FROM @Detalle d
                   LEFT JOIN dbo.PRODUCTO p ON p.idProducto = d.idProducto
                   WHERE p.idProducto IS NULL OR p.activo = 0)
            THROW 50003, 'Hay productos que no existen o están inactivos.', 1;
        -- Tipo de precio: si no se indica, se deduce del tipo de cliente
        IF @idTipoPrecio IS NULL
        BEGIN
            SELECT @idTipoPrecio = tp.idTipoPrecio
            FROM dbo.CLIENTE c
            JOIN dbo.TIPO_CLIENTE tc ON tc.idTipoCliente = c.idTipoCliente
            JOIN dbo.TIPO_PRECIO  tp ON tp.activo = 1
                 AND tp.nombre = CASE WHEN tc.nombre = @tipoClienteEmpresa
                                      THEN @tipoPrecioEmpresa
                                      ELSE @tipoPrecioIndividual END
            WHERE c.idCliente = @idCliente;
        END

        IF @idTipoPrecio IS NULL
            THROW 50013, 'No se pudo determinar el tipo de precio del cliente. Revise TIPO_CLIENTE y TIPO_PRECIO.', 1;
        IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_PRECIO WHERE idTipoPrecio = @idTipoPrecio AND activo = 1)
            THROW 50006, 'El tipo de precio no existe o está inactivo.', 1;

        SELECT @idEstado = idEstado FROM dbo.ESTADO WHERE nombre = @estadoInicial;
        IF @idEstado IS NULL
            THROW 50005, 'No existe en ESTADO el estado inicial de la cotización (Pendiente).', 1;

        SELECT @idEstadoPrecio = idEstado FROM dbo.ESTADO WHERE nombre = @estadoPrecioVigente;
        IF @idEstadoPrecio IS NULL
            THROW 50009, 'No existe en ESTADO el estado de precio vigente (Vigente).', 1;

        SELECT @idAccion = idAccion FROM dbo.ACCION WHERE nombre = 'INSERT';
        SELECT @idTabla  = idTabla  FROM dbo.TABLA  WHERE nombre = 'COTIZACION';
        IF @idAccion IS NULL OR @idTabla IS NULL
            THROW 50008, 'Falta configurar la bitácora (ACCION INSERT o TABLA COTIZACION).', 1;

        /* ---------- 3. Precio vigente desde la tabla PRECIO (nunca del navegador) ---------- */
        UPDATE d
        SET d.precio = x.precio
        FROM @Detalle AS d
        OUTER APPLY (
            SELECT TOP (1) pr.precio
            FROM dbo.PRECIO pr
            JOIN dbo.TIPO_PRECIO tp ON tp.idTipoPrecio = pr.idTipoPrecio AND tp.activo = 1
            WHERE pr.idProducto = d.idProducto
              AND pr.idEstado   = @idEstadoPrecio
              AND (@idTipoPrecio IS NULL OR pr.idTipoPrecio = @idTipoPrecio)
            ORDER BY pr.fechaAsignacion DESC, pr.idPrecio DESC
        ) AS x;

        IF EXISTS (SELECT 1 FROM @Detalle WHERE precio IS NULL)
            THROW 50007, 'Hay productos sin precio vigente.', 1;

        /* ---------- 4. Transacción ---------- */
        BEGIN TRAN;

        SET @codigo = 'COT-' + CAST(YEAR(SYSDATETIME()) AS CHAR(4)) + '-'
                    + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.seq_codigoCotizacion AS VARCHAR(10)), 6);

        INSERT dbo.COTIZACION (idCliente, idUsuario, idEstado, codigoCotizacion,
                               subtotal, descuento, total, observaciones)
        VALUES (@idCliente, @idUsuario, @idEstado, @codigo, 0, 0, 0, @observaciones);
        SET @idCotizacion = SCOPE_IDENTITY();

        INSERT dbo.DETALLE_COTIZACION
               (idCotizacion, idProducto, cantidad, precioUnitario, descuento, subtotal)
        SELECT @idCotizacion, d.idProducto, d.cantidad, d.precio, d.descuento,
               CAST(ROUND(d.cantidad * d.precio * (1 - d.descuento / 100.0), 2) AS DECIMAL(10,2))
        FROM @Detalle d;

        UPDATE c
        SET c.subtotal  = x.bruto,
            c.descuento = x.bruto - x.neto,
            c.total     = x.neto
        FROM dbo.COTIZACION c
        CROSS APPLY (SELECT CAST(SUM(cantidad * precioUnitario) AS DECIMAL(12,2)) AS bruto,
                            CAST(SUM(subtotal)                  AS DECIMAL(12,2)) AS neto
                     FROM dbo.DETALLE_COTIZACION
                     WHERE idCotizacion = c.idCotizacion) x
        WHERE c.idCotizacion = @idCotizacion;

        SELECT @total = total FROM dbo.COTIZACION WHERE idCotizacion = @idCotizacion;
        SELECT @lineas = COUNT(*) FROM @Detalle;

        -- Bitácora: quién, cuándo y qué información se afectó
        INSERT dbo.MOVIMIENTO (idUsuario, idAccion, idTabla, informacionModificada)
        VALUES (@idUsuario, @idAccion, @idTabla,
                LEFT('Cotizacion ' + @codigo + ' creada. Lineas: ' + CAST(@lineas AS VARCHAR(10))
                     + '. Total: Q' + CONVERT(VARCHAR(20), @total), 255));

        COMMIT;

        SELECT @idCotizacion AS idCotizacion, @codigo AS codigoCotizacion, @total AS total;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

/* ---------------------------------------------------------------------------
   4. SP: confirmar cotizacion
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_ConfirmarCotizacion
    @idCotizacion INT,
    @idUsuario    INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Constantes (cámbialas si tus nombres son otros)
    DECLARE @estadoPendiente  VARCHAR(50) = 'Pendiente';
    DECLARE @estadoConfirmada VARCHAR(50) = 'Confirmada';

    DECLARE @idConfirmada INT, @idAccion INT, @idTabla INT,
            @codigo VARCHAR(30), @estadoActual VARCHAR(50), @mensaje NVARCHAR(300);

    BEGIN TRY
        /* ---------- 1. Validaciones (antes de abrir la transacción) ---------- */
        IF NOT EXISTS (SELECT 1 FROM dbo.USUARIO WHERE idUsuario = @idUsuario AND activo = 1)
            THROW 50004, 'El usuario no existe o está inactivo.', 1;

        SELECT @codigo = c.codigoCotizacion, @estadoActual = e.nombre
        FROM dbo.COTIZACION c
        JOIN dbo.ESTADO e ON e.idEstado = c.idEstado
        WHERE c.idCotizacion = @idCotizacion;

        IF @codigo IS NULL
            THROW 50014, 'La cotización no existe.', 1;

        IF @estadoActual <> @estadoPendiente
        BEGIN
            SET @mensaje = 'La cotización ' + @codigo + ' no se puede confirmar: su estado actual es '
                         + @estadoActual + '.';
            THROW 50010, @mensaje, 1;
        END

        SELECT @idConfirmada = idEstado FROM dbo.ESTADO WHERE nombre = @estadoConfirmada;
        IF @idConfirmada IS NULL
            THROW 50011, 'No existe en ESTADO el estado Confirmada.', 1;

        SELECT @idAccion = idAccion FROM dbo.ACCION WHERE nombre = 'CONFIRMAR';
        SELECT @idTabla  = idTabla  FROM dbo.TABLA  WHERE nombre = 'COTIZACION';
        IF @idAccion IS NULL OR @idTabla IS NULL
            THROW 50012, 'Falta configurar la bitácora (ACCION CONFIRMAR o TABLA COTIZACION).', 1;

        /* ---------- 2. Transacción ---------- */
        BEGIN TRAN;

        -- La condición de estado va también en el UPDATE: si dos personas confirman a la vez,
        -- solo una logra cambiarla y la otra recibe error.
        UPDATE c
        SET c.idEstado = @idConfirmada
        FROM dbo.COTIZACION c
        JOIN dbo.ESTADO e ON e.idEstado = c.idEstado
        WHERE c.idCotizacion = @idCotizacion AND e.nombre = @estadoPendiente;

        IF @@ROWCOUNT = 0
            THROW 50010, 'La cotización cambió de estado mientras se confirmaba. Intente de nuevo.', 1;

        -- Bitácora: quién, cuándo y qué
        INSERT dbo.MOVIMIENTO (idUsuario, idAccion, idTabla, informacionModificada)
        VALUES (@idUsuario, @idAccion, @idTabla,
                LEFT('Cotizacion ' + @codigo + ' confirmada (Pendiente -> Confirmada).', 255));

        COMMIT;

        SELECT @idCotizacion AS idCotizacion, @codigo AS codigoCotizacion, @estadoConfirmada AS estado;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

/* ---------------------------------------------------------------------------
   5. SP: datos para imprimir la cotizacion
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCotizacionImpresion
    @idCotizacion INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1) Cabecera
    SELECT c.idCotizacion,
           c.codigoCotizacion,
           c.fecha,
           c.subtotal,
           c.descuento,
           c.total,
           c.observaciones,
           e.nombre                      AS estado,
           cl.nombreCliente,
           cl.nit,
           u.nombres + ' ' + u.apellidos AS empleado,
           r.nombre                      AS rol
    FROM dbo.COTIZACION c
    JOIN dbo.CLIENTE cl ON cl.idCliente = c.idCliente
    JOIN dbo.USUARIO u  ON u.idUsuario  = c.idUsuario
    JOIN dbo.ROL r      ON r.idRol      = u.idRol
    JOIN dbo.ESTADO e   ON e.idEstado   = c.idEstado
    WHERE c.idCotizacion = @idCotizacion;

    -- 2) Detalle (lo que se guardó en DETALLE_COTIZACION)
    SELECT pg.nombre        AS producto,
           m.nombre         AS marca,
           pr.nombre        AS presentacion,
           co.nombre        AS color,
           d.cantidad,
           d.precioUnitario,
           d.descuento,
           d.subtotal
    FROM dbo.DETALLE_COTIZACION d
    JOIN dbo.PRODUCTO p          ON p.idProducto         = d.idProducto
    JOIN dbo.PRODUCTO_GENERAL pg ON pg.idProductoGeneral = p.idProductoGeneral
    JOIN dbo.MARCA m             ON m.idMarca            = pg.idMarca
    JOIN dbo.PRESENTACION pr     ON pr.idPresentacion    = p.idPresentacion
    LEFT JOIN dbo.COLOR co       ON co.idColor           = p.idColor
    WHERE d.idCotizacion = @idCotizacion
    ORDER BY d.idDetalleCotizacion;
END
GO

/* ---------------------------------------------------------------------------
   Registro de la migracion: solo se anota si los tres procedimientos quedaron creados
   ---------------------------------------------------------------------------*/
IF OBJECT_ID('dbo.sp_GenerarCotizacionJson', 'P') IS NOT NULL
   AND OBJECT_ID('dbo.sp_ConfirmarCotizacion', 'P') IS NOT NULL
   AND OBJECT_ID('dbo.sp_ObtenerCotizacionImpresion', 'P') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0004_cotizacion_procedimientos')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0004_cotizacion_procedimientos');
GO