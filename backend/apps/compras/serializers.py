from rest_framework import serializers

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
