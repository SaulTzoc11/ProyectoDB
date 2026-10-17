from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient

from apps.nucleo.pruebas import cliente_autenticado, crear_estado

from .models import (
    Categoria,
    Color,
    Marca,
    Precio,
    Presentacion,
    Producto,
    ProductoGeneral,
    TipoPrecio,
)


class PermisosCatalogoTests(TestCase):
    def test_sin_sesion_no_hay_acceso(self):
        self.assertIn(APIClient().get("/api/categorias/").status_code, (401, 403))

    def test_cajero_puede_leer_pero_no_escribir(self):
        api = cliente_autenticado("caja", "Cajero")
        self.assertEqual(api.get("/api/categorias/").status_code, 200)
        respuesta = api.post("/api/categorias/", {"nombre": "Pinturas"}, format="json")
        self.assertEqual(respuesta.status_code, 403)

    def test_digitador_y_gerente_pueden_escribir(self):
        for rol in ("Digitador", "Gerente"):
            api = cliente_autenticado(f"u_{rol}", rol)
            respuesta = api.post(
                "/api/categorias/", {"nombre": f"Cat {rol}"}, format="json"
            )
            self.assertEqual(respuesta.status_code, 201, respuesta.content)


class MantenimientoTests(TestCase):
    def setUp(self):
        self.api = cliente_autenticado("jefe", "Gerente")

    def test_eliminar_desactiva_si_tiene_campo_activo_y_se_puede_reactivar(self):
        color = Color.objects.create(nombre="Rojo", codigohex="#FF0000", activo=True)
        respuesta = self.api.delete(f"/api/colores/{color.pk}/")
        self.assertEqual(respuesta.status_code, 200)
        color.refresh_from_db()
        self.assertFalse(color.activo)
        self.api.post(f"/api/colores/{color.pk}/activar/")
        color.refresh_from_db()
        self.assertTrue(color.activo)

    def test_eliminar_sin_campo_activo_borra_el_registro(self):
        categoria = Categoria.objects.create(nombre="Barnices")
        self.assertEqual(
            self.api.delete(f"/api/categorias/{categoria.pk}/").status_code, 204
        )
        self.assertFalse(Categoria.objects.filter(pk=categoria.pk).exists())

    def test_activar_en_tabla_sin_campo_activo_devuelve_400(self):
        categoria = Categoria.objects.create(nombre="Esmaltes")
        respuesta = self.api.post(f"/api/categorias/{categoria.pk}/activar/")
        self.assertEqual(respuesta.status_code, 400)

    def test_precio_debe_ser_mayor_que_cero(self):
        general = ProductoGeneral.objects.create(
            idmarca=Marca.objects.create(nombre="M"),
            idcategoria=Categoria.objects.create(nombre="C"),
            nombre="Latex",
        )
        producto = Producto.objects.create(
            idproductogeneral=general,
            idpresentacion=Presentacion.objects.create(
                nombre="Cubeta", cantidad=5, unidadmedida="gal"
            ),
            codigoproducto="LAT-5",
        )
        tipo = TipoPrecio.objects.create(nombre="Publico")
        estado = crear_estado("Vigente")
        datos = {
            "idtipoprecio": tipo.pk,
            "idproducto": producto.pk,
            "idestado": estado.pk,
        }
        malo = self.api.post("/api/precios/", {**datos, "precio": "0"}, format="json")
        self.assertEqual(malo.status_code, 400)
        bueno = self.api.post("/api/precios/", {**datos, "precio": "120.50"}, format="json")
        self.assertEqual(bueno.status_code, 201, bueno.content)
        self.assertEqual(Precio.objects.count(), 1)

        with mock.patch(
            "apps.inventario.repositories.existencias_de_producto",
            return_value={"stock": 7, "ubicaciones": [{"bodega": "B1", "estante": "A1", "cantidad": 7}]},
        ):
            detalle = self.api.get(f"/api/productos/{producto.pk}/").json()

        self.assertEqual(detalle["stock"], 7)
        self.assertEqual(detalle["precios"][0]["valor"], 120.5)
        self.assertEqual(detalle["precios"][0]["tipo"], "Publico")
