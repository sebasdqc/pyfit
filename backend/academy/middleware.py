"""Middleware de tenant para Zyfit Academy.

Resuelve el tenant activo a partir del header Host de cada request y lo expone
como `request.tenant` (None si el dominio no corresponde a ningún tenant
registrado → catálogo raíz de Zyfit).

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

        host = request.get_host().split(':')[0].lower()
        try:
            request.tenant = Tenant.objects.get(
                Q(dominio=host) | Q(dominio_custom=host),
                activo=True,
            )
        except (Tenant.DoesNotExist, Tenant.MultipleObjectsReturned):
            request.tenant = None

        return self.get_response(request)
