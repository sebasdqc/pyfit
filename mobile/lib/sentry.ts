/**
 * Inicialización de Sentry para la app móvil.
 *
 * Lee `EXPO_PUBLIC_SENTRY_DSN` (debe terminar siendo público — la DSN del
 * cliente NO es secreta, así que ir bajo el prefijo `EXPO_PUBLIC_` es correcto).
 * Si la variable está vacía, Sentry no se inicializa: la app sigue funcionando
 * y los wrappers/breadcrumbs son no-ops.
 *
 * `initSentry()` debe correr lo antes posible en el arranque, idealmente
 * antes de cualquier render. `withSentryWrap()` envuelve el componente raíz
 * para activar el ErrorBoundary nativo de Sentry.
 */

import * as Sentry from '@sentry/react-native'

let initialized = false

export function initSentry() {
  if (initialized) return
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn) {
    // Útil en dev local para no enviar nada. La función se vuelve no-op.
    if (__DEV__) console.log('[Sentry] DSN vacío — telemetría deshabilitada.')
    return
  }
  Sentry.init({
    dsn,
    debug:                  __DEV__,
    enableInExpoDevelopment: true,
    environment:            process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT
                            || (__DEV__ ? 'development' : 'production'),
    release:                process.env.EXPO_PUBLIC_SENTRY_RELEASE || undefined,
    // 100% en dev (para iterar), 10% en prod para no agotar el plan free.
    tracesSampleRate:       __DEV__ ? 1.0 : 0.1,
    // Ojo: send_default_pii=false (Sentry mobile default).
    beforeSend(event) {
      // Scrub básico — quita tokens del request si terminan acá por algún reason.
      try {
        const req = (event as any).request
        if (req?.headers?.Authorization) req.headers.Authorization = '[scrubbed]'
        if (req?.headers?.Cookie)        req.headers.Cookie        = '[scrubbed]'
      } catch {}
      return event
    },
  })
  initialized = true
  if (__DEV__) console.log('[Sentry] iniciado.')
}

/** Wrapper opcional para el componente raíz — añade un ErrorBoundary global. */
export function withSentryWrap<P>(Component: React.ComponentType<P>): React.ComponentType<P> {
  return Sentry.wrap(Component) as React.ComponentType<P>
}

/** Helpers expuestos por si algún hook quiere capturar manualmente. */
export const captureException = Sentry.captureException
export const captureMessage   = Sentry.captureMessage
export const setUser          = Sentry.setUser
export const setTag           = Sentry.setTag
