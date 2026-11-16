USE PintureriaDB;
GO

SET NOCOUNT ON;

DECLARE @fallos INT = 0;

IF (SELECT COUNT(*) FROM sys.tables WHERE name <> 'MIGRACION') < 35
BEGIN
    PRINT 'FALLO: faltan tablas del esquema base.';
    SET @fallos += 1;
END

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE is_disabled = 1 OR is_not_trusted = 1)
BEGIN
    PRINT 'FALLO: hay llaves foraneas deshabilitadas o no confiables.';
    SET @fallos += 1;
END

IF EXISTS (
    SELECT 1 FROM dbo.COTIZACION c
    WHERE c.total <> c.subtotal - c.descuento
)
BEGIN
    PRINT 'FALLO: cotizaciones con total inconsistente.';
    SET @fallos += 1;
END

IF EXISTS (SELECT 1 FROM dbo.LOTE WHERE cantidadDisponible > cantidadInicial OR cantidadDisponible < 0)
BEGIN
    PRINT 'FALLO: lotes con cantidades invalidas.';
    SET @fallos += 1;
END

IF EXISTS (SELECT 1 FROM dbo.USUARIO WHERE contrasenaEncriptada = '')
BEGIN
    PRINT 'FALLO: usuarios sin contrasena.';
    SET @fallos += 1;
END

IF @fallos = 0 PRINT 'OK: pruebas basicas superadas.';
ELSE PRINT CONCAT('TOTAL DE FALLOS: ', @fallos);
GO
