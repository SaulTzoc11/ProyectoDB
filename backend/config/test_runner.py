from django.apps import apps
from django.test.runner import DiscoverRunner


class EjecutorModelosNoGestionados(DiscoverRunner):
    """Crea las tablas de los modelos managed=False en la BD de pruebas."""

    def setup_databases(self, **kwargs):
        sin_gestion = [m for m in apps.get_models() if not m._meta.managed]
        for modelo in sin_gestion:
            modelo._meta.managed = True
        return super().setup_databases(**kwargs)
