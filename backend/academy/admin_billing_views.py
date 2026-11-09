"""Panel de gestión de Academy para administradores — cobros y métricas.

    GET  /api/academy/admin/metricas/?dias=7|30|90    rendimiento, estudiantes, retención, finanzas
    GET  /api/academy/admin/medios/                   producción de video/audio pendiente
    GET  /api/academy/admin/suscripciones/            suscriptores + solicitudes pendientes
    GET  /api/academy/admin/pagos/                    libro de pagos
    POST /api/academy/admin/pagos/                    registra un cobro (extiende la suscripción)
    POST /api/academy/admin/pagos/<id>/anular/        anula un cobro y recalcula el acceso
    POST /api/academy/admin/suscripciones/<uid>/cancelar/   cancela la renovación (conserva el acceso pagado)
    POST /api/academy/admin/solicitudes/<id>/rechazar/      rechaza una solicitud de Pro

Todo gateado por `IsAcademyAdmin` y acotado al tenant efectivo del admin
(mismo criterio que admin_users_views: la cuenta del admin manda, no el header).
Un instructor NO entra: ver los pagos de la organización es un privilegio
distinto a escribir cursos.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from . import admin_analytics_service, billing_service, media_ops_service
from .admin_users_views import _resolve_effective_tenant
from .models import AcademyPayment, AcademySubscription
from .permissions import IsAcademyAdmin

User = get_user_model()

PERIODOS_VALIDOS = (7, 30, 90)
POR_VENCER_DIAS = 7
MAX_FILAS = 200


def _nombre(user):
    profile = getattr(user, 'profile', None)
    return (getattr(profile, 'nombre', '') or user.first_name or user.email).strip()


def _estado_efectivo(sub):
    """Lo que ve el admin: el estado guardado puede mentir (una 'activa' con el
    período ya vencido no da acceso)."""
    hoy = date.today()
    da_acceso = sub.da_acceso_pro()
    if sub.estado == AcademySubscription.ESTADO_ACTIVA:
        if not da_acceso:
            return 'vencida'
        if sub.fecha_renovacion and sub.fecha_renovacion <= hoy + timedelta(days=POR_VENCER_DIAS):
            return 'por_vencer'
        return 'vigente'
    if sub.estado == AcademySubscription.ESTADO_CANCELADA:
        return 'cancelada_con_acceso' if da_acceso else 'cancelada'
    return sub.estado  # vencida | pago_fallido


def _pago_json(p):
    return {
        'id': p.id,
        'user_id': p.user_id,
        'email': p.usuario_email,
        'plan_tipo': p.plan_tipo,
        'monto': float(p.monto),
        'moneda': p.moneda,
        'metodo': p.metodo,
        'referencia': p.referencia,
        'fecha_pago': p.fecha_pago.isoformat(),
        'periodo_desde': p.periodo_desde.isoformat(),
        'periodo_hasta': p.periodo_hasta.isoformat(),
        'estado': p.estado,
        'nota': p.nota,
        'motivo_anulacion': p.motivo_anulacion,
        'registrado_por': p.registrado_por.email if p.registrado_por_id else '',
        'created_at': p.created_at.isoformat(),
    }


def _bad_request(message):
    return Response({'detail': message}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAcademyAdmin])
def admin_metrics(request):
    try:
        dias = int(request.query_params.get('dias', 30))
    except (TypeError, ValueError):
        return _bad_request('dias debe ser 7, 30 o 90.')
    if dias not in PERIODOS_VALIDOS:
        return _bad_request('dias debe ser 7, 30 o 90.')
    tenant = _resolve_effective_tenant(request)
    return Response(admin_analytics_service.build_admin_metrics(tenant, dias))


@api_view(['GET'])
@permission_classes([IsAcademyAdmin])
def admin_media(request):
    """Cola de producción: lecciones de video/audio sin archivo, por curso."""
    tenant = _resolve_effective_tenant(request)
    return Response(media_ops_service.build_media_report(tenant))


@api_view(['GET'])
@permission_classes([IsAcademyAdmin])
def admin_subscriptions(request):
    tenant = _resolve_effective_tenant(request)
    subs = (
        AcademySubscription.objects.filter(user__academy_tenant=tenant)
        .select_related('user', 'user__profile')
    )
    q = (request.query_params.get('q') or '').strip()
    if q:
        subs = subs.filter(Q(user__email__icontains=q) | Q(user__first_name__icontains=q)
                           | Q(user__profile__nombre__icontains=q))
    subs = list(subs.order_by('fecha_renovacion', 'id'))

    # Totales y último pago por usuario en UNA consulta (sin N+1).
    ids = [s.user_id for s in subs]
    ledger = {
        r['user_id']: r
        for r in AcademyPayment.objects.filter(
            user_id__in=ids, estado=AcademyPayment.ESTADO_CONFIRMADO,
        ).values('user_id').annotate(total=Sum('monto'), n=Count('id'))
    }
    ultimo = {}
    for p in AcademyPayment.objects.filter(user_id__in=ids, estado=AcademyPayment.ESTADO_CONFIRMADO) \
            .order_by('fecha_pago', 'id'):
        ultimo[p.user_id] = p

    filas = []
    conteo = {}
    for s in subs:
        efectivo = _estado_efectivo(s)
        conteo[efectivo] = conteo.get(efectivo, 0) + 1
        l = ledger.get(s.user_id)
        u = ultimo.get(s.user_id)
        filas.append({
            'user_id': s.user_id,
            'email': s.user.email,
            'nombre': _nombre(s.user),
            'estado': s.estado,
            'estado_efectivo': efectivo,
            'plan_tipo': s.plan_tipo,
            'fecha_inicio': s.fecha_inicio.isoformat(),
            'fecha_renovacion': s.fecha_renovacion.isoformat() if s.fecha_renovacion else None,
            'dias_restantes': (s.fecha_renovacion - date.today()).days if s.fecha_renovacion else None,
            'proveedor_pago': s.proveedor_pago,
            'pagos': l['n'] if l else 0,
            'total_pagado': float(l['total']) if l else 0.0,
            'ultimo_pago': {'monto': float(u.monto), 'fecha': u.fecha_pago.isoformat()} if u else None,
        })

    filtro = request.query_params.get('estado')
    if filtro and filtro != 'todas':
        filas = [f for f in filas if f['estado_efectivo'] == filtro]

    from promos.models import PRODUCTO_ACADEMY_PRO, SolicitudSuscripcion
    pendientes = (
        SolicitudSuscripcion.objects.filter(
            producto=PRODUCTO_ACADEMY_PRO, estado=SolicitudSuscripcion.ESTADO_PENDIENTE,
            user__academy_tenant=tenant,
        ).select_related('user', 'codigo_promocional').order_by('created_at')[:50]
    )
    return Response({
        'conteo': conteo,
        'suscripciones': filas[:MAX_FILAS],
        'solicitudes': [{
            'id': s.id,
            'user_id': s.user_id,
            'email': s.user.email,
            'plan_tipo': s.plan_tipo,
            'precio_lista': float(s.precio_lista),
            'descuento': float(s.descuento_aplicado),
            'precio_final': float(s.precio_final),
            'codigo': s.codigo_promocional.codigo if s.codigo_promocional_id else '',
            'created_at': s.created_at.isoformat(),
        } for s in pendientes],
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyAdmin])
def admin_payments(request):
    tenant = _resolve_effective_tenant(request)

    if request.method == 'GET':
        qs = AcademyPayment.objects.filter(tenant=tenant).select_related('registrado_por')
        if request.query_params.get('estado') in dict(AcademyPayment.ESTADO_CHOICES):
            qs = qs.filter(estado=request.query_params['estado'])
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(usuario_email__icontains=q) | Q(referencia__icontains=q))
        return Response([_pago_json(p) for p in qs[:MAX_FILAS]])

    data = request.data
    try:
        user_id = int(data.get('user_id'))
    except (TypeError, ValueError):
        return _bad_request('Indica el usuario que pagó.')
    user = User.objects.filter(pk=user_id, academy_tenant=tenant, is_active=True).first()
    if user is None:
        return _bad_request('El usuario no existe en esta organización.')

    fecha_pago = None
    if data.get('fecha_pago'):
        try:
            fecha_pago = date.fromisoformat(str(data['fecha_pago']))
        except ValueError:
            return _bad_request('La fecha de pago no es válida (usa AAAA-MM-DD).')

    solicitud_id = data.get('solicitud_id') or None
    try:
        pago, sub = billing_service.registrar_pago(
            admin=request.user, user=user, plan_tipo=data.get('plan_tipo'), monto=data.get('monto'),
            metodo=data.get('metodo'), referencia=data.get('referencia', ''), fecha_pago=fecha_pago,
            nota=data.get('nota', ''), solicitud_id=int(solicitud_id) if solicitud_id else None, tenant=tenant,
        )
    except billing_service.BillingError as exc:
        return _bad_request(str(exc))
    return Response(
        {'pago': _pago_json(pago), 'estado_efectivo': _estado_efectivo(sub),
         'fecha_renovacion': sub.fecha_renovacion.isoformat()},
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAcademyAdmin])
def admin_payment_void(request, pk):
    tenant = _resolve_effective_tenant(request)
    pago = get_object_or_404(AcademyPayment, pk=pk, tenant=tenant)
    try:
        billing_service.anular_pago(pago, admin=request.user, motivo=request.data.get('motivo', ''))
    except billing_service.BillingError as exc:
        return _bad_request(str(exc))
    return Response(_pago_json(pago))


@api_view(['POST'])
@permission_classes([IsAcademyAdmin])
def admin_subscription_cancel(request, user_id):
    tenant = _resolve_effective_tenant(request)
    user = get_object_or_404(User, pk=user_id, academy_tenant=tenant)
    try:
        sub = billing_service.cancelar_suscripcion(user)
    except billing_service.BillingError as exc:
        return _bad_request(str(exc))
    return Response({'estado_efectivo': _estado_efectivo(sub)})


@api_view(['POST'])
@permission_classes([IsAcademyAdmin])
def admin_request_reject(request, pk):
    from promos.models import PRODUCTO_ACADEMY_PRO, SolicitudSuscripcion

    tenant = _resolve_effective_tenant(request)
    solicitud = SolicitudSuscripcion.objects.filter(
        pk=pk, producto=PRODUCTO_ACADEMY_PRO, user__academy_tenant=tenant,
        estado=SolicitudSuscripcion.ESTADO_PENDIENTE,
    ).first()
    if solicitud is None:
        raise Http404
    solicitud.estado = SolicitudSuscripcion.ESTADO_RECHAZADA
    solicitud.save(update_fields=['estado'])
    return Response({'id': solicitud.id, 'estado': solicitud.estado})
