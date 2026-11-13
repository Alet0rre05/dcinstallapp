"""Selección y caché de membresías durante una única petición."""
from contextvars import ContextVar

from django.db.models import Q
from django.http import HttpResponseForbidden
from rest_framework.exceptions import PermissionDenied

from .models import TenantMembership


_context = ContextVar("tenant_request", default=None)
LEGACY_CLIENTS = Q(tenant__isnull=True) | Q(tenant__slug="legacy")


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # El admin de Django es un panel global, no una vista de la empresa activa.
        if (request.path_info.startswith("/admin/") and request.user.is_authenticated
                and request.path_info.rstrip("/") != "/admin/logout"
                and not request.user.is_superuser and request.user.tenant_memberships.exists()):
            return HttpResponseForbidden("La administración global requiere una cuenta de plataforma.")
        slug = request.headers.get("X-Tenant-Slug", "").strip().lower()
        token = _context.set((slug, {}))
        try:
            return self.get_response(request)
        finally:
            _context.reset(token)


def membership_for(user):
    if not user or not user.is_authenticated:
        return None
    context = _context.get()
    slug, cache = context if context is not None else ("", {})
    if user.pk in cache:
        return cache[user.pk]
    memberships = TenantMembership.objects.filter(user=user)
    active = memberships.filter(activo=True, tenant__activo=True).select_related("tenant")
    if slug:
        active = active.filter(tenant__slug=slug)
    membership = active.order_by("pk").first()
    if membership is None and (slug or memberships.exists()):
        raise PermissionDenied("Organización no disponible.")
    cache[user.pk] = membership
    return membership


def tenant_for_request(request):
    membership = membership_for(request.user)
    return membership.tenant if membership else None
