from decimal import Decimal
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
    
class PagoFacturaSerializer(serializers.Serializer):
    idTipoPago = serializers.IntegerField(min_value=1)
    monto = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    observaciones = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )


class FacturarSerializer(serializers.Serializer):
    """Con cotización: idCotizacion. Sin cotización: idCliente + detalle."""
    idCotizacion = serializers.IntegerField(min_value=1, required=False)
    idCliente = serializers.IntegerField(min_value=1, required=False)
    observaciones = serializers.CharField(
        max_length=250, required=False, allow_blank=True, allow_null=True
    )
    detalle = LineaCotizacionSerializer(many=True, required=False)
    pagos = PagoFacturaSerializer(many=True, allow_empty=False)
    tokensDescuento = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )

    def validate(self, datos):
        if "idCotizacion" not in datos:
            if "idCliente" not in datos or not datos.get("detalle"):
                raise serializers.ValidationError(
                    "Indique idCotizacion, o bien idCliente y detalle."
                )
        elif datos.get("detalle"):
            raise serializers.ValidationError(
                "Con idCotizacion no se envía detalle: se factura lo cotizado."
            )
        return datos