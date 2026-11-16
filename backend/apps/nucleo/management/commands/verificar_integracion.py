from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.test import APIClient

from apps.nucleo.pruebas import CONTRASENA, crear_usuario

PRUEBAS_LECTURA = (
    "/api/categorias/",
    "/api/marcas/",
    "/api/presentaciones/",
    "/api/colores/",
    "/api/tipos-precio/",
    "/api/estados/",
    "/api/productos-generales/",
    "/api/productos/",
    "/api/precios/",
    "/api/tipos-cliente/",
    "/api/clientes/",
    "/api/proveedores/",
    "/api/usuarios/",
    "/api/roles/",
    "/api/cotizaciones/",
    "/api/cotizaciones/detalles/",
)


class Abortar(Exception):
    pass


class Command(BaseCommand):
    help = "Prueba los endpoints contra la base de datos real y revierte todo."

    def handle(self, *args, **options):
        fallos = []

        try:
            with transaction.atomic():
                crear_usuario("verificador", "Gerente")
                api = APIClient(HTTP_HOST="localhost")
                login = api.post(
                    "/api/login/",
                    {"username": "verificador", "password": CONTRASENA},
                    format="json",
                )
                if login.status_code != 200:
                    raise CommandError(f"Login fallido: {login.status_code}")

                for ruta in PRUEBAS_LECTURA:
                    respuesta = api.get(ruta)
                    estado = "OK" if respuesta.status_code == 200 else "FALLO"
                    self.stdout.write(f"{estado} {respuesta.status_code} {ruta}")
                    if respuesta.status_code != 200:
                        fallos.append(ruta)

                productos = api.get("/api/productos/").json()
                con_stock = [p for p in productos if p["stock"] > 0]
                self.stdout.write(
                    f"Productos: {len(productos)}, con existencias: {len(con_stock)}"
                )
                if not productos:
                    fallos.append("productos vacio")

                raise Abortar()
        except Abortar:
            pass

        if fallos:
            raise CommandError(f"Fallos: {', '.join(fallos)}")

        self.stdout.write(self.style.SUCCESS("Integracion verificada; cambios revertidos."))
