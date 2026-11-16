from django.test import TestCase

from apps.nucleo.pruebas import cliente_autenticado

from .models import TipoCliente


class ClientesTests(TestCase):
    def test_nit_duplicado_se_rechaza(self):
        api = cliente_autenticado("jefe", "Gerente")
        tipo = TipoCliente.objects.create(nombre="Empresa")
        datos = {
            "idtipocliente": tipo.pk,
            "nombrecliente": "Ferreteria Uno",
            "nit": "1234567",
            "activo": True,
        }
        self.assertEqual(api.post("/api/clientes/", datos, format="json").status_code, 201)
        repetido = api.post("/api/clientes/", {**datos, "nombrecliente": "Otra"}, format="json")
        self.assertEqual(repetido.status_code, 400)

    def test_cajero_consulta_clientes_pero_no_los_modifica(self):
        api = cliente_autenticado("caja", "Cajero")
        self.assertEqual(api.get("/api/clientes/").status_code, 200)
        self.assertEqual(api.post("/api/clientes/", {}, format="json").status_code, 403)
