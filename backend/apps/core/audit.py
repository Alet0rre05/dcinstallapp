"""Helper para registrar eventos de auditoría."""
import ipaddress
from datetime import date, datetime
from uuid import UUID

from .models import Auditoria


def ip_de(request):
    if request is None:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")
    try:
        return str(ipaddress.ip_address(ip))
    except (ValueError, TypeError):
        return None


def _json(v):
    if isinstance(v, (datetime, date, UUID)):
        return str(v)
    return v


def snapshot(obj, campos):
    """Foto de los campos relevantes de un objeto (para antes/después)."""
    return {c: _json(getattr(obj, c, None)) for c in campos}


MATAFUEGO_CAMPOS = [
    "cliente_id", "numero_serie", "clase", "ubicacion",
    "vencimiento_carga", "vencimiento_ph", "activo",
]


def auditar(request, accion, objeto, objeto_id="", repr_="", cliente_id=None,
            antes=None, despues=None, usuario=None):
    from .permissions import rol_de  # evita import circular

    user = usuario or (request.user if request is not None and request.user.is_authenticated else None)
    return Auditoria.objects.create(
        usuario=user,
        usuario_nombre=(user.get_username() if user else ""),
        rol=(rol_de(user) or "PUBLICO") if user else "",
        ip=ip_de(request),
        accion=accion,
        objeto=objeto,
        objeto_id=str(objeto_id),
        objeto_repr=str(repr_)[:255],
        cliente_id=cliente_id,
        antes=antes,
        despues=despues,
    )
