from django.contrib import admin
from django.db import transaction
from django.db.models import Count
from simple_history.admin import SimpleHistoryAdmin

from .audit import MATAFUEGO_CAMPOS, auditar, snapshot
from .models import Auditoria, Cliente, Control, Matafuego, MensajeChat, Notificacion, Perfil, TicketSoporte
from .models import LegalDocument, LegalAcceptanceLog, RepentanceRequest
from .permissions import puede_borrar_en_admin, puede_cargar_en_admin


class BorradoStaffMixin:
    """Ver y eliminar desde /admin/ solo con Staff status (o superusuario), sin asignar
    permisos de modelo uno por uno. Agregar/editar siguen el permiso normal de Django.
    Nada se borra sin dejar una entrada ELIMINACION en Auditoría (también en la acción masiva)."""

    delete_confirmation_template = "admin/core/borrado_confirmacion.html"
    delete_selected_confirmation_template = "admin/core/borrado_seleccion_confirmacion.html"

    def has_module_permission(self, request):
        return puede_borrar_en_admin(request.user) or super().has_module_permission(request)

    def has_view_permission(self, request, obj=None):
        return puede_borrar_en_admin(request.user) or super().has_view_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return puede_borrar_en_admin(request.user)

    def _eliminar_auditado(self, request, obj):
        raise NotImplementedError

    def delete_model(self, request, obj):
        with transaction.atomic():
            self._eliminar_auditado(request, obj)

    def delete_queryset(self, request, queryset):
        # Nunca QuerySet.delete() directo: se saltearía la auditoría
        with transaction.atomic():
            for obj in queryset:
                self._eliminar_auditado(request, obj)


class AltaEdicionStaffMixin:
    """Agregar y editar desde /admin/ con Staff status (V3.1), sin permisos de modelo uno por uno.
    Solo se aplica a Cliente y Matafuego: el resto de los admin conserva el permiso normal."""

    def has_add_permission(self, request):
        return puede_cargar_en_admin(request.user)

    def has_change_permission(self, request, obj=None):
        return puede_cargar_en_admin(request.user)

    def _auditar_guardado(self, request, obj, antes, despues, cliente_id):
        """Alta -> CREACION; edición -> MODIFICACION. Mismos nombres de acción que la API."""
        accion = "MODIFICACION" if antes is not None else "CREACION"
        auditar(request, accion, self._objeto_auditoria, obj.pk, str(obj),
                cliente_id=cliente_id, antes=antes, despues=despues)

    def save_model(self, request, obj, form, change):
        # Se lee el registro de la base ANTES de guardar: el objeto del formulario ya trae los
        # datos nuevos en memoria, así que no sirve para el "antes".
        with transaction.atomic():
            antes = self._foto(type(obj).objects.get(pk=obj.pk)) if change else None
            super().save_model(request, obj, form, change)
            if not change or form.has_changed():
                self._auditar_guardado(request, obj, antes, self._foto(obj), self._cliente_de(obj))


@admin.register(Cliente)
class ClienteAdmin(AltaEdicionStaffMixin, BorradoStaffMixin, SimpleHistoryAdmin):
    list_display = ("nombre", "planta", "contacto")
    search_fields = ("nombre", "planta")
    _objeto_auditoria = "Cliente"

    @staticmethod
    def _foto(obj):
        return {"nombre": obj.nombre, "contacto": obj.contacto, "planta": obj.planta}

    @staticmethod
    def _cliente_de(obj):
        return obj.pk

    def _eliminar_auditado(self, request, obj):
        pk, nombre = obj.pk, obj.nombre
        antes = {"nombre": nombre, "contacto": obj.contacto, "planta": obj.planta}
        auditar(request, "ELIMINACION", "Cliente", pk, nombre, cliente_id=pk, antes=antes)
        obj.delete()


@admin.register(Perfil)
class PerfilAdmin(SimpleHistoryAdmin):
    list_display = ("user", "rol")
    list_filter = ("rol",)
    filter_horizontal = ("clientes",)
    search_fields = ("user__username", "user__email")


@admin.register(Matafuego)
class MatafuegoAdmin(AltaEdicionStaffMixin, BorradoStaffMixin, SimpleHistoryAdmin):
    list_display = (
        "numero_serie", "cliente", "clase", "marca", "agente", "capacidad",
        "vencimiento_carga", "vencimiento_ph", "activo", "cant_controles",
    )
    list_filter = ("activo", "cliente")
    search_fields = ("numero_serie", "marca")
    readonly_fields = ("token_qr",)
    autocomplete_fields = ("cliente",)
    # Mismo orden que la planilla de extintores (carga manual)
    fields = (
        "cliente", "numero_serie", "ubicacion", "marca", "anio_fabricacion", "clase",
        "agente", "capacidad", "vencimiento_ph", "vencimiento_carga", "activo", "token_qr",
    )
    _objeto_auditoria = "Matafuego"

    @staticmethod
    def _foto(obj):
        return snapshot(obj, MATAFUEGO_CAMPOS)

    @staticmethod
    def _cliente_de(obj):
        return obj.cliente_id

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("cliente").annotate(_controles=Count("controles"))

    @admin.display(description="Controles", ordering="_controles")
    def cant_controles(self, obj):
        """Mientras tenga controles el equipo no se puede borrar: primero se eliminan sus controles."""
        cantidad = getattr(obj, "_controles", None)
        return obj.controles.count() if cantidad is None else cantidad

    def _eliminar_auditado(self, request, obj):
        pk, antes = obj.pk, snapshot(obj, MATAFUEGO_CAMPOS)
        auditar(request, "ELIMINACION", "Matafuego", pk, str(obj), cliente_id=obj.cliente_id, antes=antes)
        obj.delete()


@admin.register(Control)
class ControlAdmin(BorradoStaffMixin, admin.ModelAdmin):
    """El control es inmutable: solo se ve y se elimina (con auditoría), nunca se agrega ni edita."""

    list_display = (
        "cliente", "matafuego", "fecha", "usuario", "presion",
        "precinto", "accesible", "senalizacion",
    )
    list_filter = ("matafuego__cliente", "fecha", "presion")
    search_fields = ("matafuego__numero_serie", "usuario__username")
    date_hierarchy = "fecha"
    list_select_related = ("matafuego", "matafuego__cliente", "usuario")

    @admin.display(description="Cliente", ordering="matafuego__cliente__nombre")
    def cliente(self, obj):
        return obj.matafuego.cliente

    def has_module_permission(self, request):
        return puede_borrar_en_admin(request.user)

    def has_view_permission(self, request, obj=None):
        return puede_borrar_en_admin(request.user) and (obj is None or request.user.is_superuser)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def _eliminar_auditado(self, request, obj):
        obj.eliminar_definitivo(request.user, request)


class MensajeInline(admin.TabularInline):
    model = MensajeChat
    extra = 0
    readonly_fields = ("autor", "es_soporte", "texto", "fecha")
    can_delete = False


@admin.register(TicketSoporte)
class TicketAdmin(SimpleHistoryAdmin):
    list_display = ("id", "titulo", "cliente", "estado", "fecha_creacion")
    list_filter = ("estado",)
    inlines = [MensajeInline]


@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    """Solo lectura."""

    list_display = ("fecha", "usuario_nombre", "rol", "accion", "objeto", "objeto_repr", "ip")
    list_filter = ("accion", "objeto", "rol")
    search_fields = ("usuario_nombre", "objeto_repr", "objeto_id")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("creada", "usuario", "tipo", "titulo", "leida")
    list_filter = ("tipo", "leida")
    search_fields = ("usuario__username", "titulo")


@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = ("document_type", "version", "is_active", "published_at")
    list_filter = ("document_type", "is_active")
    readonly_fields = ("content_sha256",)

    def get_readonly_fields(self, request, obj=None):
        if obj and LegalAcceptanceLog.objects.filter(document=obj).exists():
            return (*self.readonly_fields, "document_type", "version", "content")
        return self.readonly_fields


@admin.register(LegalAcceptanceLog)
class LegalAcceptanceLogAdmin(admin.ModelAdmin):
    list_display = ("accepted_at", "user", "tenant", "document_type", "document_version")
    list_filter = ("document_type", "accepted_at")
    search_fields = ("user__email", "tenant__slug")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RepentanceRequest)
class RepentanceRequestAdmin(admin.ModelAdmin):
    list_display = ("codigo", "email", "empresa", "requested_at", "status")
    list_filter = ("status", "requested_at")
    readonly_fields = ("codigo", "requested_at", "nombre", "empresa", "email", "reason", "tenant")
    search_fields = ("email", "nombre", "empresa")

    def has_add_permission(self, request):
        return False

    def get_search_results(self, request, queryset, search_term):
        if search_term.upper().startswith("ARP-"):
            parts = search_term.strip().upper().split("-")
            if len(parts) == 3 and parts[2].isascii() and parts[2].isdigit() and len(parts[2]) <= 18:
                item = queryset.filter(pk=int(parts[2])).first()
                if item and item.codigo == search_term.strip().upper():
                    return queryset.filter(pk=item.pk), False
        return super().get_search_results(request, queryset, search_term)
