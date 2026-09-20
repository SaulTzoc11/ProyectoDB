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


class TipoCliente(models.Model):
    idtipocliente = models.AutoField(primary_key=True, db_column='idTipoCliente')
    nombre = models.CharField(max_length=50, db_column='nombre') 

    class Meta:
        managed = False
        db_table = 'TIPO_CLIENTE'



class Cliente(models.Model):
    idcliente = models.AutoField(primary_key=True, db_column='idCliente') 
    idtipocliente = models.IntegerField(db_column='idTipoCliente', default=1) 
    nombrecliente = models.CharField(max_length=100, db_column='nombreCliente') 
    nit = models.CharField(max_length=20, db_column='nit', null=True, blank=True) 
    telefono = models.CharField(max_length=20, db_column='telefono', null=True, blank=True) 
    correo = models.EmailField(max_length=100, db_column='correo', null=True, blank=True) 
    direccion = models.CharField(max_length=200, db_column='direccion', null=True, blank=True) 
    nombrecontacto = models.CharField(max_length=100, db_column='nombreContacto', null=True, blank=True)
    activo = models.BooleanField(default=True, db_column='activo') #[cite: 5]

    class Meta:
        managed = False
        db_table = 'CLIENTE'

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"



class Producto(models.Model):
    idproducto = models.AutoField(primary_key=True, db_column='idProducto') #[cite: 7]
    idproductogeneral = models.IntegerField(db_column='idProductoGeneral', null=True, blank=True) # O ForeignKey si tienes el modelo de ProductoGeneral[cite: 7]
    idpresentacion = models.IntegerField(db_column='idPresentacion', null=True, blank=True) # O ForeignKey a Presentacion[cite: 7]
    idcolor = models.IntegerField(db_column='idColor', null=True, blank=True) # O ForeignKey a Color[cite: 7]
    codigoproducto = models.CharField(max_length=50, db_column='codigoProducto', null=True, blank=True) #[cite: 7]
    codigobarras = models.CharField(max_length=50, db_column='codigoBarras', null=True, blank=True) #[cite: 7]
    activo = models.BooleanField(default=True, db_column='activo') #[cite: 7]

    class Meta:
        managed = False
        db_table = 'PRODUCTO'