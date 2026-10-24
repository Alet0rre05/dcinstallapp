"""Reportes de vencimientos y cumplimiento."""
import calendar
from datetime import date
from io import BytesIO

from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Control, Matafuego
from .permissions import TieneRol, filtrar_por_cliente


def _periodo(request):
    hoy = timezone.localdate()
    try:
        anio = int(request.query_params.get("anio", hoy.year))
        mes = int(request.query_params.get("mes", hoy.month))
        if not 2000 <= anio <= 2100 or not 1 <= mes <= 12:
            raise ValueError
    except (TypeError, ValueError):
        raise ValidationError({"periodo": "Indicá un mes (1–12) y año válidos."})
    return date(anio, mes, 1), date(anio, mes, calendar.monthrange(anio, mes)[1])


def _equipos(request):
    qs = filtrar_por_cliente(Matafuego.objects.filter(activo=True).select_related("cliente"), request.user)
    cliente = request.query_params.get("cliente")
    if cliente:
        if not cliente.isdigit():
            raise ValidationError({"cliente": "Valor inválido."})
        qs = qs.filter(cliente_id=int(cliente))
    return qs


class ReporteVencimientosView(APIView):
    permission_classes = [TieneRol]

    def get(self, request):
        inicio, fin = _periodo(request)
        filas = []
        for equipo in _equipos(request):
            for tipo, fecha in (("Carga", equipo.vencimiento_carga), ("PH", equipo.vencimiento_ph)):
                if fecha and inicio <= fecha <= fin:
                    filas.append((fecha, equipo, tipo))
        filas.sort(key=lambda x: (x[0], x[1].cliente.nombre, x[1].numero_serie))
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import landscape, A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        except ImportError:
            return Response({"detail": "Falta instalar reportlab para generar PDF."}, status=503)
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), title="Vencimientos mensuales")
        contenido = [Paragraph(f"Vencimientos por cliente · {inicio:%m/%Y}", getSampleStyleSheet()["Title"]), Spacer(1, 12)]
        datos = [["Fecha", "Cliente", "N° serie", "Tipo", "Ubicación"]]
        datos += [[f.strftime("%d/%m/%Y"), e.cliente.nombre, e.numero_serie, t, e.ubicacion or "—"] for f, e, t in filas]
        if not filas:
            datos.append(["Sin vencimientos en el período", "", "", "", ""])
        tabla = Table(datos, repeatRows=1, colWidths=[75, 180, 110, 60, 250])
        tabla.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#17324d")),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("GRID", (0,0), (-1,-1), .4, colors.HexColor("#ccd5df")),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f2f6fa")]),
            ("FONTSIZE", (0,0), (-1,-1), 9), ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
        contenido.append(tabla)
        doc.build(contenido)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="vencimientos-{inicio:%Y-%m}.pdf"'
        return response


class ReporteCumplimientoView(APIView):
    permission_classes = [TieneRol]

    def get(self, request):
        inicio, fin = _periodo(request)
        equipos = _equipos(request)
        controles = Control.objects.filter(matafuego__in=equipos, fecha__date__gte=inicio, fecha__date__lte=fin)
        por_operario = controles.values("usuario_id", "usuario__username").annotate(controles=Count("id")).order_by("usuario__username")
        return Response({"periodo": inicio.strftime("%Y-%m"), "target": equipos.count(),
                         "controlados": controles.values("matafuego_id").distinct().count(),
                         "controles": controles.count(), "por_operario": list(por_operario)})
