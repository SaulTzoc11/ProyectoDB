from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import serializers
from django.db import connection

from .models import (
    Usuario,
    Rol,
    Categoria,
    Marca,
    Presentacion,
    Color,
    TipoPrecio,
    Estado,
    ProductoGeneral,
    Producto,
    Precio,
    TipoCliente,
    Cliente,
    Proveedor,
)
class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['idrol', 'nombre']


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.ReadOnlyField(source='idrol.nombre')

    contrasena = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        style={'input_type': 'password'}
    )

    class Meta:
        model = Usuario
        fields = [
            'idusuario',
            'idrol',
            'rol_nombre',
            'nombreusuario',
            'contrasena',
            'nombres',
            'apellidos',
            'correo',
            'ultimoacceso',
            'activo'
        ]

        read_only_fields = ['idusuario', 'ultimoacceso']

    def validate(self, datos):
        # Al crear un usuario, la contraseña es obligatoria.
        if self.instance is None and not datos.get('contrasena'):
            raise serializers.ValidationError({
                'contrasena': 'La contraseña es obligatoria.'
            })

        return datos

    def create(self, validated_data):
        contrasena_original = validated_data.pop('contrasena')

        # La contraseña se convierte en hash antes de guardarse.
        contrasena_hash = make_password(contrasena_original)

        usuario = Usuario.objects.create(
            contrasenaencriptada=contrasena_hash,
            **validated_data
        )

        return usuario

    def update(self, instance, validated_data):
        contrasena_nueva = validated_data.pop('contrasena', None)

        # Actualiza los demás campos.
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)

        # Solo cambia la contraseña si se recibió una nueva.
        if contrasena_nueva:
            instance.contrasenaencriptada = make_password(contrasena_nueva)

        instance.save()
        return instance


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = [
            "idcategoria",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idcategoria"]


class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = [
            "idmarca",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idmarca"]


class PresentacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Presentacion
        fields = [
            "idpresentacion",
            "nombre",
            "cantidad",
            "unidadmedida",
        ]
        read_only_fields = ["idpresentacion"]

    def validate_cantidad(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(
                "La cantidad debe ser mayor que cero."
            )

        return valor


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = [
            "idcolor",
            "nombre",
            "codigohex",
            "activo",
        ]
        read_only_fields = ["idcolor"]

    def validate_codigohex(self, valor):
        if not valor:
            return valor

        valor = valor.upper()

        if len(valor) != 7 or not valor.startswith("#"):
            raise serializers.ValidationError(
                "El color debe tener el formato #FFFFFF."
            )

        try:
            int(valor[1:], 16)
        except ValueError:
            raise serializers.ValidationError(
                "El código hexadecimal no es válido."
            )

        return valor


class TipoPrecioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPrecio
        fields = [
            "idtipoprecio",
            "nombre",
            "descripcion",
            "activo",
        ]
        read_only_fields = ["idtipoprecio"]


class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estado
        fields = [
            "idestado",
            "nombre",
        ]
        read_only_fields = ["idestado"]


class ProductoGeneralSerializer(serializers.ModelSerializer):
    marca_nombre = serializers.ReadOnlyField(
        source="idmarca.nombre"
    )
    categoria_nombre = serializers.ReadOnlyField(
        source="idcategoria.nombre"
    )

    class Meta:
        model = ProductoGeneral
        fields = [
            "idproductogeneral",
            "idmarca",
            "marca_nombre",
            "idcategoria",
            "categoria_nombre",
            "nombre",
            "descripcion",
            "activo",
        ]
        read_only_fields = ["idproductogeneral"]


class ProductoSerializer(serializers.ModelSerializer):
    producto_general_nombre = serializers.ReadOnlyField(
        source="idproductogeneral.nombre"
    )

    producto_descripcion = serializers.ReadOnlyField(
        source="idproductogeneral.descripcion"
    )

    marca_nombre = serializers.ReadOnlyField(
        source="idproductogeneral.idmarca.nombre"
    )

    categoria_nombre = serializers.ReadOnlyField(
        source="idproductogeneral.idcategoria.nombre"
    )

    presentacion_nombre = serializers.ReadOnlyField(
        source="idpresentacion.nombre"
    )

    presentacion_cantidad = serializers.ReadOnlyField(
        source="idpresentacion.cantidad"
    )

    unidad_medida = serializers.ReadOnlyField(
        source="idpresentacion.unidadmedida"
    )

    color_nombre = serializers.SerializerMethodField()
    color_codigohex = serializers.SerializerMethodField()
    precios = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    ubicaciones = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            "idproducto",
            "idproductogeneral",
            "producto_general_nombre",
            "producto_descripcion",
            "marca_nombre",
            "categoria_nombre",
            "idpresentacion",
            "presentacion_nombre",
            "presentacion_cantidad",
            "unidad_medida",
            "idcolor",
            "color_nombre",
            "color_codigohex",
            "codigoproducto",
            "codigobarras",
            "activo",
            "precios",
            "stock",
            "ubicaciones",
        ]

        read_only_fields = ["idproducto"]

    def get_color_nombre(self, producto):
        if producto.idcolor:
            return producto.idcolor.nombre

        return "Sin color"

    def get_color_codigohex(self, producto):
        if producto.idcolor and producto.idcolor.codigohex:
            return producto.idcolor.codigohex

        return "#027DD6"

    def get_precios(self, producto):
        precios = Precio.objects.filter(
            idproducto=producto,
            idestado__nombre__iexact="Vigente"
        ).select_related(
            "idtipoprecio",
            "idestado"
        ).order_by("idtipoprecio__nombre")

        return [
            {
                "idprecio": precio.idprecio,
                "tipo": precio.idtipoprecio.nombre,
                "valor": float(precio.precio),
                "estado": precio.idestado.nombre,
            }
            for precio in precios
        ]

    def obtener_inventario(self, producto):
            if hasattr(producto, "_inventario_cache"):
                return producto._inventario_cache

            consulta = """
                SELECT
                    B.nombre,
                    E.codigoEstante,
                    SUM(L.cantidadDisponible)
                FROM LOTE AS L
                INNER JOIN ESTANTE AS E
                    ON L.idEstante = E.idEstante
                INNER JOIN BODEGA AS B
                    ON E.idBodega = B.idBodega
                INNER JOIN DETALLE_ENTREGA AS DE
                    ON L.idDetalleEntrega = DE.idDetalleEntrega
                INNER JOIN DETALLE_COMPRA AS DC
                    ON DE.idDetalleCompra = DC.idDetalleCompra
                WHERE DC.idProducto = %s
                AND B.activo = 1
                AND E.activo = 1
                AND L.cantidadDisponible > 0
                GROUP BY
                    B.nombre,
                    E.codigoEstante
                ORDER BY
                    B.nombre,
                    E.codigoEstante
            """

            with connection.cursor() as cursor:
                cursor.execute(
                    consulta,
                    [producto.idproducto]
                )
                filas = cursor.fetchall()

            ubicaciones = [
                {
                    "bodega": fila[0],
                    "estante": fila[1],
                    "cantidad": fila[2],
                }
                for fila in filas
            ]

            inventario = {
                "stock": sum(
                    ubicacion["cantidad"]
                    for ubicacion in ubicaciones
                ),
                "ubicaciones": ubicaciones,
            }

            producto._inventario_cache = inventario
            return inventario

    def get_stock(self, producto):
        return self.obtener_inventario(producto)["stock"]

    def get_ubicaciones(self, producto):
        return self.obtener_inventario(producto)["ubicaciones"]
    
class PrecioSerializer(serializers.ModelSerializer):
    tipo_precio_nombre = serializers.ReadOnlyField(
        source="idtipoprecio.nombre"
    )
    producto_nombre = serializers.ReadOnlyField(
        source="idproducto.idproductogeneral.nombre"
    )
    estado_nombre = serializers.ReadOnlyField(
        source="idestado.nombre"
    )

    class Meta:
        model = Precio
        fields = [
            "idprecio",
            "idtipoprecio",
            "tipo_precio_nombre",
            "idproducto",
            "producto_nombre",
            "idestado",
            "estado_nombre",
            "precio",
            "fechaasignacion",
        ]
        read_only_fields = [
            "idprecio",
            "fechaasignacion",
        ]

    def validate_precio(self, valor):
        if valor <= 0:
            raise serializers.ValidationError(
                "El precio debe ser mayor que cero."
            )

        return valor

    def create(self, validated_data):
        validated_data["fechaasignacion"] = timezone.now()
        return super().create(validated_data)


class TipoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCliente
        fields = [
            "idtipocliente",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idtipocliente"]


class ClienteSerializer(serializers.ModelSerializer):
    tipo_cliente_nombre = serializers.ReadOnlyField(
        source="idtipocliente.nombre"
    )

    class Meta:
        model = Cliente
        fields = [
            "idcliente",
            "idtipocliente",
            "tipo_cliente_nombre",
            "nombrecliente",
            "nit",
            "telefono",
            "correo",
            "direccion",
            "nombrecontacto",
            "activo",
        ]
        read_only_fields = ["idcliente"]

    def validate_nit(self, valor):
        valor = valor.strip()

        if not valor:
            raise serializers.ValidationError(
                "El NIT es obligatorio."
            )

        return valor


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = [
            "idproveedor",
            "nombreproveedor",
            "nit",
            "nombrecontacto",
            "telefono",
            "correo",
            "direccion",
            "activo",
        ]
        read_only_fields = ["idproveedor"]

    def validate_nit(self, valor):
        valor = valor.strip()

        if not valor:
            raise serializers.ValidationError(
                "El NIT es obligatorio."
            )

        return valor