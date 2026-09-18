from django.db import models

class Rol(models.Model):
    idrol = models.AutoField(db_column='idRol', primary_key=True)
    nombre = models.CharField(db_column='nombre', max_length=50)

    class Meta:
        managed = False
        db_table = 'ROL'

    def __str__(self):
        return self.nombre

class Usuario(models.Model):
    idusuario = models.AutoField(db_column='idUsuario', primary_key=True)
    idrol = models.ForeignKey(Rol, models.DO_NOTHING, db_column='idRol')
    nombreusuario = models.CharField(db_column='nombreUsuario', max_length=50, unique=True)
    contrasenaencriptada = models.CharField(db_column='contrasenaEncriptada', max_length=255)
    nombres = models.CharField(db_column='nombres', max_length=100)
    apellidos = models.CharField(db_column='apellidos', max_length=100)
    correo = models.CharField(db_column='correo', max_length=100)
    ultimoacceso = models.DateTimeField(db_column='ultimoAcceso', blank=True, null=True)
    activo = models.BooleanField(db_column='activo', default=True)

    class Meta:
        managed = False
        db_table = 'USUARIO'

    def __str__(self):
        return self.nombreusuario