from django.test import TestCase
from django.utils import timezone

from apps.nucleo.pruebas import (
    cliente_autenticado,
    crear_cliente_comercial,
    crear_estado,
    crear_usuario,
)
from apps.seguridad.models import Usuario

from .models import Cotizacion


def crear_cotizacion(usuario, codigo):
    return Cotizacion.objects.create(
        idcliente=crear_cliente_comercial(nit=codigo[-7:].rjust(7, "0")),
        idusuario=usuario,
        idestado=crear_estado(),
        codigoCotizacion=codigo,
        fecha=timezone.now(),
        subtotal=100,
        descuento=10,
        total=90,
    )


class CotizacionesTests(TestCase):
    def test_cada_empleado_ve_solo_sus_cotizaciones(self):
        api = cliente_autenticado("caja", "Cajero")
        propio = Usuario.objects.get(nombreusuario="caja")
        ajeno = crear_usuario("otro", "Digitador")
        crear_cotizacion(propio, "COT-0000001")
        crear_cotizacion(ajeno, "COT-0000002")

        codigos = [c["codigoCotizacion"] for c in api.get("/api/cotizaciones/").json()]
        self.assertEqual(codigos, ["COT-0000001"])

    def test_ruta_de_detalles_no_se_confunde_con_el_detalle_de_una_cotizacion(self):
        api = cliente_autenticado("caja", "Cajero")
        respuesta = api.get("/api/cotizaciones/detalles/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json(), [])

    def test_cotizaciones_son_solo_lectura(self):
        api = cliente_autenticado("caja", "Cajero")
        self.assertEqual(api.post("/api/cotizaciones/", {}, format="json").status_code, 405)


class AutorizacionDescuentoTests(TestCase):
    URL = "/api/cotizaciones/autorizar-descuento/"

    def setUp(self):
        self.api = cliente_autenticado("caja", "Cajero")

    def solicitar(self, clave, porcentaje):
        return self.api.post(
            self.URL, {"clave": clave, "porcentaje": porcentaje}, format="json"
        )

    def test_clave_correcta_y_porcentaje_valido(self):
        respuesta = self.solicitar("clave-de-prueba", 15)
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["porcentaje"], "15")

    def test_clave_incorrecta(self):
        self.assertEqual(self.solicitar("otra", 10).status_code, 403)

    def test_porcentaje_fuera_de_rango_o_invalido(self):
        for valor in (-1, 51, "abc", "NaN"):
            self.assertEqual(self.solicitar("clave-de-prueba", valor).status_code, 400, valor)

    def test_exige_sesion(self):
        from rest_framework.test import APIClient

        sin_sesion = APIClient().post(self.URL, {"clave": "clave-de-prueba", "porcentaje": 5}, format="json")
        self.assertIn(sin_sesion.status_code, (401, 403))

class FacturacionTests(TestCase):
    """El SP real se prueba con verificar_integracion; aquí se valida la capa HTTP/servicio."""

    PAGO = {"idTipoPago": 1, "monto": "90.00"}

    def _llamar(self, cuerpo, rol="Cajero"):
        from unittest import mock

        api = cliente_autenticado("caja", rol)
        with mock.patch(
            "apps.ventas.repositories.facturar_json",
            return_value={"idFactura": 1, "noFactura": "FAC-2026-000001",
                          "idCotizacion": 5, "total": "90.00"},
        ) as sp:
            respuesta = api.post("/api/facturas/", cuerpo, format="json")
        return respuesta, sp

    def test_factura_una_cotizacion_confirmada(self):
        respuesta, sp = self._llamar({"idCotizacion": 5, "pagos": [self.PAGO]})
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.json()["noFactura"], "FAC-2026-000001")
        self.assertEqual(sp.call_args.kwargs["id_cotizacion"], 5)

    def test_sin_cotizacion_cotiza_en_el_momento(self):
        cuerpo = {"idCliente": 3, "detalle": [{"idProducto": 7, "cantidad": 2}],
                  "pagos": [self.PAGO]}
        respuesta, sp = self._llamar(cuerpo)
        self.assertEqual(respuesta.status_code, 201)
        self.assertIsNone(sp.call_args.kwargs["id_cotizacion"])
        self.assertEqual(sp.call_args.kwargs["detalle"], [(7, 2, 0)])

    def test_rechaza_pedido_sin_cotizacion_ni_detalle(self):
        respuesta, sp = self._llamar({"pagos": [self.PAGO]})
        self.assertEqual(respuesta.status_code, 400)
        sp.assert_not_called()

    def test_descuento_sin_autorizacion_no_llega_al_sp(self):
        cuerpo = {"idCliente": 3, "pagos": [self.PAGO],
                  "detalle": [{"idProducto": 7, "cantidad": 1, "descuento": 10}]}
        respuesta, sp = self._llamar(cuerpo)
        self.assertEqual(respuesta.status_code, 403)
        sp.assert_not_called()

    def test_exige_al_menos_un_pago(self):
        respuesta, sp = self._llamar({"idCotizacion": 5, "pagos": []})
        self.assertEqual(respuesta.status_code, 400)
        sp.assert_not_called()

    def test_listas_de_apoyo_de_la_pantalla(self):
        from unittest import mock

        api = cliente_autenticado("caja", "Cajero")
        with mock.patch("apps.ventas.repositories.listar_tipos_pago", return_value=[{"id": 1, "nombre": "Efectivo"}]):
            self.assertEqual(api.get("/api/facturas/tipos-pago/").json()[0]["nombre"], "Efectivo")
        with mock.patch("apps.ventas.repositories.cotizaciones_por_facturar", return_value=[]):
            self.assertEqual(api.get("/api/facturas/pendientes/").json(), [])