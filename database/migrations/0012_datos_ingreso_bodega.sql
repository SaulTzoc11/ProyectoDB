USE PintureriaDB;
GO

/* ===========================================================================
   0012 - Datos base para el ingreso a bodega
   sp_RegistrarIngresoBodega (0009) necesita estos registros y ninguna
   migracion los creaba. Sin ellos el SP lanza:
     50003 'Faltan estados o el movimiento Entrada por compra.'
   Que agrega (solo si no existen):
     ESTADO           Pendiente, Parcial, Completa, Vigente
     TIPO_MOVIMIENTO  Entrada por compra
   =========================================================================== */

IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Pendiente') INSERT dbo.ESTADO (nombre) VALUES ('Pendiente');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Parcial')   INSERT dbo.ESTADO (nombre) VALUES ('Parcial');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Completa')  INSERT dbo.ESTADO (nombre) VALUES ('Completa');
IF NOT EXISTS (SELECT 1 FROM dbo.ESTADO WHERE nombre = 'Vigente')   INSERT dbo.ESTADO (nombre) VALUES ('Vigente');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TIPO_MOVIMIENTO WHERE nombre = 'Entrada por compra')
    INSERT dbo.TIPO_MOVIMIENTO (nombre, descripcion)
    VALUES ('Entrada por compra', 'Ingreso de lote a bodega por recepcion de una orden de compra');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0012_datos_ingreso_bodega')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0012_datos_ingreso_bodega');
GO
