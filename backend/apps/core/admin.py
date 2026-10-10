from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import Auditoria, Cliente, Control, Matafuego, MensajeChat, Notificacion, Perfil, TicketSoporte


@admin.register(Cliente)
class ClienteAdmin(SimpleHistoryAdmin):
    list_display = ("nombre", "contacto")
    search_fields = ("nombre",)


@admin.register(Perfil)
class PerfilAdmin(SimpleHistoryAdmin):
    list_display = ("user", "rol")
    list_filter = ("rol",)
    filter_horizontal = ("clientes",)
    search_fields = ("user__username", "user__email")


@admin.register(Matafuego)
class MatafuegoAdmin(SimpleHistoryAdmin):
    list_display = ("numero_serie", "cliente", "clase", "vencimiento_carga", "vencimiento_ph", "activo")
    list_filter = ("activo", "cliente")
    search_fields = ("numero_serie",)
    readonly_fields = ("token_qr",)


@admin.register(Control)
class ControlAdmin(admin.ModelAdmin):
    """Solo lectura: los controles son inmutables."""

    list_display = ("matafuego", "fecha", "usuario", "presion", "accesible")

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


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
