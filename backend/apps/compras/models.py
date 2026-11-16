from django.db import models


class Proveedor(models.Model):
    idproveedor = models.AutoField(
        db_column="idProveedor",
        primary_key=True
    )
    nombreproveedor = models.CharField(
        db_column="nombreProveedor",
        max_length=150
    )
    nit = models.CharField(
        max_length=10,
        unique=True
    )
    nombrecontacto = models.CharField(
        db_column="nombreContacto",
        max_length=150,
        blank=True,
        null=True
    )
    telefono = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )
    correo = models.EmailField(
        max_length=100,
        blank=True,
        null=True
    )
    direccion = models.CharField(
        max_length=250,
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "PROVEEDOR"

    def __str__(self):
        return self.nombreproveedor
