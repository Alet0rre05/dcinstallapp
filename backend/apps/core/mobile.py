"""Datos compactos para preparar el trabajo offline del usuario autenticado."""
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cliente, Control, Matafuego
from .permissions import TieneRol, clientes_ids
from .serializers import ClienteSerializer, ControlSerializer, MatafuegoSerializer


class MobileOfflineDatasetView(APIView):
    permission_classes = [TieneRol]

    def get(self, request):
        ids = clientes_ids(request.user)
        clientes = Cliente.objects.all() if ids is None else Cliente.objects.filter(id__in=ids)
        equipos = Matafuego.objects.filter(activo=True).select_related("cliente").prefetch_related("controles")
        if ids is not None:
            equipos = equipos.filter(cliente_id__in=ids)
        controles = Control.objects.filter(matafuego__in=equipos).select_related("usuario", "matafuego").order_by("matafuego_id", "-fecha")
        return Response({
            "descargado": timezone.now(),
            "usuario_id": request.user.pk,
            "clientes": ClienteSerializer(clientes, many=True).data,
            "equipos": MatafuegoSerializer(equipos.order_by("cliente__nombre", "numero_serie"), many=True).data,
            "controles": ControlSerializer(controles, many=True, context={"request": request}).data,
        })
