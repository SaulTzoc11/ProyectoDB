from django.db import models


class Rol(models.Model):
    idrol = models.AutoField(db_column="idRol", primary_key=True)
    nombre = models.CharField(db_column="nombre", max_length=50)

    class Meta:
        managed = False
        db_table = "ROL"

    def __str__(self):
        return self.nombre


class Usuario(models.Model):
    idusuario = models.AutoField(db_column="idUsuario", primary_key=True)
    idrol = models.ForeignKey(Rol, models.DO_NOTHING, db_column="idRol")
    nombreusuario = models.CharField(
        db_column="nombreUsuario", max_length=50, unique=True
    )
    contrasenaencriptada = models.CharField(
        db_column="contrasenaEncriptada", max_length=255
    )
    nombres = models.CharField(db_column="nombres", max_length=100)
    apellidos = models.CharField(db_column="apellidos", max_length=100)
    correo = models.CharField(db_column="correo", max_length=100)
    ultimoacceso = models.DateTimeField(
        db_column="ultimoAcceso", blank=True, null=True
    )
    activo = models.BooleanField(db_column="activo", default=True)
    intentosfallidos = models.PositiveSmallIntegerField(
        db_column="intentosFallidos", default=0
    )
    bloqueadohasta = models.DateTimeField(
        db_column="bloqueadoHasta", blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "USUARIO"

    is_authenticated = True
    is_anonymous = False

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}".strip()

    def __str__(self):
        return self.nombreusuario

class TipoMovimiento(models.Model):
    idtipomovimiento = models.AutoField(
        db_column="idTipoMovimiento", primary_key=True
    )
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(
        max_length=150, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "TIPO_MOVIMIENTO"

    def __str__(self):
        return self.nombre

class Motivo(models.Model):
    idmotivo = models.AutoField(
        db_column="idMotivo", primary_key=True
    )
    descripcion = models.CharField(
        max_length=250, unique=True
    )

    class Meta:
        managed = False
        db_table = "MOTIVO"

    def __str__(self):
        return self.descripcion


class Accion(models.Model):
    idaccion = models.AutoField(
        db_column="idAccion", primary_key=True
    )
    nombre = models.CharField(max_length=30, unique=True)
    descripcion = models.CharField(
        max_length=150, blank=True, null=True
    )

    class Meta:
        managed = False
        db_table = "ACCION"

    def __str__(self):
        return self.nombre


class Tabla(models.Model):
    idtabla = models.AutoField(
        db_column="idTabla", primary_key=True
    )
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        managed = False
        db_table = "TABLA"

    def __str__(self):
        return self.nombre