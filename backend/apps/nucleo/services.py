from django.db import IntegrityError, transaction


class RegistroNoActivable(Exception):
    pass


class RegistroEnUso(Exception):
    pass


def desactivar_o_eliminar(registro):
    """Desactiva el registro si tiene campo activo; si no, lo elimina."""
    if hasattr(registro, "activo"):
        registro.activo = False
        registro.save(update_fields=["activo"])
        return "desactivado"

    try:
        with transaction.atomic():
            registro.delete()
    except IntegrityError as error:
        raise RegistroEnUso(
            "No se puede eliminar porque está relacionado con otros registros."
        ) from error

    return "eliminado"


def activar(registro):
    if not hasattr(registro, "activo"):
        raise RegistroNoActivable(
            "Esta tabla no utiliza activación y desactivación."
        )

    registro.activo = True
    registro.save(update_fields=["activo"])
    return registro
