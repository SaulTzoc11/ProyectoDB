from .models import (
    Categoria,
    Color,
    Estado,
    Marca,
    Precio,
    Presentacion,
    Producto,
    ProductoGeneral,
    TipoPrecio,
)

ESTADO_VIGENTE = "Vigente"


def categorias():
    return Categoria.objects.all().order_by("nombre")


def marcas():
    return Marca.objects.all().order_by("nombre")


def presentaciones():
    return Presentacion.objects.all().order_by("nombre")


def colores():
    return Color.objects.all().order_by("nombre")


def tipos_precio():
    return TipoPrecio.objects.all().order_by("nombre")


def estados():
    return Estado.objects.all().order_by("nombre")


def productos_generales():
    return (
        ProductoGeneral.objects.select_related("idmarca", "idcategoria")
        .all()
        .order_by("nombre")
    )


def productos():
    return (
        Producto.objects.select_related(
            "idproductogeneral",
            "idproductogeneral__idmarca",
            "idproductogeneral__idcategoria",
            "idpresentacion",
            "idcolor",
        )
        .all()
        .order_by("codigoproducto")
    )


def precios():
    return (
        Precio.objects.select_related(
            "idtipoprecio",
            "idproducto",
            "idproducto__idproductogeneral",
            "idestado",
        )
        .all()
        .order_by("-fechaasignacion")
    )


def precios_vigentes(producto):
    return (
        Precio.objects.filter(
            idproducto=producto, idestado__nombre__iexact=ESTADO_VIGENTE
        )
        .select_related("idtipoprecio", "idestado")
        .order_by("idtipoprecio__nombre")
    )
