"""Registro de los modelos de códigos de descuento en el admin (Unfold)."""

from datetime import date
from decimal import Decimal

from django.contrib import admin, messages
from django.db.models import Count, Q, Sum
from django.utils import timezone
from unfold.admin import ModelAdmin

from .models import CodigoPromocional, Influencer, SolicitudSuscripcion
from .payments import activar_pro


@admin.register(Influencer)
class InfluencerAdmin(ModelAdmin):
    list_display = ['nombre', 'contacto', 'activo', 'comision_pendiente', 'created_at']
    list_filter = ['activo']
    search_fields = ['nombre', 'contacto']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _comision_pendiente=Sum(
                'codigos__solicitudes__comision_influencer',
                filter=Q(
                    codigos__solicitudes__estado=SolicitudSuscripcion.ESTADO_CONFIRMADA,
                    codigos__solicitudes__comision_pagada=False,
                ),
            ),
        )

    @admin.display(description='Comisión pendiente', ordering='_comision_pendiente')
    def comision_pendiente(self, obj):
        return f'${obj._comision_pendiente or Decimal("0"):.2f}'


@admin.register(CodigoPromocional)
class CodigoPromocionalAdmin(ModelAdmin):
    list_display = [
        'codigo', 'influencer', 'tipo_descuento', 'valor_descuento',
        'comision_monto', 'activo', 'usos_confirmados', 'valido_hasta', 'created_at',
    ]
    list_filter = ['activo', 'tipo_descuento']
    search_fields = ['codigo', 'influencer__nombre']
    autocomplete_fields = ['influencer']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _usos_confirmados=Count(
                'solicitudes', filter=Q(solicitudes__estado=SolicitudSuscripcion.ESTADO_CONFIRMADA),
            ),
        )

    @admin.display(description='Usos confirmados', ordering='_usos_confirmados')
    def usos_confirmados(self, obj):
        return obj._usos_confirmados


@admin.register(SolicitudSuscripcion)
class SolicitudSuscripcionAdmin(ModelAdmin):
    """Cola de trabajo del staff: cada fila es un pedido de suscripción a
    Zyfit Pro. El staff cobra por fuera de la app y usa las acciones de abajo
    para confirmar (activa Pro) o rechazar. Los campos de precio/comisión son
    de solo lectura porque son cálculos de servidor hechos al crear el pedido."""

    list_display = [
        'user', 'plan_tipo', 'codigo_promocional', 'precio_final',
        'comision_influencer', 'estado', 'comision_pagada', 'created_at',
    ]
    list_filter = ['estado', 'plan_tipo', 'comision_pagada']
    search_fields = ['user__email', 'codigo_promocional__codigo']
    autocomplete_fields = ['user', 'codigo_promocional']
    readonly_fields = ['precio_lista', 'descuento_aplicado', 'precio_final', 'comision_influencer', 'created_at', 'confirmada_at']
    actions = ['confirmar_y_activar', 'rechazar', 'marcar_comision_pagada']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'codigo_promocional')

    @admin.action(description='✓ Confirmar pago y activar Pro')
    def confirmar_y_activar(self, request, queryset):
        n = 0
        for solicitud in queryset.filter(estado=SolicitudSuscripcion.ESTADO_PENDIENTE):
            activar_pro(solicitud.user, solicitud.plan_tipo)
            solicitud.estado = SolicitudSuscripcion.ESTADO_CONFIRMADA
            solicitud.confirmada_at = timezone.now()
            solicitud.save(update_fields=['estado', 'confirmada_at'])
            n += 1
        messages.success(request, f'{n} solicitud(es) confirmada(s) y Pro activado.')

    @admin.action(description='✗ Rechazar solicitud')
    def rechazar(self, request, queryset):
        n = queryset.filter(estado=SolicitudSuscripcion.ESTADO_PENDIENTE).update(
            estado=SolicitudSuscripcion.ESTADO_RECHAZADA,
        )
        messages.success(request, f'{n} solicitud(es) rechazada(s).')

    @admin.action(description='💰 Marcar comisión como pagada')
    def marcar_comision_pagada(self, request, queryset):
        n = queryset.filter(estado=SolicitudSuscripcion.ESTADO_CONFIRMADA, comision_pagada=False).update(
            comision_pagada=True, fecha_pago_comision=date.today(),
        )
        messages.success(request, f'{n} comisión(es) marcada(s) como pagada(s).')
