"""Cobros de Academy Pro gestionados por un admin (sin proveedor externo).

Un admin cobra por fuera de la app (transferencia, pago móvil, efectivo...) y
lo registra aquí. Cada cobro queda en el libro `AcademyPayment` y extiende la
`AcademySubscription` del usuario. Reglas:

  - Un pago nuevo EXTIENDE el período vigente (si aún tiene acceso, se suma al
    final del período actual; si ya venció, cuenta desde hoy). Nunca lo
    reinicia ni lo acorta.
  - Un pago no se borra: se ANULA (queda el rastro) y el acceso se recalcula a
    partir de los pagos confirmados que sobreviven.
  - Registrar el mismo cobro dos veces (misma referencia) se rechaza.

Toda la lógica vive acá; las vistas solo validan entrada y traducen errores.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import AcademyPayment, AcademySubscription
from .payments import GATEWAY, _DIAS_POR_PLAN

logger = logging.getLogger(__name__)

# Meses que cubre cada plan: normaliza cualquier pago a un valor mensual (MRR).
MESES_POR_PLAN = {'mensual': 1, 'trimestral': 3, 'anual': 12}

MONTO_MAXIMO = Decimal('10000.00')


class BillingError(ValueError):
    """Error de negocio mostrable al admin (la vista lo devuelve como 400)."""


def _parse_monto(raw) -> Decimal:
    try:
        monto = Decimal(str(raw)).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError, TypeError):
        raise BillingError('El monto no es un número válido.')
    if monto <= 0:
        raise BillingError('El monto debe ser mayor que cero.')
    if monto > MONTO_MAXIMO:
        raise BillingError(f'El monto supera el máximo permitido ({MONTO_MAXIMO} USD).')
    return monto


def _periodo_base(sub) -> date:
    """Desde cuándo cuenta un pago nuevo: el fin del período vigente si el
    usuario aún tiene acceso pagado, o hoy si ya venció / nunca tuvo."""
    hoy = date.today()
    if sub and sub.fecha_renovacion and sub.fecha_renovacion >= hoy and sub.da_acceso_pro():
        return sub.fecha_renovacion
    return hoy


@transaction.atomic
def registrar_pago(*, admin, user, plan_tipo, monto, metodo, referencia='',
                   fecha_pago=None, nota='', solicitud_id=None, tenant=None):
    """Registra un cobro y extiende la suscripción. Devuelve (pago, suscripción)."""
    if plan_tipo not in _DIAS_POR_PLAN:
        raise BillingError('Plan no válido. Usa mensual, trimestral o anual.')
    if metodo not in dict(AcademyPayment.METODO_CHOICES):
        raise BillingError('Método de pago no válido.')
    monto = _parse_monto(monto)
    referencia = (referencia or '').strip()[:120]
    nota = (nota or '').strip()
    fecha_pago = fecha_pago or date.today()
    if fecha_pago > date.today():
        raise BillingError('La fecha de pago no puede estar en el futuro.')

    # Candado sobre la fila de suscripción: dos admins registrando a la vez no
    # deben calcular el mismo período base.
    sub = AcademySubscription.objects.select_for_update().filter(user=user).first()

    if referencia and AcademyPayment.objects.filter(
        user=user, metodo=metodo, referencia=referencia, estado=AcademyPayment.ESTADO_CONFIRMADO,
    ).exists():
        raise BillingError('Ya existe un pago confirmado de este usuario con esa referencia.')

    desde = _periodo_base(sub)
    sub = GATEWAY.activar(
        user, plan_tipo=plan_tipo, proveedor_pago=metodo, referencia_externa=referencia, desde=desde,
    )
    pago = AcademyPayment.objects.create(
        tenant=tenant, user=user, usuario_email=user.email, plan_tipo=plan_tipo, monto=monto,
        metodo=metodo, referencia=referencia, fecha_pago=fecha_pago,
        periodo_desde=desde, periodo_hasta=sub.fecha_renovacion, nota=nota,
        solicitud_id=solicitud_id, registrado_por=admin,
    )

    if solicitud_id:
        _confirmar_solicitud(solicitud_id, user)
    # El recibo sale SOLO si la transacción se confirma: nunca un comprobante de
    # un pago que después se revierte (p. ej. por la validación de la solicitud).
    transaction.on_commit(lambda: _enviar_recibo(pago.pk))
    return pago, sub


def _enviar_recibo(pago_id):
    """Recibo del pago por correo al alumno (comprobante para él).

    Best-effort: un fallo del correo NUNCA debe deshacer ni ocultar un cobro ya
    registrado; solo se deja en el log para que el admin sepa que no salió."""
    try:
        pago = AcademyPayment.objects.select_related('user').filter(pk=pago_id).first()
        if pago is None or pago.user is None or not pago.user.email:
            return
        nombre = (pago.user.first_name or pago.user.email.split('@')[0]).strip()
        plan = dict(AcademySubscription.PLAN_TIPO_CHOICES).get(pago.plan_tipo, pago.plan_tipo)
        metodo = dict(AcademyPayment.METODO_CHOICES).get(pago.metodo, pago.metodo)
        referencia = f' (ref. {pago.referencia})' if pago.referencia else ''
        send_mail(
            subject='Recibo de tu pago — Zyfit Academy',
            message=(
                f'Hola {nombre},\n\n'
                'Registramos tu pago de Zyfit Academy Pro.\n\n'
                f'Plan: {plan}\n'
                f'Monto: {pago.monto} {pago.moneda}\n'
                f'Método: {metodo}{referencia}\n'
                f'Fecha del pago: {pago.fecha_pago.isoformat()}\n'
                f'Acceso Pro hasta: {pago.periodo_hasta.isoformat()}\n\n'
                'Guarda este correo como comprobante. Si algo no es correcto, '
                'responde a este mensaje.\n\n'
                '— Equipo Zyfit Academy'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[pago.user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception('No se pudo enviar el recibo del pago %s', pago_id)


def _confirmar_solicitud(solicitud_id, user):
    """Si el cobro nace de una solicitud pendiente de Academy Pro, la cierra
    (mismo efecto que la acción de Django Admin, sin reactivar el producto)."""
    from promos.models import PRODUCTO_ACADEMY_PRO, SolicitudSuscripcion

    solicitud = SolicitudSuscripcion.objects.filter(
        pk=solicitud_id, user=user, producto=PRODUCTO_ACADEMY_PRO,
        estado=SolicitudSuscripcion.ESTADO_PENDIENTE,
    ).first()
    if solicitud is None:
        raise BillingError('La solicitud indicada no existe o ya fue procesada.')
    solicitud.estado = SolicitudSuscripcion.ESTADO_CONFIRMADA
    solicitud.confirmada_at = timezone.now()
    solicitud.save(update_fields=['estado', 'confirmada_at'])


@transaction.atomic
def anular_pago(pago, *, admin, motivo=''):
    """Anula un pago confirmado y recalcula el acceso del usuario."""
    if pago.estado != AcademyPayment.ESTADO_CONFIRMADO:
        raise BillingError('Este pago ya está anulado.')
    pago.estado = AcademyPayment.ESTADO_ANULADO
    pago.anulado_por = admin
    pago.anulado_en = timezone.now()
    pago.motivo_anulacion = (motivo or '').strip()[:200]
    pago.save(update_fields=['estado', 'anulado_por', 'anulado_en', 'motivo_anulacion'])
    if pago.user_id:
        _recalcular_suscripcion(pago.user)
    return pago


def _recalcular_suscripcion(user):
    """Tras anular un pago, el acceso queda en lo que cubren los pagos
    confirmados restantes (o se corta si ninguno cubre hoy)."""
    sub = AcademySubscription.objects.select_for_update().filter(user=user).first()
    if sub is None:
        return None
    ultimo = (
        AcademyPayment.objects.filter(user=user, estado=AcademyPayment.ESTADO_CONFIRMADO)
        .order_by('-periodo_hasta', '-id').first()
    )
    if ultimo is None:
        sub.estado = AcademySubscription.ESTADO_VENCIDA
        sub.fecha_renovacion = date.today() - timedelta(days=AcademySubscription.GRACIA_DIAS + 1)
    else:
        sub.plan_tipo = ultimo.plan_tipo
        sub.fecha_renovacion = ultimo.periodo_hasta
        vigente = ultimo.periodo_hasta >= date.today()
        sub.estado = AcademySubscription.ESTADO_ACTIVA if vigente else AcademySubscription.ESTADO_VENCIDA
    sub.save(update_fields=['estado', 'plan_tipo', 'fecha_renovacion', 'updated_at'])
    return sub


def cancelar_suscripcion(user):
    """Cancela la renovación; conserva el acceso hasta `fecha_renovacion`."""
    sub = getattr(user, 'academy_subscription', None)
    if sub is None or sub.estado != AcademySubscription.ESTADO_ACTIVA:
        raise BillingError('El usuario no tiene una suscripción activa para cancelar.')
    return GATEWAY.cancelar(sub)
