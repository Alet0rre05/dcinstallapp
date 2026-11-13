"""Resolución explícita del tenant para requests API.

El header X-Tenant-Slug es opcional durante la migración: cuando falta se usa la
membresía activa del usuario. Nunca se permite seleccionar un tenant ajeno.
"""
from django.http import JsonResponse

from .models import Tenant


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None
        slug = request.headers.get("X-Tenant-Slug", "").strip().lower()
        if slug:
            tenant = Tenant.objects.filter(slug=slug, activo=True).first()
            if not tenant:
                return JsonResponse({"detail": "Organización no disponible."}, status=404)
            request.tenant = tenant
        return self.get_response(request)


def tenant_for_request(request):
    if getattr(request, "tenant", None):
        return request.tenant
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        membership = user.tenant_memberships.filter(activo=True, tenant__activo=True).select_related("tenant").first()
        return membership.tenant if membership else None
    return None
