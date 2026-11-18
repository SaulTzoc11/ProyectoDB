USE PintureriaDB;
GO

/* ===========================================================================
   0011 - Listado de facturas para la pantalla de reportes
   Que agrega:
     Procedimiento  sp_Reporte_ListaFacturas  (todas las facturas, emitidas y anuladas)
     Cambio         sp_Reporte_Factura devuelve tambien la direccion del cliente
                    (direccionCliente) para imprimir la factura.
   Solo lectura: no modifica datos ni tablas.
   =========================================================================== */

/* ---------------------------------------------------------------------------
   1. Listado de facturas. Para las anuladas el total ya esta en 0
      (sp_AnularFactura); el monto original se conserva en observaciones.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Reporte_ListaFacturas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT F.idFactura,
           F.noFactura,
           F.fecha,
           E.nombre AS estado,
           C.nombreCliente AS cliente,
           C.nit,
           CONCAT(U.nombres, ' ', U.apellidos) AS empleado,
           F.total
      FROM dbo.FACTURA F
      INNER JOIN dbo.ESTADO E  ON E.idEstado  = F.idEstado
      INNER JOIN dbo.CLIENTE C ON C.idCliente = F.idCliente
      INNER JOIN dbo.USUARIO U ON U.idUsuario = F.idUsuario
     ORDER BY F.fecha DESC, F.idFactura DESC;
END
GO

/* ---------------------------------------------------------------------------
   2. Encabezado de factura con la direccion del cliente
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
           C.direccion AS direccionCliente,
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
              FROM dbo.PAGO

/* ---------------------------------------------------------------------------
   3. Permisos (mismo criterio que 0005, 0007 y 0010)
   ---------------------------------------------------------------------------*/
IF DATABASE_PRINCIPAL_ID('app_django') IS NOT NULL
   AND DATABASE_PRINCIPAL_ID('app_django') <> USER_ID()
   AND IS_ROLEMEMBER('db_owner', 'app_django') <> 1
BEGIN
    GRANT EXECUTE ON dbo.sp_Reporte_ListaFacturas TO app_django;
    GRANT EXECUTE ON dbo.sp_Reporte_Factura       TO app_django;
END
GO

IF OBJECT_ID('dbo.sp_Reporte_ListaFacturas', 'P') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0011_listado_facturas')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0011_listado_facturas');
GO
