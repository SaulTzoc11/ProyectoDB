from django.db import models

class Bodega(models.Model):
    idbodega = models.AutoField(
        db_column="idBodega",
        primary_key=True
    )

    nombre = models.CharField(
        max_length=50
    )

    direccion = models.CharField(
        max_length=250,
        blank=True,
        null=True
    )

    descripcion = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    activo = models.BooleanField(
        default=True
    )

    class Meta:
        managed = False
        db_table = "BODEGA"

    def __str__(self):
        return self.nombre


class Estante(models.Model):
    idestante = models.AutoField(
        db_column="idEstante", primary_key=True
    )
    idbodega = models.ForeignKey(
        Bodega, models.DO_NOTHING, db_column="idBodega"
    )
    codigoestante = models.CharField(
        db_column="codigoEstante", max_length=20
    )
    descripcion = models.CharField(
        max_length=150, blank=True, null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "ESTANTE"
        unique_together = (("idbodega", "codigoestante"),)

    def __str__(self):
        return self.codigoestante

