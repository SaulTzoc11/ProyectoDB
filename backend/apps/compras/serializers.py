from rest_framework import serializers
from decimal import Decimal
from .models import Proveedor


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = [
            "idproveedor",
            "nombreproveedor",
            "nit",
            "nombrecontacto",
            "telefono",
            "correo",
            "direccion",
            "activo",
        ]
        read_only_fields = ["idproveedor"]

    def validate_nit(self, valor):
        valor = valor.strip()

        if not valor:
            raise serializers.ValidationError(
                "El NIT es obligatorio."
            )

        return valor


class ProductoOrdenSerializer(serializers.Serializer):
    idProducto = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1)
    costoUnitario = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0.01
    )


class OrdenCompraSerializer(serializers.Serializer):
    idProveedor = serializers.IntegerField(min_value=1)
    observaciones = serializers.CharField(
        max_length=250,
        required=False,
        allow_blank=True
    )
    detalle = ProductoOrdenSerializer(many=True)

    def validate_detalle(self, productos):
        if not productos:
            raise serializers.ValidationError(
                "Agrega al menos un producto."
            )

        ids = [p["idProducto"] for p in productos]

        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(
                "No puedes repetir productos."
            )

        return productos

class ProductoIngresoSerializer(serializers.Serializer):
    idDetalleCompra = serializers.IntegerField(min_value=1)
    idEstante = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1)
    costoUnitarioReal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01")
    )


class IngresoBodegaSerializer(serializers.Serializer):
    idCompra = serializers.IntegerField(min_value=1)
    observaciones = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=250
    )
    detalle = ProductoIngresoSerializer(many=True)

    def validate_detalle(self, detalle):
        if not detalle:
            raise serializers.ValidationError(
                "Debes recibir al menos un producto."
            )

        ids = [p["idDetalleCompra"] for p in detalle]

        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(
                "No repitas el mismo producto."
            )
        return detalle
