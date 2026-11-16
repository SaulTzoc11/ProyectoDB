from django.utils import timezone
from rest_framework import serializers

from apps.inventario import repositories as inventario

from . import repositories
from .models import (
    Bodega,
    Estante,
)

class BodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bodega
        fields = [
            "idbodega",
            "nombre",
            "direccion",
            "descripcion",
            "activo",
        ]
        read_only_fields = ["idbodega"]

    def validate_nombre(self, valor):
        valor = valor.strip()

        if not valor:
            raise serializers.ValidationError(
                "El nombre de la bodega es obligatorio."
            )

        return valor

class EstanteSerializer(serializers.ModelSerializer):
    bodega_nombre = serializers.ReadOnlyField(
        source="idbodega.nombre"
    )

    class Meta:
        model = Estante
        fields = [
            "idestante",
            "idbodega",
            "bodega_nombre",
            "codigoestante",
            "descripcion",
            "activo",
        ]
        read_only_fields = ["idestante"]