import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Token de sesión del panel de la lista de espera: `<vencimiento>.<HMAC>`,
 * firmado con `WAITLIST_ADMIN_TOKEN` como clave.
 *
 * Hasta el 2026-07-31 la cookie guardaba **la clave en sí** (ver `git log`):
 * filtrarla entregaba la contraseña real, no un token de sesión, y no había
 * forma de que caducara. Ahora una cookie robada vence sola y no revela el
 * secreto; rotar `WAITLIST_ADMIN_TOKEN` sigue invalidando todas las sesiones
 * de golpe.
 *
 * Módulo aparte de `waitlist.ts` a propósito: sin `next/headers` ni acceso a
 * base de datos, es criptografía pura y se puede probar de forma aislada.
 */

export const SESSION_TTL_S = 60 * 60 * 24 * 7

/** Comparación en tiempo constante: no filtra la clave por lo que tarda en fallar. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function issueAdminToken(secret: string, nowMs = Date.now()): string {
  const exp = String(Math.floor(nowMs / 1000) + SESSION_TTL_S)
  return `${exp}.${sign(exp, secret)}`
}

export function verifyAdminToken(token: string, secret: string, nowMs = Date.now()): boolean {
  const sep = token.indexOf('.')
  if (sep <= 0) return false
  const exp = token.slice(0, sep)
  // Validar la firma ANTES de mirar el vencimiento: `exp` lo manda el cliente
  // y solo es de fiar una vez que el HMAC dio bien.
  if (!safeEqual(token.slice(sep + 1), sign(exp, secret))) return false
  const expSeconds = Number(exp)
  return Number.isFinite(expSeconds) && expSeconds * 1000 > nowMs
}
