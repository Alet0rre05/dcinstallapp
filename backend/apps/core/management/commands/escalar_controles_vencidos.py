"""Notifica a administración/oficina cuando un equipo supera el plazo de control."""
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Max, Q
from django.utils import timezone
from django.core.management.base import BaseCommand

from apps.core.models import Matafuego, Notificacion, Rol


class Command(BaseCommand):
    help = "Escala a administración los matafuegos sin controlar por encima del plazo configurado."

    def handle(self, *args, **options):
        hoy = timezone.localdate()
        corte = timezone.now() - timedelta(days=settings.ESCALADA_CONTROL_DIAS)
        equipos = Matafuego.objects.filter(activo=True).select_related("cliente").annotate(
            ultima_fecha_control=Max("controles__fecha")
        ).filter(Q(ultima_fecha_control__isnull=True, creado__lt=corte) | Q(ultima_fecha_control__lt=corte))
        User = get_user_model()
        cantidad = 0
        for equipo in equipos.iterator():
            ultima = equipo.ultima_fecha_control
            referencia = ultima.isoformat() if ultima else equipo.creado.isoformat()
            clave = f"escalada:{equipo.pk}:{referencia}"[:80]
            supervisores = User.objects.filter(is_active=True).filter(
                Q(is_superuser=True) | Q(perfil__rol=Rol.ADMIN) |
                Q(perfil__rol=Rol.OFICINA, perfil__clientes=equipo.cliente_id)
            ).distinct()
            dias = (hoy - timezone.localtime(ultima).date()).days if ultima else (hoy - timezone.localtime(equipo.creado).date()).days
            for supervisor in supervisores:
                aviso, creado = Notificacion.objects.get_or_create(
                    usuario=supervisor, clave=clave,
                    defaults={
                        "tipo": Notificacion.Tipo.ESCALADA,
                        "titulo": f"Control atrasado: {equipo.numero_serie}"[:80],
                        "mensaje": f"{equipo.cliente.nombre} · {equipo.ubicacion or 'Ubicación sin indicar'} · {dias} días sin control.",
                        "enlace": f"/?cliente={equipo.cliente_id}&equipo={equipo.pk}",
                    },
                )
                if creado:
                    cantidad += 1
                    if supervisor.email and settings.EMAIL_HOST:
                        try:
                            send_mail(
                                f"Control atrasado: matafuego {equipo.numero_serie}",
                                f"El equipo {equipo.numero_serie} de {equipo.cliente.nombre} lleva {dias} días sin control.",
                                settings.DEFAULT_FROM_EMAIL, [supervisor.email], fail_silently=True,
                            )
                        except Exception:
                            pass
        self.stdout.write(self.style.SUCCESS(f"Escaladas creadas: {cantidad}"))
