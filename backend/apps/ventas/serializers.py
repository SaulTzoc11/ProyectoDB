from rest_framework import serializers

from .models import Cotizacion, DetalleCotizacion


class DetalleCotizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleCotizacion
        fields = "__all__"


class CotizacionSerializer(serializers.ModelSerializer):
    detalles = DetalleCotizacionSerializer(many=True, read_only=True)

    class Meta:
        model = Cotizacion
        fields = "__all__"
