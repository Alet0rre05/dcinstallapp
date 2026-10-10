import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from simple_history.models import HistoricalRecords

User = get_user_model()

DIAS_POR_VENCER = 30
LIMITE_MENSAJES_CLIENTE = 3
LIMITE_MENSAJES_SOPORTE = 10
MAX_CARACTERES_MENSAJE = 3000


# ---------------------------------------------------------------------------
# Cliente y Perfil
# ---------------------------------------------------------------------------
class Cliente(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    contacto = models.CharField(max_length=255, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Rol(models.TextChoices):
    ADMIN = "ADMIN", "Administrador"
    OFICINA = "OFICINA", "Oficina/Editor"
    OPERARIO = "OPERARIO", "Operario de campo"


class Perfil(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="perfil")
    # rol = None  ->  "Público registrado": cuenta sin ningún permiso
    rol = models.CharField(max_length=20, choices=Rol.choices, null=True, blank=True, default=None)
    # Multitenancy: el usuario solo ve datos de estos clientes
    clientes = models.ManyToManyField(Cliente, blank=True, related_name="perfiles")
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.user} ({self.get_rol_display() or 'PÚBLICO'})"

    @property
    def es_soporte(self):
        return self.rol in (Rol.ADMIN, Rol.OFICINA)


@receiver(post_save, sender=User)
def crear_perfil(sender, instance, created, **kwargs):
    if created:
        Perfil.objects.get_or_create(
            user=instance,
            defaults={"rol": Rol.ADMIN if instance.is_superuser else None},
        )


# ---------------------------------------------------------------------------
# Matafuego
# ---------------------------------------------------------------------------
class Matafuego(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="matafuegos")
    numero_serie = models.CharField(max_length=60)
    clase = models.CharField(max_length=30, blank=True)
    ubicacion = models.CharField(max_length=200, blank=True)
    vencimiento_carga = models.DateField(null=True, blank=True)
    vencimiento_ph = models.DateField(null=True, blank=True)
    token_qr = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    activo = models.BooleanField(default=True)  # baja lógica
    creado = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["cliente__nombre", "numero_serie"]
        constraints = [
            models.UniqueConstraint(
                fields=["cliente", "numero_serie"], name="uniq_serie_por_cliente"
            )
        ]

    def __str__(self):
        return f"{self.numero_serie} - {self.cliente}"

    def save(self, *args, **kwargs):
        # token_qr es inmutable: si ya existe en DB, se restaura el original
        if not self._state.adding:
            original = (
                type(self).objects.filter(pk=self.pk).values_list("token_qr", flat=True).first()
            )
            if original and original != self.token_qr:
                self.token_qr = original
        super().save(*args, **kwargs)

    # -- Estado ------------------------------------------------------------
    @property
    def ultimo_control(self):
        # Usa .all() para aprovechar prefetch_related("controles")
        controles = list(self.controles.all())
        if not controles:
            return None
        return max(controles, key=lambda c: (c.fecha, c.pk))

    @property
    def revisado_mes(self):
        """
        True si hay al menos un control cuya fecha (en hora local del proyecto) cae en el
        mes calendario actual. Es un valor calculado, no guardado: el día 1 de cada mes
        pasa solo a False, sin cron ni migraciones. Cuenta cualquier control, aunque
        detecte problemas (el semáforo es quien dice cómo está el equipo).
        Usa .all() para aprovechar prefetch_related("controles").
        """
        hoy = timezone.localdate()
        for c in self.controles.all():
            f = timezone.localtime(c.fecha)
            if f.year == hoy.year and f.month == hoy.month:
                return True
        return False

    def problemas(self):
        """Lista de problemas detectados según el último control y vencimientos."""
        hoy = timezone.localdate()
        control = self.ultimo_control
        problemas = []
        if self.vencimiento_carga and self.vencimiento_carga < hoy:
            problemas.append("Carga vencida")
        if self.vencimiento_ph and self.vencimiento_ph < hoy:
            problemas.append("PH vencida")
        if control:
            if control.presion != Control.Presion.NORMAL:
                problemas.append(f"Presión {control.get_presion_display().lower()}")
            if not control.senalizacion:
                problemas.append("Sin señalización")
            if not control.chapa_baliza:
                problemas.append("Chapa/baliza en mal estado")
            if not control.accesible:
                problemas.append("Inaccesible")
        return problemas

    @property
    def estado_color(self):
        """
        Orden de evaluación:
        GRIS -> BORDO (2+ problemas) -> ROJO (1) -> AMARILLO (<=30 días) -> VERDE
        """
        if (
            self.ultimo_control is None
            or self.vencimiento_carga is None
            or self.vencimiento_ph is None
        ):
            return "GRIS"
        cantidad = len(self.problemas())
        if cantidad >= 2:
            return "BORDO"
        if cantidad == 1:
            return "ROJO"
        limite = timezone.localdate() + timedelta(days=DIAS_POR_VENCER)
        if self.vencimiento_carga <= limite or self.vencimiento_ph <= limite:
            return "AMARILLO"
        return "VERDE"


class Control(models.Model):
    """Inspección inmutable: no se edita ni se borra una vez creada."""

    class Presion(models.TextChoices):
        BAJA = "BAJA", "Baja"
        NORMAL = "NORMAL", "Normal"
        ALTA = "ALTA", "Alta"

    matafuego = models.ForeignKey(Matafuego, on_delete=models.PROTECT, related_name="controles")
    fecha = models.DateTimeField(default=timezone.now)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="controles"
    )
    presion = models.CharField(max_length=10, choices=Presion.choices, default=Presion.NORMAL)
    senalizacion = models.BooleanField(default=True)
    chapa_baliza = models.BooleanField(default=True)  # True = en buen estado
    accesible = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True)
    # Datos opcionales que, si se informan, actualizan al matafuego padre
    ubicacion = models.CharField(max_length=200, blank=True)
    vencimiento_carga = models.DateField(null=True, blank=True)
    vencimiento_ph = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]

    def __str__(self):
        return f"Control {self.matafuego.numero_serie} {self.fecha:%Y-%m-%d}"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise PermissionError("Los controles son inmutables y no pueden modificarse.")
        with transaction.atomic():
            super().save(*args, **kwargs)
            m = self.matafuego
            campos = []
            if self.ubicacion:
                m.ubicacion = self.ubicacion
                campos.append("ubicacion")
            if self.vencimiento_carga:
                m.vencimiento_carga = self.vencimiento_carga
                campos.append("vencimiento_carga")
            if self.vencimiento_ph:
                m.vencimiento_ph = self.vencimiento_ph
                campos.append("vencimiento_ph")
            if campos:
                m.save(update_fields=campos)

    def delete(self, *args, **kwargs):
        raise PermissionError("Los controles son inmutables y no pueden eliminarse.")


# ---------------------------------------------------------------------------
# Soporte: tickets y chat
# ---------------------------------------------------------------------------
class TicketSoporte(models.Model):
    class Estado(models.TextChoices):
        ABIERTO = "ABIERTO", "Abierto"
        CERRADO = "CERRADO", "Cerrado"

    titulo = models.CharField(max_length=32)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="tickets")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="tickets_creados"
    )
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.ABIERTO)
    matafuego = models.ForeignKey(
        Matafuego, null=True, blank=True, on_delete=models.SET_NULL, related_name="tickets"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-fecha_creacion", "-id"]

    def __str__(self):
        return f"#{self.pk} {self.titulo}"


class LimiteMensajesExcedido(Exception):
    pass


class MensajeChat(models.Model):
    ticket = models.ForeignKey(TicketSoporte, on_delete=models.CASCADE, related_name="mensajes")
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="mensajes_chat"
    )
    es_soporte = models.BooleanField(default=False)
    texto = models.TextField(max_length=MAX_CARACTERES_MENSAJE)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha", "id"]

    def __str__(self):
        return f"Mensaje {self.pk} en ticket {self.ticket_id}"

    @staticmethod
    def validar_limite(ticket, es_soporte):
        """
        Cliente final: máx. 3 mensajes seguidos sin respuesta de soporte.
        Soporte: máx. 10 mensajes seguidos sin respuesta del cliente.
        """
        limite = LIMITE_MENSAJES_SOPORTE if es_soporte else LIMITE_MENSAJES_CLIENTE
        ultimos = (
            MensajeChat.objects.filter(ticket=ticket)
            .order_by("-fecha", "-id")
            .values_list("es_soporte", flat=True)[:limite]
        )
        seguidos = 0
        for flag in ultimos:
            if flag == es_soporte:
                seguidos += 1
            else:
                break
        if seguidos >= limite:
            quien = "soporte" if es_soporte else "cliente"
            raise LimiteMensajesExcedido(
                f"Alcanzaste el máximo de {limite} mensajes seguidos ({quien}). "
                "Esperá una respuesta antes de enviar más."
            )


# ---------------------------------------------------------------------------
# Auditoría: quién hizo qué, sobre qué dato y cuándo (inmutable)
# ---------------------------------------------------------------------------
class Auditoria(models.Model):
    fecha = models.DateTimeField(default=timezone.now, db_index=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    usuario_nombre = models.CharField(max_length=150, blank=True)  # copia por si se borra el usuario
    rol = models.CharField(max_length=20, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    accion = models.CharField(max_length=40, db_index=True)
    objeto = models.CharField(max_length=40)
    objeto_id = models.CharField(max_length=40, blank=True)
    objeto_repr = models.CharField(max_length=255, blank=True)
    # Cliente afectado (para aislar la auditoría por cliente); None = evento global
    cliente_id = models.IntegerField(null=True, blank=True, db_index=True)
    antes = models.JSONField(null=True, blank=True)
    despues = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        verbose_name_plural = "auditoría"

    def __str__(self):
        return f"{self.fecha:%d/%m/%Y %H:%M} {self.usuario_nombre} {self.accion} {self.objeto} {self.objeto_id}"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise PermissionError("Los registros de auditoría son inmutables.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Los registros de auditoría no pueden eliminarse.")


# ---------------------------------------------------------------------------
# Notificaciones internas (campana de la app)
# ---------------------------------------------------------------------------
class Notificacion(models.Model):
    """Aviso para un usuario. `clave` evita duplicados (ej. resumen semanal de vencimientos)."""

    class Tipo(models.TextChoices):
        TICKET_MENSAJE = "TICKET_MENSAJE", "Mensaje en un ticket"
        TICKET_CERRADO = "TICKET_CERRADO", "Ticket cerrado"
        TICKET_REABIERTO = "TICKET_REABIERTO", "Ticket reabierto"
        VENCIMIENTOS = "VENCIMIENTOS", "Vencimientos"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notificaciones"
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    titulo = models.CharField(max_length=80)
    mensaje = models.CharField(max_length=255, blank=True)
    enlace = models.CharField(max_length=200, blank=True)  # ruta del front, ej. /tickets
    clave = models.CharField(max_length=80, blank=True)
    leida = models.BooleanField(default=False, db_index=True)
    creada = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-creada", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "clave"],
                condition=~models.Q(clave=""),
                name="uniq_notif_clave_por_usuario",
            )
        ]

    def __str__(self):
        return f"{self.usuario} · {self.titulo}"
