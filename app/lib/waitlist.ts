import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'
import { verifyAdminToken } from './adminToken'

/**
 * Acceso a la lista de espera (`waitlist_signups` en Neon) y control de acceso
 * del panel de administración.
 *
 * Server-only: importa `next/headers`, nunca desde un componente `'use client'`.
 * La firma/verificación del token de sesión vive en `./adminToken`, que no
 * depende de Next y por eso se puede probar aislado.
 */

export { SESSION_TTL_S, issueAdminToken, safeEqual, verifyAdminToken } from './adminToken'

export const ADMIN_COOKIE = 'zyfit_admin'

export type WaitlistSignup = {
  id: string
  email: string
  created_at: string
}

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está configurada')
  return neon(url)
}

/** Total real de emails guardados. */
export async function getWaitlistCount(): Promise<number> {
  const sql = getSql()
  const rows = await sql`SELECT COUNT(*)::int AS count FROM waitlist_signups`
  return (rows[0] as { count: number } | undefined)?.count ?? 0
}

/** Listado completo, más reciente primero. */
export async function listWaitlistSignups(): Promise<WaitlistSignup[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT id::text AS id, email, created_at
    FROM waitlist_signups
    ORDER BY created_at DESC, id DESC
  `
  return rows as WaitlistSignup[]
}

/** ¿La request trae una cookie de sesión de admin válida y vigente? */
export async function isAdmin(): Promise<boolean> {
  const secret = process.env.WAITLIST_ADMIN_TOKEN
  if (!secret) return false
  const value = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!value) return false
  return verifyAdminToken(value, secret)
}
