from .models import Cotizacion, DetalleCotizacion


def cotizaciones_de_usuario(id_usuario):
    return (
        Cotizacion.objects.filter(idusuario=id_usuario)
        .select_related("idcliente", "idusuario", "idestado")
        .prefetch_related("detalles")
        .order_by("-fecha")
    )


def detalles_de_usuario(id_usuario):
    return DetalleCotizacion.objects.filter(
        idcotizacion__idusuario=id_usuario
    ).select_related("idcotizacion", "idproducto")
