from rest_framework import serializers

from .models import Cotizacion, DetalleCotizacion



class LineaCotizacionSerializer(serializers.Serializer):
    idProducto = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1)
    descuento = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=50, default=0
    )
 
 
class GenerarCotizacionSerializer(serializers.Serializer):
    idCliente = serializers.IntegerField(min_value=1)
    observaciones = serializers.CharField(
        max_length=250, required=False, allow_blank=True, allow_null=True
    )
    detalle = LineaCotizacionSerializer(many=True, allow_empty=False)
    tokensDescuento = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
 