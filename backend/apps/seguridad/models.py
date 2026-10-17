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
