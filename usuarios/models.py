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


class Categoria(models.Model):
    idcategoria = models.AutoField(
        db_column="idCategoria",
        primary_key=True
    )
    nombre = models.CharField(
        max_length=50,
        unique=True
    )
    descripcion = models.CharField(
        max_length=250,
        blank=True,
        null=True
    )

    class Meta:
        managed = False
        db_table = "CATEGORIA"

    def __str__(self):
        return self.nombre


class Marca(models.Model):
    idmarca = models.AutoField(
        db_column="idMarca",
        primary_key=True
    )
    nombre = models.CharField(
        max_length=50,
        unique=True
    )
    descripcion = models.CharField(
        max_length=250,
        blank=True,
        null=True
    )

    class Meta:
        managed = False
        db_table = "MARCA"

    def __str__(self):
        return self.nombre


class Presentacion(models.Model):
    idpresentacion = models.AutoField(
        db_column="idPresentacion",
        primary_key=True
    )
    nombre = models.CharField(
        max_length=50,
        unique=True
    )
    cantidad = models.DecimalField(
        max_digits=6,
        decimal_places=4
    )
    unidadmedida = models.CharField(
        db_column="unidadMedida",
        max_length=20
    )

    class Meta:
        managed = False
        db_table = "PRESENTACION"

    def __str__(self):
        return self.nombre


class Color(models.Model):
    idcolor = models.AutoField(
        db_column="idColor",
        primary_key=True
    )
    nombre = models.CharField(
        max_length=50,
        unique=True
    )
    codigohex = models.CharField(
        db_column="codigoHex",
        max_length=7,
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "COLOR"

    def __str__(self):
        return self.nombre


class TipoPrecio(models.Model):
    idtipoprecio = models.AutoField(
        db_column="idTipoPrecio",
        primary_key=True
    )
    nombre = models.CharField(
        max_length=50,
        unique=True
    )
    descripcion = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "TIPO_PRECIO"

    def __str__(self):
        return self.nombre


class Estado(models.Model):
    idestado = models.AutoField(
        db_column="idEstado",
        primary_key=True
    )
    nombre = models.CharField(
        max_length=50,
        unique=True
    )

    class Meta:
        managed = False
        db_table = "ESTADO"

    def __str__(self):
        return self.nombre


class ProductoGeneral(models.Model):
    idproductogeneral = models.AutoField(
        db_column="idProductoGeneral",
        primary_key=True
    )
    idmarca = models.ForeignKey(
        Marca,
        models.DO_NOTHING,
        db_column="idMarca"
    )
    idcategoria = models.ForeignKey(
        Categoria,
        models.DO_NOTHING,
        db_column="idCategoria"
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(
        max_length=250,
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "PRODUCTO_GENERAL"

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    idproducto = models.AutoField(
        db_column="idProducto",
        primary_key=True
    )
    idproductogeneral = models.ForeignKey(
        ProductoGeneral,
        models.DO_NOTHING,
        db_column="idProductoGeneral"
    )
    idpresentacion = models.ForeignKey(
        Presentacion,
        models.DO_NOTHING,
        db_column="idPresentacion"
    )
    idcolor = models.ForeignKey(
        Color,
        models.DO_NOTHING,
        db_column="idColor",
        blank=True,
        null=True
    )
    codigoproducto = models.CharField(
        db_column="codigoProducto",
        max_length=50,
        unique=True
    )
    codigobarras = models.CharField(
        db_column="codigoBarras",
        max_length=50,
        unique=True,
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "PRODUCTO"
        unique_together = (
            (
                "idproductogeneral",
                "idpresentacion",
                "idcolor"
            ),
        )

    def __str__(self):
        texto = (
            f"{self.idproductogeneral} - "
            f"{self.idpresentacion}"
        )

        if self.idcolor:
            texto += f" - {self.idcolor}"

        return texto


class Precio(models.Model):
    idprecio = models.AutoField(
        db_column="idPrecio",
        primary_key=True
    )
    idtipoprecio = models.ForeignKey(
        TipoPrecio,
        models.DO_NOTHING,
        db_column="idTipoPrecio"
    )
    idproducto = models.ForeignKey(
        Producto,
        models.DO_NOTHING,
        db_column="idProducto"
    )
    idestado = models.ForeignKey(
        Estado,
        models.DO_NOTHING,
        db_column="idEstado"
    )
    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    fechaasignacion = models.DateTimeField(
        db_column="fechaAsignacion"
    )

    class Meta:
        managed = False
        db_table = "PRECIO"

    def __str__(self):
        return f"{self.idproducto} - Q{self.precio}"


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