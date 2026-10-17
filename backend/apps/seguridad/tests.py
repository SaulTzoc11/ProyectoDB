from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.nucleo.pruebas import CONTRASENA, cliente_autenticado, crear_usuario

from . import passwords
from .models import Usuario

HASH_LEGADO = (
    "PBKDF2-SHA512$50$BDCAA642E8AE0FEDE3DFD0ED1480DAF563674BE2376BD7BB9C7A0AF574140C3E$"
    "4CFCC32916DBFD8CC53D1E1CB0103844DEABE732707352DC584DD64C727D8D9D"
    "432121E4DCAC6D8741951CAA17FDAB35E53595AFB7A3FED36ACAF4F1763146B5"
)
CONTRASENA_LEGADO = "ClaveÑandú#9"


class ContrasenasTests(TestCase):
    def test_hash_django_se_verifica_y_no_requiere_actualizar(self):
        cifrado = passwords.cifrar("abc12345")
        self.assertEqual(passwords.verificar("abc12345", cifrado), (True, False))
        self.assertEqual(passwords.verificar("otra", cifrado), (False, False))

    def test_hash_generado_por_procedimiento_se_verifica_y_pide_actualizar(self):
        self.assertEqual(
            passwords.verificar(CONTRASENA_LEGADO, HASH_LEGADO), (True, True)
        )
        coincide, _ = passwords.verificar("incorrecta", HASH_LEGADO)
        self.assertFalse(coincide)

    def test_texto_plano_nunca_autentica(self):
        self.assertEqual(passwords.verificar("Bruno56", "Bruno56"), (False, False))


class InicioSesionTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def iniciar(self, usuario, contrasena):
        return self.api.post(
            "/api/login/",
            {"username": usuario, "password": contrasena},
            format="json",
        )

    def test_credenciales_correctas_devuelven_usuario_y_rol(self):
        crear_usuario("ana", "Gerente")
        respuesta = self.iniciar("ana", CONTRASENA)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["usuario"]["role"], "Gerente")
        self.assertIsNotNone(Usuario.objects.get(nombreusuario="ana").ultimoacceso)

    def test_contrasena_incorrecta_y_usuario_inexistente_dan_el_mismo_error(self):
        crear_usuario("ana", "Gerente")
        a = self.iniciar("ana", "mala")
        b = self.iniciar("nadie", "mala")
        self.assertEqual(a.status_code, 401)
        self.assertEqual(a.json(), b.json())

    def test_usuario_inactivo_no_puede_entrar(self):
        crear_usuario("ana", "Gerente", activo=False)
        self.assertEqual(self.iniciar("ana", CONTRASENA).status_code, 401)

    def test_campos_vacios(self):
        self.assertEqual(self.iniciar("", "").status_code, 400)

    def test_hash_antiguo_se_actualiza_a_django_al_iniciar_sesion(self):
        crear_usuario("legado", "Cajero", almacenado=HASH_LEGADO)
        self.assertEqual(self.iniciar("legado", CONTRASENA_LEGADO).status_code, 200)
        nuevo = Usuario.objects.get(nombreusuario="legado").contrasenaencriptada
        self.assertTrue(passwords.es_formato_django(nuevo))
        self.assertEqual(self.iniciar("legado", CONTRASENA_LEGADO).status_code, 200)

    def test_sesion_actual_exige_login_y_logout_la_cierra(self):
        self.assertIn(self.api.get("/api/sesion/").status_code, (401, 403))
        crear_usuario("ana", "Gerente")
        self.iniciar("ana", CONTRASENA)
        self.assertEqual(self.api.get("/api/sesion/").json()["username"], "ana")
        self.api.post("/api/logout/")
        self.assertIn(self.api.get("/api/sesion/").status_code, (401, 403))

    def test_usuario_desactivado_pierde_la_sesion_activa(self):
        crear_usuario("ana", "Gerente")
        self.iniciar("ana", CONTRASENA)
        Usuario.objects.filter(nombreusuario="ana").update(activo=False)
        self.assertIn(self.api.get("/api/sesion/").status_code, (401, 403))


class AdministracionUsuariosTests(TestCase):
    def test_solo_el_gerente_administra_usuarios(self):
        for rol in ("Cajero", "Digitador"):
            api = cliente_autenticado(f"u_{rol}", rol)
            self.assertEqual(api.get("/api/usuarios/").status_code, 403)
            self.assertEqual(api.get("/api/roles/").status_code, 403)

    def test_sin_sesion_no_se_puede_listar_usuarios(self):
        self.assertIn(APIClient().get("/api/usuarios/").status_code, (401, 403))

    def test_gerente_crea_usuario_con_hash_y_sin_exponer_la_contrasena(self):
        api = cliente_autenticado("jefe", "Gerente")
        rol = Usuario.objects.get(nombreusuario="jefe").idrol_id
        respuesta = api.post(
            "/api/usuarios/",
            {
                "idrol": rol,
                "nombreusuario": "nuevo",
                "contrasena": "Otra-clave-9",
                "nombres": "Nuevo",
                "apellidos": "Usuario",
                "correo": "nuevo@prueba.com",
                "activo": True,
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        self.assertNotIn("contrasena", respuesta.json())
        creado = Usuario.objects.get(nombreusuario="nuevo")
        self.assertTrue(passwords.es_formato_django(creado.contrasenaencriptada))
        self.assertEqual(passwords.verificar("Otra-clave-9", creado.contrasenaencriptada)[0], True)

    def test_contrasena_corta_se_rechaza(self):
        api = cliente_autenticado("jefe", "Gerente")
        rol = Usuario.objects.get(nombreusuario="jefe").idrol_id
        respuesta = api.post(
            "/api/usuarios/",
            {
                "idrol": rol,
                "nombreusuario": "x",
                "contrasena": "corta",
                "nombres": "X",
                "apellidos": "Y",
                "correo": "x@prueba.com",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_eliminar_desactiva_y_activar_reactiva(self):
        api = cliente_autenticado("jefe", "Gerente")
        objetivo = crear_usuario("otro", "Cajero")
        self.assertEqual(api.delete(f"/api/usuarios/{objetivo.idusuario}/").status_code, 200)
        objetivo.refresh_from_db()
        self.assertFalse(objetivo.activo)
        api.post(f"/api/usuarios/{objetivo.idusuario}/activar/")
        objetivo.refresh_from_db()
        self.assertTrue(objetivo.activo)

    def test_cambiar_contrasena(self):
        api = cliente_autenticado("jefe", "Gerente")
        objetivo = crear_usuario("otro", "Cajero")
        corta = api.post(
            f"/api/usuarios/{objetivo.idusuario}/cambiar-contrasena/",
            {"contrasena": "123"},
            format="json",
        )
        self.assertEqual(corta.status_code, 400)
        ok = api.post(
            f"/api/usuarios/{objetivo.idusuario}/cambiar-contrasena/",
            {"contrasena": "Nueva-clave-5"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200)
        objetivo.refresh_from_db()
        self.assertTrue(passwords.verificar("Nueva-clave-5", objetivo.contrasenaencriptada)[0])


class CsrfTests(TestCase):
    def test_escritura_autenticada_sin_token_csrf_se_rechaza(self):
        api = cliente_autenticado("jefe", "Gerente", validar_csrf=True)
        respuesta = api.post("/api/categorias/", {"nombre": "Pinturas"}, format="json")
        self.assertEqual(respuesta.status_code, 403)

    def test_escritura_con_token_csrf_se_acepta(self):
        api = cliente_autenticado("jefe", "Gerente", validar_csrf=True)
        token = api.get("/api/csrf/").cookies["csrftoken"].value
        respuesta = api.post(
            "/api/categorias/",
            {"nombre": "Pinturas"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.content)


class BloqueoDeCuentaTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        crear_usuario("ana", "Cajero")

    def iniciar(self, contrasena):
        return self.api.post(
            "/api/login/",
            {"username": "ana", "password": contrasena},
            format="json",
        )

    def fallar(self, veces):
        for _ in range(veces):
            self.assertEqual(self.iniciar("mala").status_code, 401)

    def test_cinco_fallos_bloquean_incluso_con_la_clave_correcta(self):
        self.fallar(5)
        respuesta = self.iniciar(CONTRASENA)
        self.assertEqual(respuesta.status_code, 423)
        self.assertIn("bloqueada", respuesta.json()["mensaje"])

    def test_cuatro_fallos_no_bloquean_y_el_exito_reinicia_el_contador(self):
        self.fallar(4)
        self.assertEqual(self.iniciar(CONTRASENA).status_code, 200)
        self.assertEqual(Usuario.objects.get(nombreusuario="ana").intentosfallidos, 0)
        self.fallar(4)
        self.assertEqual(self.iniciar(CONTRASENA).status_code, 200)

    def test_el_bloqueo_expira(self):
        self.fallar(5)
        Usuario.objects.filter(nombreusuario="ana").update(
            bloqueadohasta=timezone.now() - timedelta(minutes=1)
        )
        self.assertEqual(self.iniciar(CONTRASENA).status_code, 200)
        usuario = Usuario.objects.get(nombreusuario="ana")
        self.assertIsNone(usuario.bloqueadohasta)


class PoliticaContrasenaTests(TestCase):
    def test_exige_mayuscula_minuscula_numero_y_ocho_caracteres(self):
        from . import services

        for invalida in ("corta1A", "sinmayuscula1", "SINMINUSCULA1", "SinNumeroAqui"):
            with self.assertRaises(services.ContrasenaInvalida, msg=invalida):
                services.validar_contrasena(invalida)
        services.validar_contrasena("Valida123")

    def test_el_api_rechaza_contrasena_sin_numero(self):
        api = cliente_autenticado("jefe", "Gerente")
        objetivo = crear_usuario("otro", "Cajero")
        respuesta = api.post(
            f"/api/usuarios/{objetivo.idusuario}/cambiar-contrasena/",
            {"contrasena": "SinNumeroAqui"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, 400)


class CrearGerenteTests(TestCase):
    def test_crea_y_luego_actualiza_el_gerente(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError
        from io import StringIO

        salida = StringIO()
        call_command("crear_gerente", contrasena="Gerente-2026", stdout=salida)
        usuario = Usuario.objects.get(nombreusuario="gerente")
        self.assertEqual(usuario.idrol.nombre, "Gerente")
        self.assertTrue(passwords.verificar("Gerente-2026", usuario.contrasenaencriptada)[0])

        call_command("crear_gerente", contrasena="Otra-clave-7", stdout=salida)
        usuario.refresh_from_db()
        self.assertTrue(passwords.verificar("Otra-clave-7", usuario.contrasenaencriptada)[0])
        self.assertEqual(Usuario.objects.filter(nombreusuario="gerente").count(), 1)

        with self.assertRaises(CommandError):
            call_command("crear_gerente", contrasena="debil", stdout=salida)
