from unittest import mock

from django.test import TestCase, override_settings
from django.urls import include, path

from apps.nucleo.pruebas import cliente_autenticado

from . import repositories

RUTA = "apps.reportes.repositories"

# URLs propias de la prueba: no dependen de las demás apps.
urlpatterns = [
    path("api/reportes/", include("apps.reportes.urls")),
    path("api/", include("apps.seguridad.urls")),  # el inicio de sesión de la prueba
]


@override_settings(ROOT_URLCONF=__name__)
class ReportesTests(TestCase):
    def test_solo_el_gerente_consulta_reportes(self):
        for rol in ("Cajero", "Digitador"):
            api = cliente_autenticado(f"u_{rol}", rol)
            respuesta = api.get("/api/reportes/productos-sin-stock/")
            self.assertEqual(respuesta.status_code, 403, rol)

    def test_total_facturado_llama_al_procedimiento_con_las_fechas(self):
        api = cliente_autenticado("jefe", "Gerente")
        filas = [{"concepto": "Total", "monto": "10000.00"}]
        with mock.patch(f"{RUTA}.total_facturado", return_value=filas) as sp:
            respuesta = api.get(
                "/api/reportes/total-facturado/?desde=2026-01-01&hasta=2026-12-31"
            )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json(), filas)
        desde, hasta = sp.call_args.args
        self.assertEqual((str(desde), str(hasta)), ("2026-01-01", "2026-12-31"))

    def test_rango_invalido_se_rechaza_sin_tocar_la_base(self):
        api = cliente_autenticado("jefe", "Gerente")
        with mock.patch(f"{RUTA}.total_facturado") as sp:
            sin_fechas = api.get("/api/reportes/total-facturado/")
            al_reves = api.get(
                "/api/reportes/total-facturado/?desde=2026-12-31&hasta=2026-01-01"
            )
        self.assertEqual(sin_fechas.status_code, 400)
        self.assertEqual(al_reves.status_code, 400)
        sp.assert_not_called()

    def test_menos_vendidos_exige_ambas_fechas_o_ninguna(self):
        api = cliente_autenticado("jefe", "Gerente")
        with mock.patch(f"{RUTA}.productos_menos_vendidos", return_value=[]) as sp:
            self.assertEqual(
                api.get("/api/reportes/productos-menos-vendidos/?desde=2026-01-01").status_code,
                400,
            )
            self.assertEqual(
                api.get("/api/reportes/productos-menos-vendidos/").status_code, 200
            )
        self.assertEqual(sp.call_args.args, (None, None, 10))

    def test_factura_inexistente_responde_404(self):
        api = cliente_autenticado("jefe", "Gerente")
        error = repositories.FacturaNoEncontrada("No existe una factura con ese numero.")
        with mock.patch(f"{RUTA}.factura", side_effect=error):
            respuesta = api.get("/api/reportes/factura/NO-EXISTE/")
        self.assertEqual(respuesta.status_code, 404)
        self.assertFalse(respuesta.json()["ok"])

    def test_error_del_procedimiento_responde_400_con_su_mensaje(self):
        api = cliente_autenticado("jefe", "Gerente")
        error = repositories.ReporteError("Indique un rango de fechas valido.")
        with mock.patch(f"{RUTA}.productos_mas_vendidos", side_effect=error):
            respuesta = api.get(
                "/api/reportes/productos-mas-vendidos/?desde=2026-01-01&hasta=2026-02-01"
            )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("rango", respuesta.json()["mensaje"])


@override_settings(ROOT_URLCONF=__name__)
class FinanzasTests(TestCase):
    def test_finanzas_solo_para_gerente(self):
        api = cliente_autenticado("caja", "Cajero")
        for ruta in ("estado-resultados", "valor-inventario", "iva", "cuentas-por-pagar"):
            self.assertEqual(api.get(f"/api/reportes/finanzas/{ruta}/").status_code, 403, ruta)

    def test_estado_resultados_envia_fechas_y_tasa_por_defecto(self):
        api = cliente_autenticado("jefe", "Gerente")
        with mock.patch(f"{RUTA}.estado_resultados", return_value=[]) as sp:
            r = api.get("/api/reportes/finanzas/estado-resultados/?desde=2026-10-01&hasta=2026-10-31")
        self.assertEqual(r.status_code, 200)
        desde, hasta, tasa = sp.call_args.args
        self.assertEqual((str(desde), str(hasta), str(tasa)), ("2026-10-01", "2026-10-31", "12"))

    def test_tasa_de_iva_fuera_de_rango_se_rechaza(self):
        api = cliente_autenticado("jefe", "Gerente")
        with mock.patch(f"{RUTA}.iva") as sp:
            r = api.get("/api/reportes/finanzas/iva/?desde=2026-10-01&hasta=2026-10-31&tasaIva=150")
        self.assertEqual(r.status_code, 400)
        sp.assert_not_called()

    def test_cuentas_por_pagar_acepta_sin_fechas(self):
        api = cliente_autenticado("jefe", "Gerente")
        with mock.patch(f"{RUTA}.cuentas_por_pagar", return_value=[]) as sp:
            r = api.get("/api/reportes/finanzas/cuentas-por-pagar/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(sp.call_args.args, (None, None))
