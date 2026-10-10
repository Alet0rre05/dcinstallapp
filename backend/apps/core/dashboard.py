"""Dashboard de vencimientos (solo lectura; no agrega modelos ni toca los existentes)."""
from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DIAS_POR_VENCER, Control, Matafuego
from .permissions import TieneRol, filtrar_por_cliente

ESTADOS = ("BORDO", "ROJO", "AMARILLO", "GRIS", "VERDE")  # de más a menos urgente
DIAS_PROXIMOS = 60  # ventana de la tabla "Próximos vencimientos"
MAX_PROXIMOS = 100


def _sumar_meses(hoy, n):
    """(año, mes) de `n` meses después del mes de `hoy`."""
    indice = hoy.year * 12 + (hoy.month - 1) + n
    return indice // 12, indice % 12 + 1


class DashboardVencimientosView(APIView):
    """
    GET /api/dashboard/vencimientos/?meses=6&cliente=<id>

    Solo equipos activos de los clientes del usuario. Una consulta de equipos + una de
    controles (cantidad fija, sin importar cuántos equipos haya).
    """

    permission_classes = [TieneRol]

    def get(self, request):
        hoy = timezone.localdate()

        try:
            meses = int(request.query_params.get("meses", 6))
        except ValueError:
            raise ValidationError({"meses": "Tiene que ser un número entero."})
        meses = max(1, min(meses, 12))

        qs = filtrar_por_cliente(Matafuego.objects.filter(activo=True), request.user)
        cliente = request.query_params.get("cliente")
        if cliente:
            if not cliente.isdigit():
                raise ValidationError({"cliente": "Valor inválido."})
            qs = qs.filter(cliente_id=int(cliente))

        equipos = (
            qs.select_related("cliente")
            .prefetch_related(
                Prefetch(
                    "controles",
                    queryset=Control.objects.only(
                        "id", "matafuego_id", "fecha", "presion",
                        "senalizacion", "chapa_baliza", "accesible",
                    ),
                )
            )
            .order_by("id")
        )

        # Meses del gráfico: el actual y los siguientes (meses en total)
        claves = [_sumar_meses(hoy, i) for i in range(meses)]
        por_mes = {c: {"carga": 0, "ph": 0} for c in claves}
        vencidos_tipo = {"carga": 0, "ph": 0}
        por_estado = dict.fromkeys(ESTADOS, 0)
        total = vencidos = por_vencer = sin_revisar = 0
        proximos = []
        limite_30 = hoy + timedelta(days=DIAS_POR_VENCER)
        limite_proximos = hoy + timedelta(days=DIAS_PROXIMOS)

        for m in equipos:
            total += 1
            por_estado[m.estado_color] += 1
            if not m.revisado_mes:
                sin_revisar += 1
            alguno_vencido = alguno_por_vencer = False
            for tipo, fecha in (("carga", m.vencimiento_carga), ("ph", m.vencimiento_ph)):
                if fecha is None:
                    continue
                if fecha < hoy:
                    vencidos_tipo[tipo] += 1
                    alguno_vencido = True
                else:
                    clave = (fecha.year, fecha.month)
                    if clave in por_mes:
                        por_mes[clave][tipo] += 1
                    if fecha <= limite_30:
                        alguno_por_vencer = True
                if fecha <= limite_proximos:
                    proximos.append((fecha, m, tipo))
            if alguno_vencido:
                vencidos += 1
            elif alguno_por_vencer:
                por_vencer += 1

        proximos.sort(key=lambda t: (t[0], t[1].numero_serie, t[2]))
        filas = [
            {
                "equipo_id": m.id,
                "numero_serie": m.numero_serie,
                "cliente_id": m.cliente_id,
                "cliente_nombre": m.cliente.nombre,
                "ubicacion": m.ubicacion,
                "tipo": tipo,  # "carga" | "ph"
                "fecha": fecha.isoformat(),
                "dias": (fecha - hoy).days,  # negativo = ya vencido
                "estado_color": m.estado_color,
            }
            for fecha, m, tipo in proximos[:MAX_PROXIMOS]
        ]

        return Response({
            "fecha": hoy.isoformat(),
            "totales": {
                "equipos": total,
                "vencidos": vencidos,
                "por_vencer": por_vencer,
                "sin_revisar": sin_revisar,
                "por_estado": por_estado,
            },
            "vencidos_por_tipo": vencidos_tipo,
            "por_mes": [
                {"mes": f"{a:04d}-{mm:02d}", **por_mes[(a, mm)]} for (a, mm) in claves
            ],
            "proximos": filas,
            "proximos_total": len(proximos),
            "dias_proximos": DIAS_PROXIMOS,
        })
