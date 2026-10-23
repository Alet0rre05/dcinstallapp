"""
Notificaciones internas (campana de la app). Desacopladas: las vistas existentes solo llaman a
`notificar_ticket(...)`; las de vencimientos se generan solas al consultar (una por cliente por
semana, sin duplicados gracias a `clave`).

No es push del navegador: el front consulta el contador cada tanto y vibra al llegar algo nuevo.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DIAS_POR_VENCER, Matafuego, Notificacion, Rol
from .permissions import TieneRol, filtrar_por_cliente, rol_de

User = get_user_model()
MAX_LISTA = 50
SYNC_SEGUNDOS = 6 * 3600


# ---------------------------------------------------------------------------
# Generación
# ---------------------------------------------------------------------------
def _staff_del_cliente(cliente_id):
    """ADMIN (ven todo) y OFICINA con ese cliente asignado."""
    return User.objects.filter(is_active=True).filter(
        Q(is_superuser=True)
        | Q(perfil__rol=Rol.ADMIN)
        | Q(perfil__rol=Rol.OFICINA, perfil__clientes=cliente_id)
    ).distinct()


def notificar_ticket(ticket, actor, tipo, titulo, mensaje=""):
    """Avisa "al otro lado" del ticket: si actúa soporte, a quien lo abrió; si no, al
    soporte del cliente. Nunca se notifica a quien hizo la acción."""
    if rol_de(actor) in (Rol.ADMIN, Rol.OFICINA):
        destinatarios = [ticket.creado_por]
    else:
        destinatarios = list(_staff_del_cliente(ticket.cliente_id))
    vistos = set()
    nuevas = []
    for u in destinatarios:
        if u.pk == actor.pk or u.pk in vistos:
            continue
        vistos.add(u.pk)
        nuevas.append(Notificacion(
            usuario=u, tipo=tipo, titulo=titulo[:80], mensaje=mensaje[:255], enlace="/tickets",
        ))
    if nuevas:
        Notificacion.objects.bulk_create(nuevas)


def sincronizar_vencimientos(user, forzar=False):
    """Crea (si faltan) los avisos semanales de vencimientos de los clientes del usuario."""
    if not forzar and not cache.add(f"notif-sync:{user.pk}", 1, SYNC_SEGUNDOS):
        return
    hoy = timezone.localdate()
    limite = hoy + timedelta(days=DIAS_POR_VENCER)
    semana = hoy.isocalendar()
    resumen = {}  # cliente_id -> [nombre, vencidos, por_vencer]
    filas = (
        filtrar_por_cliente(Matafuego.objects.filter(activo=True), user)
        .order_by()
        .values_list("cliente_id", "cliente__nombre", "vencimiento_carga", "vencimiento_ph")
    )
    for cid, nombre, carga, ph in filas:
        fechas = [f for f in (carga, ph) if f is not None]
        r = resumen.setdefault(cid, [nombre, 0, 0])
        if any(f < hoy for f in fechas):
            r[1] += 1
        elif any(f <= limite for f in fechas):
            r[2] += 1
    nuevas = []
    for cid, (nombre, vencidos, por_vencer) in resumen.items():
        if vencidos + por_vencer == 0:
            continue
        partes = []
        if vencidos:
            partes.append(f"{vencidos} vencido{'s' if vencidos != 1 else ''}")
        if por_vencer:
            partes.append(f"{por_vencer} por vencer")
        nuevas.append(Notificacion(
            usuario=user,
            tipo=Notificacion.Tipo.VENCIMIENTOS,
            titulo=f"Vencimientos: {nombre}"[:80],
            mensaje=" y ".join(partes) + f" (próximos {DIAS_POR_VENCER} días).",
            enlace=f"/dashboard?cliente={cid}",
            clave=f"venc:{cid}:{semana[0]}-W{semana[1]:02d}",
        ))
    if nuevas:
        Notificacion.objects.bulk_create(nuevas, ignore_conflicts=True)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ["id", "tipo", "titulo", "mensaje", "enlace", "leida", "creada"]
        read_only_fields = fields


class NotificacionListView(APIView):
    """GET /api/notificaciones/ -> {"no_leidas": n, "results": [...]} (las últimas 50)."""

    permission_classes = [TieneRol]

    def get(self, request):
        sincronizar_vencimientos(request.user)
        propias = Notificacion.objects.filter(usuario=request.user)
        no_leidas = propias.filter(leida=False).count()
        qs = propias.filter(leida=False) if request.query_params.get("solo_no_leidas") in ("1", "true") else propias
        return Response({
            "no_leidas": no_leidas,
            "results": NotificacionSerializer(qs[:MAX_LISTA], many=True).data,
        })


class NotificacionContadorView(APIView):
    """GET /api/notificaciones/contador/ -> {"no_leidas": n}. Liviano: se consulta seguido."""

    permission_classes = [TieneRol]

    def get(self, request):
        sincronizar_vencimientos(request.user)
        n = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        return Response({"no_leidas": n})


class NotificacionLeerView(APIView):
    """POST /api/notificaciones/leer/  {"ids": [1, 2]}  o  {"todas": true}"""

    permission_classes = [TieneRol]

    def post(self, request):
        propias = Notificacion.objects.filter(usuario=request.user, leida=False)
        datos = request.data if isinstance(request.data, dict) else {}
        ids = datos.get("ids")
        if datos.get("todas") is True:
            propias.update(leida=True)
        elif isinstance(ids, list) and all(isinstance(i, int) and not isinstance(i, bool) for i in ids):
            propias.filter(pk__in=ids).update(leida=True)
        else:
            raise ValidationError({"ids": "Enviá una lista de ids o todas=true."})
        n = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        return Response({"no_leidas": n})
