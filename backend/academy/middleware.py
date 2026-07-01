"""Middleware de tenant para Zyfit Academy.

Resuelve el tenant activo en este orden de prioridad:

  1. Header X-Tenant-Slug (enviado por el frontend en deploys multi-site sin
     dominio propio — ej. dos Static Sites de DO apuntando al mismo backend).
  2. Host header (para deploys con subdominio/dominio custom por tenant).
  3. None → catálogo raíz de Zyfit (sin tenant).

Debe ir en MIDDLEWARE antes de las views pero después de CorsMiddleware, ya que
no depende de autenticación ni sesión.
"""

from django.db.models import Q


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Importación diferida para evitar el AppRegistryNotReady en el arranque.
        from .models import Tenant

        # Prioridad 1: header explícito del frontend (deploy multi-site sin dominio propio)
        slug = request.META.get('HTTP_X_TENANT_SLUG', '').strip().lower()
        if slug:
            try:
                request.tenant = Tenant.objects.get(slug=slug, activo=True)
            except (Tenant.DoesNotExist, Tenant.MultipleObjectsReturned):
                request.tenant = None
            return self.get_response(request)

        # Prioridad 2: resolución por Host (deploy con dominio/subdominio propio)
        host = request.get_host().split(':')[0].lower()
        try:
            request.tenant = Tenant.objects.get(
                Q(dominio=host) | Q(dominio_custom=host),
                activo=True,
            )
        except (Tenant.DoesNotExist, Tenant.MultipleObjectsReturned):
            request.tenant = None

        return self.get_response(request)
