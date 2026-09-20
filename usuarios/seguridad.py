"""
usuarios/seguridad.py

Capa de acceso a datos para todo lo relacionado con contrasenas
"""

from django.db import connection


def _obtener_fila(cursor):
    """Convierte la primera fila del cursor en un diccionario."""
    columnas = [col[0] for col in cursor.description]
    fila = cursor.fetchone()
    if fila is None:
        return None
    return dict(zip(columnas, fila))


def validar_login(nombre_usuario, contrasena):
    """
    Invoca dbo.sp_Usuario_ValidarLogin.

    Devuelve un diccionario con:
        ok, mensaje, idUsuario, nombreUsuario, nombreCompleto, idRol, rol
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "EXEC dbo.sp_Usuario_ValidarLogin @nombreUsuario = %s, @contrasena = %s",
            [nombre_usuario, contrasena],
        )
        resultado = _obtener_fila(cursor)

    if resultado is None:
        return {"ok": False, "mensaje": "No se pudo validar el usuario."}

    resultado["ok"] = bool(resultado["ok"])
    return resultado


def crear_usuario(id_rol, nombre_usuario, contrasena, nombres, apellidos, correo):
    """
    Invoca dbo.sp_Usuario_Crear. La contrasena viaja en texto plano
    unicamente dentro del parametro (nunca se concatena al SQL) y el
    cifrado ocurre dentro del procedimiento almacenado.

    Devuelve: ok, mensaje, idUsuario
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "EXEC dbo.sp_Usuario_Crear "
            "@idRol = %s, @nombreUsuario = %s, @contrasena = %s, "
            "@nombres = %s, @apellidos = %s, @correo = %s",
            [id_rol, nombre_usuario, contrasena, nombres, apellidos, correo],
        )
        resultado = _obtener_fila(cursor)

    if resultado is None:
        return {"ok": False, "mensaje": "No se pudo crear el usuario.", "idUsuario": None}

    resultado["ok"] = bool(resultado["ok"])
    return resultado


def cambiar_contrasena(id_usuario, contrasena_nueva,
                       contrasena_actual=None, es_administrador=False):
    """
    Invoca dbo.sp_Usuario_CambiarContrasena.

    - Usuario cambiando su propia clave : es_administrador=False y se exige
      contrasena_actual.
    - Reseteo desde administracion      : es_administrador=True.

    Devuelve: ok, mensaje
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "EXEC dbo.sp_Usuario_CambiarContrasena "
            "@idUsuario = %s, @contrasenaActual = %s, "
            "@contrasenaNueva = %s, @esAdministrador = %s",
            [id_usuario, contrasena_actual, contrasena_nueva, 1 if es_administrador else 0],
        )
        resultado = _obtener_fila(cursor)

    if resultado is None:
        return {"ok": False, "mensaje": "No se pudo cambiar la contrasena."}

    resultado["ok"] = bool(resultado["ok"])
    return resultado