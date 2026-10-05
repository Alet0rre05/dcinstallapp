from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Rol


def rol_de(user):
    """Devuelve ADMIN/OFICINA/OPERARIO, o None (= público registrado / anónimo)."""
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return Rol.ADMIN
    perfil = getattr(user, "perfil", None)
    return perfil.rol if perfil and perfil.rol else None


def clientes_ids(user):
    """None = acceso a todos los clientes (ADMIN); si no, lista de IDs asignados."""
    rol = rol_de(user)
    if rol == Rol.ADMIN:
        return None
    perfil = getattr(user, "perfil", None)
    if rol is None or not perfil:
        return []
    return list(perfil.clientes.values_list("id", flat=True))


def filtrar_por_cliente(queryset, user, campo="cliente_id"):
    ids = clientes_ids(user)
    if ids is None:
        return queryset
    return queryset.filter(**{f"{campo}__in": ids})


class TieneRol(BasePermission):
    """Cualquier usuario con rol (ADMIN, OFICINA u OPERARIO)."""

    message = "Tu cuenta no tiene un rol asignado."

    def has_permission(self, request, view):
        return rol_de(request.user) is not None


class RolPermitido(BasePermission):
    """Subclasear definiendo `roles_escritura`; la lectura es para cualquier usuario con rol."""

    roles_escritura = ()
    message = "Tu cuenta no tiene un rol asignado."

    def has_permission(self, request, view):
        rol = rol_de(request.user)
        if rol is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return rol in self.roles_escritura


class EscrituraAdmin(RolPermitido):
    roles_escritura = (Rol.ADMIN,)


class EscrituraStaff(RolPermitido):
    roles_escritura = (Rol.ADMIN, Rol.OFICINA)


class EscrituraCampo(RolPermitido):
    roles_escritura = (Rol.ADMIN, Rol.OFICINA, Rol.OPERARIO)


class SoloAdmin(BasePermission):
    def has_permission(self, request, view):
        return rol_de(request.user) == Rol.ADMIN
