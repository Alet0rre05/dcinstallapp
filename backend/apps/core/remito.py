"""Arma los datos del remito de un ticket cerrado y genera el PDF (ver remito_pdf.py)."""
from django.utils import timezone

from . import remito_pdf
from .models import TicketSoporte

MAX_MENSAJES = 40
MAX_CARACTERES = 600


def _fecha(dt):
    return timezone.localtime(dt).strftime("%d/%m/%Y %H:%M") if dt else "—"


def numero_remito(ticket):
    return f"R-{ticket.pk:06d}"


def datos_remito(ticket):
    """Dict para `generar_remito_pdf`. El cierre sale del historial (django-simple-history),
    así que no hace falta un campo nuevo en el ticket."""
    cierre = (
        ticket.history.filter(estado=TicketSoporte.Estado.CERRADO)
        .select_related("history_user")
        .order_by("-history_date", "-history_id")
        .first()
    )
    cerrado_por = "—"
    if cierre is not None and cierre.history_user is not None:
        cerrado_por = cierre.history_user.get_username()

    todos = list(ticket.mensajes.select_related("autor").order_by("fecha", "id"))
    omitidos = max(0, len(todos) - MAX_MENSAJES)
    mensajes = []
    for m in todos[omitidos:]:  # los más recientes
        texto = m.texto if len(m.texto) <= MAX_CARACTERES else m.texto[:MAX_CARACTERES].rstrip() + "…"
        mensajes.append({
            "autor": m.autor.get_username(),
            "soporte": m.es_soporte,
            "fecha": _fecha(m.fecha),
            "texto": texto,
        })

    equipo = None
    if ticket.matafuego_id:
        mata = ticket.matafuego
        equipo = {"serie": mata.numero_serie, "clase": mata.clase, "ubicacion": mata.ubicacion}

    return {
        "numero": numero_remito(ticket),
        "emitido": _fecha(timezone.now()),
        "cliente": ticket.cliente.nombre,
        "titulo": ticket.titulo,
        "equipo": equipo,
        "creado_por": ticket.creado_por.get_username(),
        "fecha_creacion": _fecha(ticket.fecha_creacion),
        "fecha_cierre": _fecha(cierre.history_date) if cierre is not None else "—",
        "cerrado_por": cerrado_por,
        "mensajes": mensajes,
        "mensajes_omitidos": omitidos,
    }


def generar_para_ticket(ticket):
    return remito_pdf.generar_remito_pdf(datos_remito(ticket))
