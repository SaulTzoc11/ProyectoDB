from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Usuario, Rol, Cliente
from .serializers import UsuarioSerializer, RolSerializer, ClienteSerializer

class RolViewSet(viewsets.ReadOnlyModelViewSet):
    """Consulta de roles existentes (Digitador, Cajero, Gerente)"""
    queryset = Rol.objects.all()
    serializer_class = RolSerializer

class UsuarioViewSet(viewsets.ModelViewSet):
    """Gestión completa de usuarios"""
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        # Desactivación lógica para no romper la integridad referencial en SQL Server
        usuario = self.get_object()
        usuario.activo = False
        usuario.save()
        return Response({'mensaje': 'Usuario desactivado exitosamente'}, status=status.HTTP_200_OK)


class ClienteViewSet(viewsets.ModelViewSet):
    """Gestión completa de clientes"""
    queryset = Usuario.objects.all()
    serializer_class = ClienteSerializer

    def get_queryset(self):
        
        return Cliente.objects.filter(activo=True)


        def destroy(self, request, *args, **kwargs):

            cliente = self.get_object()
            cliente.activo = False
            cliente.save(update_fields=['activo'])
            return Response({'mensaje': 'Cliente desactivado exitosamente'}, status=status.HTTP_200_OK)