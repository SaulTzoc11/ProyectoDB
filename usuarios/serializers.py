from rest_framework import serializers
from .models import Usuario, Rol, Cliente, Producto

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['idrol', 'nombre']

class UsuarioSerializer(serializers.ModelSerializer):
    # Campo de lectura para mostrar el nombre del rol en el frontend
    rol_nombre = serializers.ReadOnlyField(source='idrol.nombre')
    contrasena = serializers.CharField(write_only=True, required=False,
                                       min_length=8, style={'input_type': 'password'})

    class Meta:
        model = Usuario
        fields = [
            'idusuario', 'idrol', 'rol_nombre', 'nombreusuario',
            'contrasena', 'nombres', 'apellidos',
            'correo', 'ultimoacceso', 'activo'
        ]
        # El hash nunca se expone por la API ni se puede escribir desde afuera.
        read_only_fields = ['idusuario', 'ultimoacceso']
 
    def create(self, validated_data):
        raise NotImplementedError(
            "Los usuarios se crean mediante el procedimiento dbo.sp_Usuario_Crear."
        )
 
    def update(self, instance, validated_data):
        # La contrasena no se actualiza por este camino: se usa el endpoint /api/usuarios/<id>/cambiar-contrasena/
        validated_data.pop('contrasena', None)
        return super().update(instance, validated_data)


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'



class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            'idproducto',
            'idproductogeneral',
            'idpresentacion',
            'idcolor',
            'codigoproducto',
            'codigobarras',
            'activo'
        ]