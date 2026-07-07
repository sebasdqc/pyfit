"""Activación de suscripciones vendidas con código de descuento de
influencer — Zyfit Pro y Zyfit Academy Pro (`producto`), mismo espíritu que
`academy.payments`.

No hay cobrador real conectado todavía: el staff cobra por fuera de la app
(transferencia, etc.) y confirma la `SolicitudSuscripcion` desde Django
Admin, lo que llama a `activar()` de inmediato. Cuando exista un proveedor
real, un webhook puede llamar a la misma función.
"""

from datetime import date, timedelta
from decimal import Decimal

from .models import PRODUCTO_ACADEMY_PRO, PRODUCTO_ZYFIT_PRO, CodigoPromocional

# Precios por producto — Academy Pro no ofrece plan semestral, a diferencia
# de Zyfit Pro (ver academy.AcademySubscription.PLAN_TIPO_CHOICES).
PRECIOS = {
    PRODUCTO_ZYFIT_PRO: {
        'mensual': Decimal('9.99'),
        'semestral': Decimal('49.99'),
        'anual': Decimal('79.99'),
    },
    PRODUCTO_ACADEMY_PRO: {
        'mensual': Decimal('9.99'),
        'anual': Decimal('79.99'),
    },
}

# Solo lo usa activar_pro (Zyfit Pro) — Academy Pro calcula su propia
# renovación en `academy.payments._calcular_renovacion`.
DIAS_RENOVACION = {
    'mensual': 30,
    'semestral': 182,
    'anual': 365,
}


class CodigoInvalidoError(Exception):
    pass


def calcular_precio(producto: str, plan_tipo: str, codigo: CodigoPromocional | None):
    """Devuelve (precio_lista, descuento_aplicado, precio_final) para el
    `producto`/`plan_tipo` dados, validando `codigo` si se pasó uno. Lanza
    `CodigoInvalidoError` si el código no es válido o no aplica a este
    producto — el llamador decide si eso es un 400 (crear solicitud) o solo
    un mensaje (previsualización)."""
    precio_lista = PRECIOS[producto][plan_tipo]

    if codigo is None:
        return precio_lista, Decimal('0'), precio_lista

    if codigo.producto != producto:
        raise CodigoInvalidoError('Este código no aplica a este producto.')
    if not codigo.es_valido():
        raise CodigoInvalidoError('Este código no es válido o ya venció.')

    if codigo.tipo_descuento == CodigoPromocional.TIPO_PORCENTAJE:
        descuento = (precio_lista * codigo.valor_descuento / Decimal('100')).quantize(Decimal('0.01'))
    else:
        descuento = codigo.valor_descuento.quantize(Decimal('0.01'))

    descuento = min(descuento, precio_lista)
    precio_final = precio_lista - descuento
    return precio_lista, descuento, precio_final


def activar_pro(user, plan_tipo: str):
    """Activa Zyfit Pro de inmediato sobre el `Profile` del usuario."""
    profile = user.profile
    profile.plan = 'pro'
    profile.plan_tipo = plan_tipo
    profile.plan_renovacion = date.today() + timedelta(days=DIAS_RENOVACION[plan_tipo])
    profile.save(update_fields=['plan', 'plan_tipo', 'plan_renovacion'])
    return profile


def activar_academy_pro(user, plan_tipo: str):
    """Activa Zyfit Academy Pro de inmediato, vía el mismo gateway
    administrado que usa Django Admin/el webhook de `academy.payments`."""
    from academy.payments import GATEWAY as ACADEMY_GATEWAY

    return ACADEMY_GATEWAY.activar(user, plan_tipo=plan_tipo)


def activar(producto: str, user, plan_tipo: str):
    """Dispatcher genérico: activa el producto correspondiente a una
    `SolicitudSuscripcion` confirmada."""
    if producto == PRODUCTO_ACADEMY_PRO:
        return activar_academy_pro(user, plan_tipo)
    return activar_pro(user, plan_tipo)
