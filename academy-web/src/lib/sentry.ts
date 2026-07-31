/**
 * Inicialización de Sentry para academy-web.
 *
 * Antes de esto Academy no tenía NINGUNA visibilidad de errores reales de
 * usuario (la app móvil sí; ver `mobile/lib/sentry.ts`, que este módulo
 * espeja). Un error de JS en producción no dejaba rastro en ninguna parte.
 *
 * Lee `VITE_SENTRY_DSN`. Si está vacía, `initSentry()` es un no-op y la app
 * funciona igual — así se puede desplegar sin la variable configurada y
 * activarlo después sin tocar código. Ojo: las variables `VITE_*` se
 * incrustan en el bundle **en tiempo de build**, así que hay que definirla en
 * el entorno de build del Static Site de DO y volver a desplegar; agregarla en
 * runtime no hace nada. La DSN de cliente no es un secreto (va en el bundle
 * por diseño).
 */

import * as Sentry from '@sentry/react'

let initialized = false

export function initSentry() {
  if (initialized) return
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || (import.meta.env.DEV ? 'development' : 'production'),
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    // Trazas de rendimiento al 10% para no agotar el plan gratis; los errores
    // se envían siempre (el muestreo de arriba no los afecta).
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    // NO se activa Session Replay a propósito: grabaría la pantalla de los
    // alumnos, y acá hay datos personales del perfil (país, fecha de
    // nacimiento, profesión). Si alguna vez se quiere, hay que enmascarar y
    // revisar la política de privacidad primero.
    sendDefaultPii: false,
    beforeSend(event) {
      // El JWT de Academy vive en localStorage y viaja en `Authorization`.
      // Sentry no lee localStorage, pero un error dentro del cliente axios
      // puede arrastrar los headers de la request al evento.
      const headers = event.request?.headers
      if (headers) {
        for (const k of Object.keys(headers)) {
          if (/^(authorization|cookie)$/i.test(k)) headers[k] = '[scrubbed]'
        }
      }
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      // Las migas de `console` pueden arrastrar cualquier cosa que se haya
      // logueado durante el desarrollo. Las de red (fetch/xhr) sí se conservan:
      // son las que hacen falta para reconstruir un error de API.
      return breadcrumb.category === 'console' ? null : breadcrumb
    },
  })
  initialized = true
}

/**
 * Asocia los errores siguientes a un usuario. Solo el id: el email y el nombre
 * quedan fuera a propósito (`sendDefaultPii: false` no alcanza si se los pasa
 * a mano). Con el id se puede cruzar contra la base cuando hace falta.
 */
export function setSentryUser(userId: number | string | null) {
  Sentry.setUser(userId === null ? null : { id: String(userId) })
}

export const captureException = Sentry.captureException
export const ErrorBoundary = Sentry.ErrorBoundary
