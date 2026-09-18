from rest_framework import serializers
from .models import Usuario, Rol

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['idrol', 'nombre']

class UsuarioSerializer(serializers.ModelSerializer):
    # Campo de lectura para mostrar el nombre del rol en el frontend
    rol_nombre = serializers.ReadOnlyField(source='idrol.nombre')

    class Meta:
        model = Usuario
        fields = [
            'idusuario', 'idrol', 'rol_nombre', 'nombreusuario',
            'contrasenaencriptada', 'nombres', 'apellidos', 
            'correo', 'ultimoacceso', 'activo'
        ]
        extra_kwargs = {
            'contrasenaencriptada': {'write_only': True, 'required': False}
        }