from django.utils import timezone
from rest_framework import serializers

from apps.inventario import repositories as inventario

from . import repositories
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


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = [
            "idcategoria",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idcategoria"]


class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = [
            "idmarca",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idmarca"]


class PresentacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Presentacion
        fields = [
            "idpresentacion",
            "nombre",
            "cantidad",
            "unidadmedida",
        ]
        read_only_fields = ["idpresentacion"]

    def validate_cantidad(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(
                "La cantidad debe ser mayor que cero."
            )

        return valor


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = [
            "idcolor",
            "nombre",
            "codigohex",
            "activo",
        ]
        read_only_fields = ["idcolor"]

    def validate_codigohex(self, valor):
        if not valor:
            return valor

        valor = valor.upper()

        if len(valor) != 7 or not valor.startswith("#"):
            raise serializers.ValidationError(
                "El color debe tener el formato #FFFFFF."
            )

        try:
            int(valor[1:], 16)
        except ValueError:
            raise serializers.ValidationError(
                "El código hexadecimal no es válido."
            )

        return valor


class TipoPrecioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPrecio
        fields = [
            "idtipoprecio",
            "nombre",
            "descripcion",
            "activo",
        ]
        read_only_fields = ["idtipoprecio"]


class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estado
        fields = [
            "idestado",
            "nombre",
        ]
        read_only_fields = ["idestado"]


class ProductoGeneralSerializer(serializers.ModelSerializer):
    marca_nombre = serializers.ReadOnlyField(
        source="idmarca.nombre"
    )
    categoria_nombre = serializers.ReadOnlyField(
        source="idcategoria.nombre"
    )

    class Meta:
        model = ProductoGeneral
        fields = [
            "idproductogeneral",
            "idmarca",
            "marca_nombre",
            "idcategoria",
            "categoria_nombre",
            "nombre",
            "descripcion",
            "activo",
        ]
        read_only_fields = ["idproductogeneral"]


class ProductoSerializer(serializers.ModelSerializer):
    producto_general_nombre = serializers.ReadOnlyField(
        source="idproductogeneral.nombre"
    )

    producto_descripcion = serializers.ReadOnlyField(
        source="idproductogeneral.descripcion"
    )

    marca_nombre = serializers.ReadOnlyField(
        source="idproductogeneral.idmarca.nombre"
    )

    categoria_nombre = serializers.ReadOnlyField(
        source="idproductogeneral.idcategoria.nombre"
    )

    presentacion_nombre = serializers.ReadOnlyField(
        source="idpresentacion.nombre"
    )

    presentacion_cantidad = serializers.ReadOnlyField(
        source="idpresentacion.cantidad"
    )

    unidad_medida = serializers.ReadOnlyField(
        source="idpresentacion.unidadmedida"
    )

    color_nombre = serializers.SerializerMethodField()
    color_codigohex = serializers.SerializerMethodField()
    precios = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    ubicaciones = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            "idproducto",
            "idproductogeneral",
            "producto_general_nombre",
            "producto_descripcion",
            "marca_nombre",
            "categoria_nombre",
            "idpresentacion",
            "presentacion_nombre",
            "presentacion_cantidad",
            "unidad_medida",
            "idcolor",
            "color_nombre",
            "color_codigohex",
            "codigoproducto",
            "codigobarras",
            "activo",
            "precios",
            "stock",
            "ubicaciones",
        ]

        read_only_fields = ["idproducto"]

    def get_color_nombre(self, producto):
        if producto.idcolor:
            return producto.idcolor.nombre

        return "Sin color"

    def get_color_codigohex(self, producto):
        if producto.idcolor and producto.idcolor.codigohex:
            return producto.idcolor.codigohex

        return "#027DD6"

    def get_precios(self, producto):
        precios = repositories.precios_vigentes(producto)

        return [
            {
                "idprecio": precio.idprecio,
                "tipo": precio.idtipoprecio.nombre,
                "valor": float(precio.precio),
                "estado": precio.idestado.nombre,
            }
            for precio in precios
        ]

    def obtener_inventario(self, producto):
        if not hasattr(producto, "_inventario_cache"):
            producto._inventario_cache = inventario.existencias_de_producto(
                producto.idproducto
            )
        return producto._inventario_cache

    def get_stock(self, producto):
        return self.obtener_inventario(producto)["stock"]

    def get_ubicaciones(self, producto):
        return self.obtener_inventario(producto)["ubicaciones"]


class PrecioSerializer(serializers.ModelSerializer):
    tipo_precio_nombre = serializers.ReadOnlyField(
        source="idtipoprecio.nombre"
    )
    producto_nombre = serializers.ReadOnlyField(
        source="idproducto.idproductogeneral.nombre"
    )
    estado_nombre = serializers.ReadOnlyField(
        source="idestado.nombre"
    )

    class Meta:
        model = Precio
        fields = [
            "idprecio",
            "idtipoprecio",
            "tipo_precio_nombre",
            "idproducto",
            "producto_nombre",
            "idestado",
            "estado_nombre",
            "precio",
            "fechaasignacion",
        ]
        read_only_fields = [
            "idprecio",
            "fechaasignacion",
        ]

    def validate_precio(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(
                "El precio debe ser mayor que cero."
            )

        return valor

    def create(self, validated_data):
        validated_data["fechaasignacion"] = timezone.now()
        return super().create(validated_data)
