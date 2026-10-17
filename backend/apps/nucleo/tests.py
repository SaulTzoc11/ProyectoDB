from django.test import TestCase


class ServidorFrontendTests(TestCase):
    def test_raiz_sirve_el_login(self):
        respuesta = self.client.get("/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn("formularioLogin", respuesta.content.decode())

    def test_los_fragmentos_compartidos_se_incluyen(self):
        contenido = self.client.get("/pages/catalogo.html").content.decode()
        self.assertNotIn("<!--#", contenido)
        self.assertIn('id="barraLateral"', contenido)
        self.assertIn("subnav catalogo", contenido)

    def test_todas_las_paginas_resuelven_sus_fragmentos(self):
        from pathlib import Path
        from django.conf import settings

        for pagina in sorted(Path(settings.FRONTEND_DIR, "pages").glob("*.html")):
            contenido = self.client.get(f"/pages/{pagina.name}").content.decode()
            self.assertNotIn("<!--#", contenido, pagina.name)
            self.assertIn('id="barraLateral"', contenido, pagina.name)

    def test_tipos_de_archivo(self):
        self.assertIn("text/css", self.client.get("/css/estilos.css")["Content-Type"])
        js = self.client.get("/js/api.js")["Content-Type"]
        self.assertIn("javascript", js)
        self.assertEqual(self.client.get("/assets/barra.png")["Content-Type"], "image/png")

    def test_no_permite_salir_de_la_carpeta_del_front(self):
        for ruta in ("/../backend/config/settings.py", "/%2e%2e/backend/manage.py", "/css/../../README.md"):
            self.assertEqual(self.client.get(ruta).status_code, 404, ruta)

    def test_la_api_no_la_captura_el_servidor_del_front(self):
        self.assertEqual(self.client.get("/api/sesion/").status_code, 403)
        self.assertEqual(self.client.get("/pagina-inexistente.html").status_code, 404)
