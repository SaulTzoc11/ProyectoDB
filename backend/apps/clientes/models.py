from django.db import models


class TipoCliente(models.Model):
    idtipocliente = models.AutoField(
        db_column="idTipoCliente",
        primary_key=True
    )
    nombre = models.CharField(
        max_length=20,
        unique=True
    )
    descripcion = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    class Meta:
        managed = False
        db_table = "TIPO_CLIENTE"

    def __str__(self):
        return self.nombre


class Cliente(models.Model):
    idcliente = models.AutoField(
        db_column="idCliente",
        primary_key=True
    )
    idtipocliente = models.ForeignKey(
        TipoCliente,
        models.DO_NOTHING,
        db_column="idTipoCliente"
    )
    nombrecliente = models.CharField(
        db_column="nombreCliente",
        max_length=150
    )
    nit = models.CharField(
        max_length=10,
        unique=True
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
    nombrecontacto = models.CharField(
        db_column="nombreContacto",
        max_length=150,
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "CLIENTE"

    def __str__(self):
        return self.nombrecliente
