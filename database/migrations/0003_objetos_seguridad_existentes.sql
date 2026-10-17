USE PintureriaDB;
GO

/* ---------------------------------------------------------------------------
   1. FUNCION: derivacion de la llave (key stretching)
      Es deterministica: misma contrasena + mismo salt + mismas iteraciones
      = mismo hash. Por eso sirve tanto para cifrar como para validar.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER FUNCTION dbo.fn_DerivarHash
(
    @contrasena  NVARCHAR(128),
    @salt        VARBINARY(32),
    @iteraciones INT
)
RETURNS VARBINARY(64)
AS
BEGIN
    DECLARE @hash VARBINARY(64);
    DECLARE @i    INT = 0;

    /* Primera pasada: salt + contrasena en bytes UTF-16 */
    SET @hash = HASHBYTES('SHA2_512', @salt + CONVERT(VARBINARY(256), @contrasena));

    /* Iteraciones de estiramiento: encarecen el ataque por fuerza bruta */
    WHILE @i < @iteraciones
    BEGIN
        SET @hash = HASHBYTES('SHA2_512', @hash + @salt);
        SET @i += 1;
    END

    RETURN @hash;
END
GO

/* ---------------------------------------------------------------------------
   2. FUNCION: politica de contrasena
      Minimo 8 caracteres, al menos una mayuscula, una minuscula y un digito.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER FUNCTION dbo.fn_ContrasenaEsValida
(
    @contrasena NVARCHAR(128)
)
RETURNS BIT
AS
BEGIN
    IF @contrasena IS NULL OR LEN(@contrasena) < 8            RETURN 0;
    IF @contrasena COLLATE Latin1_General_BIN2 NOT LIKE '%[A-Z]%' RETURN 0;
    IF @contrasena COLLATE Latin1_General_BIN2 NOT LIKE '%[a-z]%' RETURN 0;
    IF @contrasena NOT LIKE '%[0-9]%'                         RETURN 0;
    RETURN 1;
END
GO

/* ---------------------------------------------------------------------------
   4. FUNCION: verifica una contrasena plana contra el string almacenado.
      Devuelve 1 si coincide, 0 si no.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER FUNCTION dbo.fn_VerificarContrasena
(
    @contrasena  NVARCHAR(128),
    @almacenado  VARCHAR(250)
)
RETURNS BIT
AS
BEGIN
    IF @almacenado IS NULL OR @contrasena IS NULL RETURN 0;

    /* El string viene como  algoritmo$iteraciones$saltHex$hashHex  */
    DECLARE @p1 INT = CHARINDEX('$', @almacenado);
    DECLARE @p2 INT = CHARINDEX('$', @almacenado, @p1 + 1);
    DECLARE @p3 INT = CHARINDEX('$', @almacenado, @p2 + 1);

    IF @p1 = 0 OR @p2 = 0 OR @p3 = 0 RETURN 0;   -- formato invalido

    DECLARE @algoritmo  VARCHAR(20) = SUBSTRING(@almacenado, 1, @p1 - 1);
    DECLARE @iteraciones INT        = TRY_CAST(SUBSTRING(@almacenado, @p1 + 1, @p2 - @p1 - 1) AS INT);
    DECLARE @saltHex    VARCHAR(64) = SUBSTRING(@almacenado, @p2 + 1, @p3 - @p2 - 1);
    DECLARE @hashHex    VARCHAR(128)= SUBSTRING(@almacenado, @p3 + 1, 128);

    IF @algoritmo <> 'PBKDF2-SHA512' OR @iteraciones IS NULL RETURN 0;

    DECLARE @salt         VARBINARY(32) = CONVERT(VARBINARY(32), @saltHex, 2);
    DECLARE @hashEsperado VARBINARY(64) = CONVERT(VARBINARY(64), @hashHex, 2);
    DECLARE @hashCalculado VARBINARY(64) = dbo.fn_DerivarHash(@contrasena, @salt, @iteraciones);

    IF @hashCalculado = @hashEsperado RETURN 1;
    RETURN 0;
END
GO

/* ---------------------------------------------------------------------------
   3. SP: genera el string cifrado completo a partir de una contrasena plana.
      Genera un salt nuevo y aleatorio en cada llamada.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Seguridad_CifrarContrasena
    @contrasena  NVARCHAR(128),
    @iteraciones INT           = 10000,
    @resultado   VARCHAR(250)  OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @salt VARBINARY(32) = CRYPT_GEN_RANDOM(32);
    DECLARE @hash VARBINARY(64) = dbo.fn_DerivarHash(@contrasena, @salt, @iteraciones);

    SET @resultado = CONCAT('PBKDF2-SHA512$',
                            @iteraciones, '$',
                            CONVERT(VARCHAR(64),  @salt, 2), '$',
                            CONVERT(VARCHAR(128), @hash, 2));
END
GO

/* ---------------------------------------------------------------------------
   5. SP: crear usuario (la contrasena NUNCA se guarda en texto plano)
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_Crear
    @idRol          INT,
    @nombreUsuario  VARCHAR(50),
    @contrasena     NVARCHAR(128),
    @nombres        VARCHAR(50),
    @apellidos      VARCHAR(50),
    @correo         VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM ROL WHERE idRol = @idRol)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El rol indicado no existe.' AS mensaje, NULL AS idUsuario;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM USUARIO WHERE nombreUsuario = @nombreUsuario)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El nombre de usuario ya esta registrado.' AS mensaje, NULL AS idUsuario;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM USUARIO WHERE correo = @correo)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El correo ya esta registrado.' AS mensaje, NULL AS idUsuario;
        RETURN;
    END

    IF dbo.fn_ContrasenaEsValida(@contrasena) = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               'La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero.' AS mensaje,
               NULL AS idUsuario;
        RETURN;
    END

    DECLARE @cifrada VARCHAR(250);
    EXEC dbo.sp_Seguridad_CifrarContrasena @contrasena, 10000, @cifrada OUTPUT;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO USUARIO (idRol, nombreUsuario, contrasenaEncriptada,
                             nombres, apellidos, correo, activo)
        VALUES (@idRol, @nombreUsuario, @cifrada,
                @nombres, @apellidos, @correo, 1);

        DECLARE @idUsuario INT = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT CAST(1 AS BIT) AS ok, 'Usuario creado correctamente.' AS mensaje, @idUsuario AS idUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT CAST(0 AS BIT) AS ok, ERROR_MESSAGE() AS mensaje, NULL AS idUsuario;
    END CATCH
END
GO

/* ---------------------------------------------------------------------------
   6. SP: cambiar contrasena
      @esAdministrador = 1 permite el reseteo sin conocer la contrasena actual
      (pantalla de administracion de usuarios).
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_CambiarContrasena
    @idUsuario         INT,
    @contrasenaActual  NVARCHAR(128) = NULL,
    @contrasenaNueva   NVARCHAR(128),
    @esAdministrador   BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @almacenado VARCHAR(250);
    SELECT @almacenado = contrasenaEncriptada FROM USUARIO WHERE idUsuario = @idUsuario;

    IF @almacenado IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El usuario no existe.' AS mensaje;
        RETURN;
    END

    IF @esAdministrador = 0 AND dbo.fn_VerificarContrasena(@contrasenaActual, @almacenado) = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'La contrasena actual no es correcta.' AS mensaje;
        RETURN;
    END

    IF dbo.fn_ContrasenaEsValida(@contrasenaNueva) = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               'La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero.' AS mensaje;
        RETURN;
    END

    IF dbo.fn_VerificarContrasena(@contrasenaNueva, @almacenado) = 1
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'La nueva contrasena debe ser distinta a la actual.' AS mensaje;
        RETURN;
    END

    DECLARE @cifrada VARCHAR(250);
    EXEC dbo.sp_Seguridad_CifrarContrasena @contrasenaNueva, 10000, @cifrada OUTPUT;

    UPDATE USUARIO
       SET contrasenaEncriptada = @cifrada,
           intentosFallidos     = 0,
           bloqueadoHasta       = NULL
     WHERE idUsuario = @idUsuario;

    SELECT CAST(1 AS BIT) AS ok, 'Contrasena actualizada correctamente.' AS mensaje;
END
GO

/* ---------------------------------------------------------------------------
   7. SP: validar login
      - No revela si fallo el usuario o la contrasena (mismo mensaje).
      - Bloquea 5 minutos tras 5 intentos fallidos.
      - Actualiza ultimoAcceso.
      - Re-cifra la contrasena si el hash quedo con menos iteraciones.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Usuario_ValidarLogin
    @nombreUsuario VARCHAR(50),
    @contrasena    NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ITERACIONES_ACTUALES INT = 10000;
    DECLARE @MAX_INTENTOS         INT = 5;
    DECLARE @MINUTOS_BLOQUEO      INT = 5;

    DECLARE @idUsuario   INT,
            @almacenado  VARCHAR(250),
            @activo      BIT,
            @intentos    TINYINT,
            @bloqueado   DATETIME;

    SELECT @idUsuario  = idUsuario,
           @almacenado = contrasenaEncriptada,
           @activo     = activo,
           @intentos   = intentosFallidos,
           @bloqueado  = bloqueadoHasta
      FROM USUARIO
     WHERE nombreUsuario = @nombreUsuario;

    /* Usuario inexistente o inactivo: mensaje generico */
    IF @idUsuario IS NULL OR @activo = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               'El usuario o la contrasena no son correctos.' AS mensaje,
               NULL AS idUsuario, NULL AS nombreUsuario, NULL AS nombreCompleto,
               NULL AS idRol, NULL AS rol;
        RETURN;
    END

    IF @bloqueado IS NOT NULL AND @bloqueado > GETDATE()
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('Cuenta bloqueada temporalmente. Intente de nuevo en ',
                      DATEDIFF(MINUTE, GETDATE(), @bloqueado) + 1, ' minuto(s).') AS mensaje,
               NULL AS idUsuario, NULL AS nombreUsuario, NULL AS nombreCompleto,
               NULL AS idRol, NULL AS rol;
        RETURN;
    END

    /* --- Verificacion criptografica --- */
    IF dbo.fn_VerificarContrasena(@contrasena, @almacenado) = 0
    BEGIN
        SET @intentos = ISNULL(@intentos, 0) + 1;

        UPDATE USUARIO
           SET intentosFallidos = @intentos,
               bloqueadoHasta   = CASE WHEN @intentos >= @MAX_INTENTOS
                                       THEN DATEADD(MINUTE, @MINUTOS_BLOQUEO, GETDATE())
                                       ELSE bloqueadoHasta END
         WHERE idUsuario = @idUsuario;

        SELECT CAST(0 AS BIT) AS ok,
               'El usuario o la contrasena no son correctos.' AS mensaje,
               NULL AS idUsuario, NULL AS nombreUsuario, NULL AS nombreCompleto,
               NULL AS idRol, NULL AS rol;
        RETURN;
    END

    /* --- Login correcto --- */
    UPDATE USUARIO
       SET ultimoAcceso     = GETDATE(),
           intentosFallidos = 0,
           bloqueadoHasta   = NULL
     WHERE idUsuario = @idUsuario;

    /* Re-cifrado automatico si el hash quedo desactualizado */
    DECLARE @iteracionesGuardadas INT =
        TRY_CAST(SUBSTRING(@almacenado,
                           CHARINDEX('$', @almacenado) + 1,
                           CHARINDEX('$', @almacenado, CHARINDEX('$', @almacenado) + 1)
                           - CHARINDEX('$', @almacenado) - 1) AS INT);

    IF @iteracionesGuardadas IS NULL OR @iteracionesGuardadas < @ITERACIONES_ACTUALES
    BEGIN
        DECLARE @nuevo VARCHAR(250);
        EXEC dbo.sp_Seguridad_CifrarContrasena @contrasena, @ITERACIONES_ACTUALES, @nuevo OUTPUT;
        UPDATE USUARIO SET contrasenaEncriptada = @nuevo WHERE idUsuario = @idUsuario;
    END

    SELECT CAST(1 AS BIT) AS ok,
           'Acceso concedido.' AS mensaje,
           U.idUsuario,
           U.nombreUsuario,
           CONCAT(U.nombres, ' ', U.apellidos) AS nombreCompleto,
           R.idRol,
           R.nombre AS rol
      FROM USUARIO U
      INNER JOIN ROL R ON R.idRol = U.idRol
     WHERE U.idUsuario = @idUsuario;
END
GO

/* ---------------------------------------------------------------------------
   8. VISTA de apoyo para la pantalla de administracion de usuarios.
      Nunca expone el hash.
   ---------------------------------------------------------------------------*/
CREATE OR ALTER VIEW dbo.vw_Usuarios
AS
SELECT U.idUsuario,
       U.nombreUsuario,
       U.nombres,
       U.apellidos,
       CONCAT(U.nombres, ' ', U.apellidos) AS nombreCompleto,
       U.correo,
       U.idRol,
       R.nombre AS rol,
       U.ultimoAcceso,
       U.activo,
       CASE WHEN U.bloqueadoHasta > GETDATE() THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS bloqueado
  FROM USUARIO U
  INNER JOIN ROL R ON R.idRol = U.idRol;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MIGRACION WHERE nombre = '0003_objetos_seguridad_existentes')
    INSERT INTO dbo.MIGRACION (nombre) VALUES ('0003_objetos_seguridad_existentes');
GO
