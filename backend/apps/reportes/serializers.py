from rest_framework import serializers


class RangoFechasSerializer(serializers.Serializer):
    desde = serializers.DateField()
    hasta = serializers.DateField()
    top = serializers.IntegerField(required=False, min_value=1, max_value=500, default=10)

    def validate(self, datos):
        if datos["desde"] > datos["hasta"]:
            raise serializers.ValidationError(
                "La fecha 'desde' no puede ser mayor que 'hasta'."
            )
        return datos


class RangoOpcionalSerializer(RangoFechasSerializer):
    """Para el reporte de menos vendidos: ambas fechas o ninguna."""

    desde = serializers.DateField(required=False, allow_null=True, default=None)
    hasta = serializers.DateField(required=False, allow_null=True, default=None)

    def validate(self, datos):
        if (datos["desde"] is None) != (datos["hasta"] is None):
            raise serializers.ValidationError("Indique ambas fechas o ninguna.")
        if datos["desde"] and datos["desde"] > datos["hasta"]:
            raise serializers.ValidationError(
                "La fecha 'desde' no puede ser mayor que 'hasta'."
            )
        return datos


class BodegaSerializer(serializers.Serializer):
    idBodega = serializers.IntegerField(required=False, min_value=1, default=None)
