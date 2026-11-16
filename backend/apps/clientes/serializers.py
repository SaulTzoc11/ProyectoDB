from rest_framework import serializers

from .models import Cliente, TipoCliente


class TipoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCliente
        fields = [
            "idtipocliente",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idtipocliente"]


class ClienteSerializer(serializers.ModelSerializer):
    tipo_cliente_nombre = serializers.ReadOnlyField(
        source="idtipocliente.nombre"
    )

    class Meta:
        model = Cliente
        fields = [
            "idcliente",
            "idtipocliente",
            "tipo_cliente_nombre",
            "nombrecliente",
            "nit",
            "telefono",
            "correo",
            "direccion",
            "nombrecontacto",
            "activo",
        ]
        read_only_fields = ["idcliente"]

    def validate_nit(self, valor):
        valor = valor.strip()

        if not valor:
            raise serializers.ValidationError(
                "El NIT es obligatorio."
            )

        return valor
