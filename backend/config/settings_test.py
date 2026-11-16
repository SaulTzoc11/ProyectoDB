import os

os.environ.setdefault("DB_ENGINE", "sqlite")
os.environ.setdefault("DJANGO_DEBUG", "1")
os.environ.setdefault("SERVIR_FRONTEND", "1")
os.environ.setdefault("DESCUENTO_CLAVE", "clave-de-prueba")

from .settings import *  # noqa: E402,F403

TEST_RUNNER = "config.test_runner.EjecutorModelosNoGestionados"
MIGRATION_MODULES = {
    app: None
    for app in (
        "nucleo",
        "seguridad",
        "catalogo",
        "clientes",
        "compras",
        "ventas",
        "inventario",
    )
}
