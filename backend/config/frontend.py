import mimetypes
import re
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse

INCLUDE = re.compile(r'<!--#\s*include\s+virtual="([^"]+)"\s*-->')
PROFUNDIDAD_MAXIMA = 5


def _resolver(raiz, ruta):
    destino = (raiz / ruta.lstrip("/")).resolve()
    if raiz != destino and raiz not in destino.parents:
        raise Http404
    if not destino.is_file():
        raise Http404
    return destino


def _expandir(raiz, contenido, nivel=0):
    if nivel >= PROFUNDIDAD_MAXIMA:
        return contenido

    def sustituir(coincidencia):
        parcial = _resolver(raiz, coincidencia.group(1))
        texto = parcial.read_text(encoding="utf-8")
        return _expandir(raiz, texto, nivel + 1)

    return INCLUDE.sub(sustituir, contenido)


def servir(request, ruta=""):
    raiz = Path(settings.FRONTEND_DIR).resolve()
    ruta = ruta or "index.html"

    if ruta.endswith("/"):
        ruta += "index.html"

    destino = _resolver(raiz, ruta)

    if destino.suffix == ".html":
        contenido = _expandir(raiz, destino.read_text(encoding="utf-8"))
        respuesta = HttpResponse(contenido, content_type="text/html; charset=utf-8")
    else:
        tipo = mimetypes.guess_type(destino.name)[0] or "application/octet-stream"
        respuesta = FileResponse(open(destino, "rb"), content_type=tipo)

    respuesta["Cache-Control"] = "no-cache"
    return respuesta
