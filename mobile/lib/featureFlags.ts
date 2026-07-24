/**
 * Feature flags de la app móvil.
 *
 * BILLING_ENABLED — controla si se muestra CUALQUIER flujo de pago/suscripción
 * (Zyfit Pro): filas de "Suscripción/Actualizar" e "Historial de pagos" en
 * Ajustes, el CTA "Ver Zyfit Pro" del paywall de paletas, y las pantallas
 * suscripcion/cambiar-plan/cancelar/historial-pagos.
 *
 * Está en `false` a propósito: Google Play EXIGE Play Billing para bienes
 * digitales in-app, y hoy el flujo cobra fuera de la tienda (motivo seguro de
 * rechazo). Se oculta hasta integrar IAP/Play Billing. Para reactivar todo,
 * poner `true` (y asegurarse de que el checkout use el billing nativo).
 */
export const BILLING_ENABLED = false
