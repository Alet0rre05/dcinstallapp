import hashlib
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from simple_history.models import HistoricalRecords

User = get_user_model()


class Tenant(models.Model):
    """Empresa aislada dentro de la plataforma Jupiter."""
    class Plan(models.TextChoices):
        STARTER = "STARTER", "Starter"
        PROFESSIONAL = "PROFESSIONAL", "Professional"
        ENTERPRISE = "ENTERPRISE", "Enterprise"
    nombre = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    cuit = models.CharField(max_length=13, blank=True)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.STARTER)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class TenantRole(models.TextChoices):
    PLATFORM_SUPERADMIN = "PLATFORM_SUPERADMIN", "Plataforma: dirección"
    PLATFORM_SUPPORT = "PLATFORM_SUPPORT", "Plataforma: soporte"
    TENANT_OWNER = "TENANT_OWNER", "Empresa: propietario"
    TENANT_ADMIN = "TENANT_ADMIN", "Empresa: administrador"
    TENANT_OFFICE = "TENANT_OFFICE", "Empresa: oficina"
    TENANT_OPERATOR = "TENANT_OPERATOR", "Empresa: técnico"
    TENANT_CLIENT = "TENANT_CLIENT", "Empresa: cliente final"


class TenantMembership(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tenant_memberships")
    role = models.CharField(max_length=30, choices=TenantRole.choices)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant", "user"], name="uniq_tenant_membership")]


class KYBVerification(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        APROBADA = "APROBADA", "Aprobada"
        RECHAZADA = "RECHAZADA", "Rechazada"
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="kyb")
    estado = models.CharField(max_length=12, choices=Estado.choices, default=Estado.PENDIENTE)
    documento_url = models.URLField(blank=True)
    revisado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    revisado_at = models.DateTimeField(null=True, blank=True)


class ProviderCredential(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="credentials")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="provider_credentials")
    matricula = models.CharField(max_length=100)
    vence_el = models.DateField(null=True, blank=True)
    verificada = models.BooleanField(default=False)
    documento_url = models.URLField(blank=True)


class BaseAuditModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True


class TenantAwareModel(BaseAuditModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="%(class)ss")
    class Meta:
        abstract = True


class NoTripleRepeatPasswordValidator:
    """Regla Jupiter: 15 caracteres y ningún carácter repetido tres veces seguido."""
    def validate(self, password, user=None):
        if len(password or "") < 15:
            raise ValidationError("La contraseña debe tener al menos 15 caracteres.")
        if any(password[i] == password[i + 1] == password[i + 2] for i in range(len(password) - 2)):
            raise ValidationError("La contraseña no puede contener tres caracteres iguales consecutivos.")
    def get_help_text(self):
        return "Mínimo 15 caracteres y sin tres caracteres consecutivos iguales."

DIAS_POR_VENCER = 30
LIMITE_MENSAJES_CLIENTE = 3
LIMITE_MENSAJES_SOPORTE = 10
MAX_CARACTERES_MENSAJE = 3000


ANIO_FABRICACION_MIN = 1950


def validar_anio_fabricacion(valor):
    """Año de fabricación entre 1950 y el año que viene (equipos recién comprados)."""
    maximo = timezone.localdate().year + 1
    if valor is not None and not ANIO_FABRICACION_MIN <= valor <= maximo:
        raise ValidationError(f"El año de fabricación tiene que estar entre {ANIO_FABRICACION_MIN} y {maximo}.")


# ---------------------------------------------------------------------------
# Cliente y Perfil
# ---------------------------------------------------------------------------
class Cliente(models.Model):
    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.PROTECT, related_name="clientes")
    nombre = models.CharField(max_length=150, unique=True)
    contacto = models.CharField(max_length=255, blank=True)
    # Planta/sede que va en el encabezado de la planilla de extintores (V3.0).
    # Si está vacía se usa el nombre del cliente.
    planta = models.CharField(max_length=200, blank=True)
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
    backup_email = models.EmailField(blank=True)
    privacy_mode = models.BooleanField(default=False)
    detail_view = models.BooleanField(default=False)
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
    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.PROTECT, related_name="matafuegos")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="matafuegos")
    numero_serie = models.CharField(max_length=60)
    clase = models.CharField(max_length=30, blank=True)
    ubicacion = models.CharField(max_length=200, blank=True)
    # Datos de la planilla de extintores (V3.0)
    marca = models.CharField(max_length=60, blank=True)
    anio_fabricacion = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[validar_anio_fabricacion]
    )
    agente = models.CharField(max_length=30, blank=True)  # POLVO, HCFC, CO2, ESPUMA, AGUA…
    capacidad = models.CharField(max_length=20, blank=True)  # ej. "5 KG"
    vencimiento_carga = models.DateField(null=True, blank=True)
    vencimiento_ph = models.DateField(null=True, blank=True)
    token_qr = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    activo = models.BooleanField(default=True)  # baja lógica
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
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
        # El agente extintor se guarda siempre en mayúsculas y sin espacios de más
        self.agente = " ".join((self.agente or "").split()).upper()
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
    # Precinto de seguridad (V3.0). None = sin dato (controles anteriores a la V3.0)
    precinto = models.BooleanField(null=True, blank=True, default=None)
    observaciones = models.TextField(blank=True)
    # Datos opcionales que, si se informan, actualizan al matafuego padre
    ubicacion = models.CharField(max_length=200, blank=True)
    vencimiento_carga = models.DateField(null=True, blank=True)
    vencimiento_ph = models.DateField(null=True, blank=True)
    # Evidencias y clave para sincronizar controles offline sin duplicarlos.
    foto_data = models.TextField(blank=True)
    firma_data = models.TextField(blank=True)
    gps_latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    idempotency_key = models.UUIDField(default=uuid.uuid4, unique=True, null=True, blank=True, editable=False)

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

    def datos_para_auditoria(self):
        """Foto completa del control (para el `antes` de la auditoría de borrado)."""
        m = self.matafuego
        return {
            "matafuego_id": m.pk,
            "matafuego": m.numero_serie,
            "fecha": str(self.fecha),
            "cargado_por": self.usuario.get_username() if self.usuario_id else "",
            "presion": self.presion,
            "precinto": self.precinto,
            "senalizacion": self.senalizacion,
            "chapa_baliza": self.chapa_baliza,
            "accesible": self.accesible,
            "observaciones": self.observaciones,
            "ubicacion": self.ubicacion,
            "vencimiento_carga": str(self.vencimiento_carga) if self.vencimiento_carga else None,
            "vencimiento_ph": str(self.vencimiento_ph) if self.vencimiento_ph else None,
            "foto_adjunto": bool(self.foto_data), "firma_capturada": bool(self.firma_data),
            "gps_latitud": str(self.gps_latitud) if self.gps_latitud is not None else None,
            "gps_longitud": str(self.gps_longitud) if self.gps_longitud is not None else None,
        }

    def eliminar_definitivo(self, usuario, request=None):
        """Única vía para borrar un control (la usa el admin para staff/superusuarios).

        `delete()` sigue bloqueado para que nadie lo borre por accidente desde código.
        Acá se audita Y se borra en una sola transacción: si falla la auditoría no se borra.
        No revierte la ubicación/vencimientos que el control haya copiado al matafuego;
        `ultimo_control`, `revisado_mes` y el semáforo son calculados y se actualizan solos."""
        from .audit import auditar  # evita import circular

        with transaction.atomic():
            m = self.matafuego
            pk = self.pk
            auditar(
                request, "ELIMINACION", "Control", pk, f"Control {m.numero_serie}",
                cliente_id=m.cliente_id, antes=self.datos_para_auditoria(), usuario=usuario,
            )
            models.Model.delete(self)
        return pk


# ---------------------------------------------------------------------------
# Soporte: tickets y chat
# ---------------------------------------------------------------------------
class TicketSoporte(models.Model):
    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.PROTECT, related_name="tickets")
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
    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.PROTECT, related_name="audit_logs")
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
        ESCALADA = "ESCALADA", "Escalada de control"

    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.CASCADE)
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


# ---------------------------------------------------------------------------
# Compliance, identidad y recuperación (Jupiter)
# ---------------------------------------------------------------------------
class LegalDocument(models.Model):
    class Tipo(models.TextChoices):
        PRIVACIDAD = "PRIVACIDAD", "Política de privacidad"
        TOS = "TOS", "Términos de uso"
        EULA = "EULA", "Licencia EULA"
        DPA = "DPA", "Acuerdo de procesamiento de datos"
    document_type = models.CharField(max_length=16, choices=Tipo.choices)
    version = models.CharField(max_length=24)
    content = models.TextField()
    critical = models.BooleanField(default=False)
    published_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    content_sha256 = models.CharField(max_length=64, editable=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["document_type", "version"], name="uniq_legal_document_version")]
        ordering = ["document_type", "-published_at"]

    def save(self, *args, **kwargs):
        self.content_sha256 = hashlib.sha256(self.content.encode("utf-8")).hexdigest()
        super().save(*args, **kwargs)


class LegalAcceptanceLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="legal_acceptances")
    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.PROTECT, related_name="legal_acceptances")
    document = models.ForeignKey(LegalDocument, on_delete=models.PROTECT)
    document_type = models.CharField(max_length=16)
    document_version = models.CharField(max_length=24)
    accepted_at = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    content_sha256 = models.CharField(max_length=64)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "tenant", "document"], name="uniq_legal_acceptance")]


class RepentanceRequest(models.Model):
    nombre = models.CharField(max_length=150, blank=True)
    empresa = models.CharField(max_length=160, blank=True)

    @property
    def codigo(self):
        fecha = timezone.localtime(self.requested_at).date()
        return f"ARP-{fecha:%Y%m%d}-{self.pk:06d}"

    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.SET_NULL, related_name="repentance_requests")
    email = models.EmailField()
    reason = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    scheduled_deletion_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default="RECIBIDA")


class OTPCode(models.Model):
    """Nunca guarda el código en claro; sirve para alta, recuperación y correo de respaldo."""
    PURPOSES = (("VERIFY", "Verificación"), ("RESET", "Recuperación"), ("EMAIL", "Email"), ("BACKUP", "Respaldo"))
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name="otp_codes")
    email = models.EmailField()
    purpose = models.CharField(max_length=10, choices=PURPOSES)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def issue(cls, *, email, purpose, user=None):
        code = f"{secrets.randbelow(1_000_000):06d}"
        row = cls.objects.create(user=user, email=email.lower(), purpose=purpose,
            code_hash=hashlib.sha256(code.encode()).hexdigest(), expires_at=timezone.now() + timedelta(minutes=10))
        return row, code

    def verify(self, code):
        if self.consumed_at or self.attempts >= 5 or timezone.now() > self.expires_at:
            return False
        self.attempts += 1
        ok = secrets.compare_digest(self.code_hash, hashlib.sha256(str(code).encode()).hexdigest())
        if ok: self.consumed_at = timezone.now()
        self.save(update_fields=["attempts", "consumed_at"])
        return ok



