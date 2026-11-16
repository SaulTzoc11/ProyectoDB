from django.core.management.base import BaseCommand

from apps.seguridad import passwords
from apps.seguridad.models import Usuario


class Command(BaseCommand):
    help = (
        "Convierte a hash de Django las contraseñas guardadas en texto plano. "
        "Las del formato antiguo se actualizan solas en el primer inicio de sesión."
    )

    def handle(self, *args, **options):
        convertidos = 0

        for usuario in Usuario.objects.all():
            almacenado = usuario.contrasenaencriptada

            if passwords.es_formato_django(almacenado):
                continue
            if passwords.es_formato_legado(almacenado):
                continue

            usuario.contrasenaencriptada = passwords.cifrar(almacenado)
            usuario.save(update_fields=["contrasenaencriptada"])
            convertidos += 1

        self.stdout.write(f"Contraseñas convertidas: {convertidos}")
