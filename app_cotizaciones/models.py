from django.db import models
from usuarios.models import Usuario, Cliente, Proveedor

# Create your models here.


class Cotizacion(models.Model):
    idcotizacion = models.AutoField(
        db_column="idCotizacion",
        primary_key=True

    )

    idcliente = models.ForeignKey(
    Cliente,
    on_delete=models.DO_NOTHING,
    db_column="idCliente"  ,  
    related_name="cotizaciones"
    )

    idusuario = models.ForeignKey(
    Usuario,
    on_delete=models.DO_NOTHING,
    db_column="idUsuario"  ,
    related_name="cotizaciones"
    )

    idestado = models.ForeignKey(
    "usuarios.Estado",
    on_delete=models.DO_NOTHING,
    db_column="idEstado"
  )
    codigoCotizacion = models.CharField(
        db_column="codigoCotizacion",
        max_length=20,
        unique=True
    )

    fecha = models.DateTimeField()

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    descuento = models.DecimalField(
        max_digits=10,

        decimal_places=2
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    observaciones = models.CharField(
    max_length=200,
    blank=True,

    )

    class Meta:
        managed = False
        db_table = "COTIZACION"

        def __str__(self):
            return f"Cotizacion {self.codigoCotizacion} - Cliente: {self.idcliente} - Total: Q{self.total}"


            

    
class DetalleCotizacion(models.Model):
    iddetallecotizacion = models.AutoField(
        db_column="idDetalleCotizacion",
        primary_key=True
    )

    idcotizacion = models.ForeignKey(
        "app_cotizaciones.Cotizacion",
        on_delete=models.DO_NOTHING,
        db_column="idCotizacion",
        related_name="detalles"
    )

    idproducto = models.ForeignKey(
        "usuarios.Producto",
        on_delete=models.DO_NOTHING,
        db_column="idProducto"
    )

    cantidad = models.IntegerField()

    precio_unitario = models.DecimalField(
        db_column="precioUnitario",
        max_digits=10,
        decimal_places=2
    )

    descuento = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    class Meta:
        managed = False
        db_table = "DETALLE_COTIZACION"

