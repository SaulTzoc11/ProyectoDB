from rest_framework.test import APIClient

from apps.catalogo.models import Estado
from apps.clientes.models import Cliente, TipoCliente
from apps.seguridad import passwords
from apps.seguridad.models import Rol, Usuario

CONTRASENA = "Clave-segura-1"


def crear_usuario(nombre, rol, contrasena=CONTRASENA, activo=True, almacenado=None):
    rol_obj, _ = Rol.objects.get_or_create(nombre=rol)
    return Usuario.objects.create(
        idrol=rol_obj,
        nombreusuario=nombre,
        contrasenaencriptada=almacenado or passwords.cifrar(contrasena),
        nombres=nombre.capitalize(),
        apellidos="Prueba",
        correo=f"{nombre}@prueba.com",
        activo=activo,
    )


def cliente_autenticado(nombre, rol, validar_csrf=False):
    crear_usuario(nombre, rol)
    cliente = APIClient(enforce_csrf_checks=validar_csrf)
    respuesta = cliente.post(
        "/api/login/", {"username": nombre, "password": CONTRASENA}, format="json"
    )
    assert respuesta.status_code == 200, respuesta.content
    return cliente


def crear_cliente_comercial(nombre="Cliente Uno", nit="1234567"):
    tipo, _ = TipoCliente.objects.get_or_create(nombre="Individual")
    return Cliente.objects.create(
        idtipocliente=tipo, nombrecliente=nombre, nit=nit, activo=True
    )


def crear_estado(nombre="Vigente"):
    estado, _ = Estado.objects.get_or_create(nombre=nombre)
    return estado
