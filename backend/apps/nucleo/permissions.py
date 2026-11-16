from rest_framework.permissions import SAFE_METHODS, BasePermission

from . import roles


def nombre_rol(usuario):
    rol = getattr(usuario, "idrol", None)
    return rol.nombre.strip().lower() if rol else ""


def tiene_rol(usuario, roles_permitidos):
    permitidos = {rol.lower() for rol in roles_permitidos}
    return nombre_rol(usuario) in permitidos


class SoloRoles(BasePermission):
    roles_permitidos = ()
    message = "No tienes permisos para realizar esta acción."

    def has_permission(self, request, view):
        usuario = request.user
        if not getattr(usuario, "is_authenticated", False):
            return False
        return tiene_rol(usuario, self.roles_permitidos)


class SoloGerente(SoloRoles):
    roles_permitidos = roles.ADMINISTRACION


class PuedeOperarVentas(SoloRoles):
    roles_permitidos = roles.VENTAS


class LecturaGeneralEscrituraMantenimiento(BasePermission):
    message = "No tienes permisos para modificar este catálogo."

    def has_permission(self, request, view):
        usuario = request.user
        if not getattr(usuario, "is_authenticated", False):
            return False
        if request.method in SAFE_METHODS:
            return True
        return tiene_rol(usuario, roles.MANTENIMIENTO)
