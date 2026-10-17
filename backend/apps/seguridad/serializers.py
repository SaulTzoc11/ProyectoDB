from rest_framework import serializers

from . import passwords
from .models import Rol, Usuario
from . import services


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ["idrol", "nombre"]


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.ReadOnlyField(source="idrol.nombre")
    contrasena = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"},
    )

    class Meta:
        model = Usuario
        fields = [
            "idusuario",
            "idrol",
            "rol_nombre",
            "nombreusuario",
            "contrasena",
            "nombres",
            "apellidos",
            "correo",
            "ultimoacceso",
            "activo",
        ]
        read_only_fields = ["idusuario", "ultimoacceso"]

    def validate_contrasena(self, valor):
        try:
            services.validar_contrasena(valor)
        except services.ContrasenaInvalida as error:
            raise serializers.ValidationError(str(error))
        return valor

    def validate(self, datos):
        if self.instance is None and not datos.get("contrasena"):
            raise serializers.ValidationError(
                {"contrasena": "La contraseña es obligatoria."}
            )
        return datos

    def create(self, validated_data):
        contrasena = validated_data.pop("contrasena")
        return Usuario.objects.create(
            contrasenaencriptada=passwords.cifrar(contrasena),
            **validated_data,
        )

    def update(self, instance, validated_data):
        contrasena = validated_data.pop("contrasena", None)

        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)

        if contrasena:
            instance.contrasenaencriptada = passwords.cifrar(contrasena)

        instance.save()
        return instance


class SesionSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="idusuario")
    username = serializers.CharField(source="nombreusuario")
    name = serializers.CharField(source="nombre_completo")
    role = serializers.CharField(source="idrol.nombre")
