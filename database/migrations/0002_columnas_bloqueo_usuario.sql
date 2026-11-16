USE PintureriaDB;
GO

IF EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0002_columnas_bloqueo_usuario')
BEGIN
    PRINT 'Migracion 0002_columnas_bloqueo_usuario ya aplicada.';
    SET NOEXEC ON;
END
GO

BEGIN TRANSACTION;
BEGIN TRY
    IF COL_LENGTH('dbo.USUARIO', 'intentosFallidos') IS NULL
        ALTER TABLE dbo.USUARIO
            ADD intentosFallidos TINYINT NOT NULL
                CONSTRAINT DF_USUARIO_intentosFallidos DEFAULT 0;

    IF COL_LENGTH('dbo.USUARIO', 'bloqueadoHasta') IS NULL
        ALTER TABLE dbo.USUARIO ADD bloqueadoHasta DATETIME NULL;

    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0002_columnas_bloqueo_usuario');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SET NOEXEC OFF;
GO
