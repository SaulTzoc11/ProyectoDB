from rest_framework.authentication import SessionAuthentication

from . import repositories

CLAVE_SESION = "usuario_id"


class SesionUsuarioAuthentication(SessionAuthentication):
    """Autentica con el usuario guardado en la sesión y exige CSRF."""

    def authenticate(self, request):
        id_usuario = request._request.session.get(CLAVE_SESION)

        if not id_usuario:
            return None

        usuario = repositories.obtener_activo(id_usuario)

        if usuario is None:
            return None

        self.enforce_csrf(request)
        return usuario, None
