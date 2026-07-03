"""Gateway de pagos de Academy Pro — abstracción intercambiable.

No hay proveedor de pago real conectado todavía (Stripe/Paypal/Mercadopago...
queda pendiente de confirmar con Sebastian; una operación venezolana puede
tener restricciones de procesamiento según el país de la cuenta bancaria).
Mientras tanto `AdministeredGateway` es la única implementación: administra la
suscripción igual que `users.CoachSubscription` (staff vía Django Admin, o el
webhook de `subscription_views.py` una vez exista un proveedor real). NO hay
endpoint público que deje a un usuario activarse Pro gratis por su cuenta —
ver el docstring de `subscription_views.py`.

Para conectar un proveedor real: implementar una nueva subclase de
`PaymentGateway` y apuntar `GATEWAY` a ella.
"""

from datetime import date, timedelta

from .models import AcademySubscription


def _calcular_renovacion(plan_tipo: str, desde: date | None = None) -> date:
    desde = desde or date.today()
    dias = 365 if plan_tipo == 'anual' else 30
    return desde + timedelta(days=dias)


class PaymentGateway:
    """Interfaz que cualquier proveedor real deberá implementar."""

    def activar(self, user, plan_tipo: str, **kwargs) -> AcademySubscription:
        raise NotImplementedError

    def cancelar(self, subscription: AcademySubscription) -> AcademySubscription:
        raise NotImplementedError

    def renovar(self, subscription: AcademySubscription) -> AcademySubscription:
        raise NotImplementedError

    def marcar_pago_fallido(self, subscription: AcademySubscription) -> AcademySubscription:
        raise NotImplementedError


class AdministeredGateway(PaymentGateway):
    """Sin cobrador conectado: activa/cancela de inmediato, como
    `CoachSubscription`. La usan Django Admin y el webhook de pagos (una vez
    haya un proveedor real) — nunca un endpoint público self-service."""

    def activar(self, user, plan_tipo='mensual', proveedor_pago='', referencia_externa='') -> AcademySubscription:
        sub, _ = AcademySubscription.objects.update_or_create(
            user=user,
            defaults={
                'estado': AcademySubscription.ESTADO_ACTIVA,
                'plan_tipo': plan_tipo,
                'fecha_renovacion': _calcular_renovacion(plan_tipo),
                'proveedor_pago': proveedor_pago,
                'referencia_externa': referencia_externa,
            },
        )
        return sub

    def cancelar(self, subscription: AcademySubscription) -> AcademySubscription:
        """Cancela pero conserva acceso Pro hasta `fecha_renovacion` (grace),
        igual que cualquier suscripción estándar."""
        subscription.estado = AcademySubscription.ESTADO_CANCELADA
        subscription.save(update_fields=['estado', 'updated_at'])
        return subscription

    def renovar(self, subscription: AcademySubscription) -> AcademySubscription:
        """Evento de renovación exitosa (webhook futuro): reactiva y corre la fecha."""
        subscription.estado = AcademySubscription.ESTADO_ACTIVA
        subscription.fecha_renovacion = _calcular_renovacion(
            subscription.plan_tipo, desde=subscription.fecha_renovacion or date.today(),
        )
        subscription.save(update_fields=['estado', 'fecha_renovacion', 'updated_at'])
        return subscription

    def marcar_pago_fallido(self, subscription: AcademySubscription) -> AcademySubscription:
        subscription.estado = AcademySubscription.ESTADO_PAGO_FALLIDO
        subscription.save(update_fields=['estado', 'updated_at'])
        return subscription


GATEWAY = AdministeredGateway()  # swap aquí cuando se confirme un proveedor real
