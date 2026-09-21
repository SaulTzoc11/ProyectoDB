from getpass import getpass

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from usuarios.models import Rol, Usuario


class Command(BaseCommand):
    help = "Crea o actualiza el primer usuario gerente."

    def handle(self, *args, **options):
        self.stdout.write("Creacion del usuario gerente")
        self.stdout.write("---------------------------")

        nombreusuario = input(
            "Nombre de usuario [gerente]: "
        ).strip() or "gerente"

        nombres = input(
            "Nombres [Usuario]: "
        ).strip() or "Usuario"

        apellidos = input(
            "Apellidos [Gerente]: "
        ).strip() or "Gerente"

        correo = input(
            "Correo [gerente@sapopinturas.com]: "
        ).strip() or "gerente@sapopinturas.com"

        contrasena = getpass("Contrasena: ")
        confirmacion = getpass("Confirmar contrasena: ")

        if len(contrasena) < 8:
            raise CommandError(
                "La contrasena debe tener al menos 8 caracteres."
            )

        if contrasena != confirmacion:
            raise CommandError(
                "Las contrasenas no coinciden."
            )

        rol = Rol.objects.filter(
            nombre__iexact="Gerente"
        ).first()

        if rol is None:
            rol = Rol.objects.create(nombre="Gerente")
            self.stdout.write(
                self.style.SUCCESS("Rol Gerente creado.")
            )

        usuario, creado = Usuario.objects.update_or_create(
            nombreusuario=nombreusuario,
            defaults={
                "idrol": rol,
                "contrasenaencriptada": make_password(contrasena),
                "nombres": nombres,
                "apellidos": apellidos,
                "correo": correo,
                "activo": True,
            }
        )

        if creado:
            mensaje = "Usuario gerente creado correctamente."
        else:
            mensaje = "Usuario gerente actualizado correctamente."

        self.stdout.write(self.style.SUCCESS(mensaje))
        self.stdout.write(
            f"Usuario para iniciar sesion: {usuario.nombreusuario}"
        )