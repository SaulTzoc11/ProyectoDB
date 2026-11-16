USE PintureriaDB;
GO

IF OBJECT_ID('dbo.MIGRACION', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MIGRACION (
        idMigracion INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL UNIQUE,
        fechaAplicacion DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0001_control_versiones')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0001_control_versiones');
GO
