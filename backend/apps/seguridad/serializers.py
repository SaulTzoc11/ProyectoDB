from rest_framework import serializers

from . import passwords
from .models import Rol, Usuario, TipoMovimiento, Motivo, Accion, Tabla
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


USUARIO_VALIDO = r"^[\w.@+-]+$"


class RegistroSerializer(serializers.Serializer):
    nombreusuario = serializers.RegexField(
        USUARIO_VALIDO,
        min_length=3,
        max_length=50,
        error_messages={
            "invalid": "Use letras, números y los símbolos @ . + - _",
        },
    )
    nombres = serializers.CharField(max_length=100)
    apellidos = serializers.CharField(max_length=100)
    correo = serializers.EmailField(max_length=100)
    contrasena = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    confirmacion = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_nombreusuario(self, valor):
        return valor.strip()

    def validate_correo(self, valor):
        return valor.strip().lower()

    def validate(self, datos):
        if datos["contrasena"] != datos["confirmacion"]:
            raise serializers.ValidationError(
                {"confirmacion": "Las contraseñas no coinciden."}
            )

        try:
            services.validar_contrasena(datos["contrasena"])
        except services.ContrasenaInvalida as error:
            raise serializers.ValidationError(
                {"contrasena": str(error)}
            ) from error

        datos.pop("confirmacion", None)
        return datos


class SesionSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="idusuario")
    username = serializers.CharField(source="nombreusuario")
    name = serializers.CharField(source="nombre_completo")
    role = serializers.CharField(source="idrol.nombre")

class TipoMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoMovimiento
        fields = [
            "idtipomovimiento",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idtipomovimiento"]

class MotivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motivo
        fields = [
            "idmotivo",
            "descripcion",
        ]
        read_only_fields = ["idmotivo"]


class AccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accion
        fields = [
            "idaccion",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["idaccion"]


class TablaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tabla
        fields = [
            "idtabla",
            "nombre",
        ]
        read_only_fields = ["idtabla"]
