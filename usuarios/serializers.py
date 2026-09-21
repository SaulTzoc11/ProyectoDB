from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from .models import Usuario, Rol, Cliente, Producto


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