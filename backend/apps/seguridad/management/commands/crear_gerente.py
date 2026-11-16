from getpass import getpass

from django.core.management.base import BaseCommand, CommandError

from apps.nucleo import roles
from apps.seguridad import passwords, services
from apps.seguridad.models import Rol, Usuario


class Command(BaseCommand):
    help = "Crea o actualiza el primer usuario gerente."

    def add_arguments(self, parser):
        parser.add_argument("--usuario", default="gerente")
        parser.add_argument("--nombres", default="Usuario")
        parser.add_argument("--apellidos", default="Gerente")
        parser.add_argument("--correo", default="gerente@sapopinturas.com")
        parser.add_argument("--contrasena")

    def handle(self, *args, **opciones):
        contrasena = opciones["contrasena"]

        if contrasena is None:
            contrasena = getpass("Contraseña: ")
            if contrasena != getpass("Confirmar contraseña: "):
                raise CommandError("Las contraseñas no coinciden.")

        try:
            services.validar_contrasena(contrasena)
        except services.ContrasenaInvalida as error:
            raise CommandError(str(error))

        rol, _ = Rol.objects.get_or_create(nombre=roles.GERENTE)

        usuario, creado = Usuario.objects.update_or_create(
            nombreusuario=opciones["usuario"],
            defaults={
                "idrol": rol,
                "contrasenaencriptada": passwords.cifrar(contrasena),
                "nombres": opciones["nombres"],
                "apellidos": opciones["apellidos"],
                "correo": opciones["correo"],
                "activo": True,
                "intentosfallidos": 0,
                "bloqueadohasta": None,
            },
        )

        accion = "creado" if creado else "actualizado"
        self.stdout.write(
            self.style.SUCCESS(f"Usuario gerente {accion}: {usuario.nombreusuario}")
        )
