import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'node:crypto'

/**
 * Acceso a la lista de espera (`waitlist_signups` en Neon) y control de acceso
 * del panel de administración.
 *
 * Server-only: importa `next/headers` y `node:crypto`, nunca desde un
 * componente `'use client'`.
 */

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

/**
 * Comparación en tiempo constante: evita filtrar la contraseña por el tiempo
 * que tarda en fallar.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** ¿La request trae la cookie de admin válida? */
export async function isAdmin(): Promise<boolean> {
  const expected = process.env.WAITLIST_ADMIN_TOKEN
  if (!expected) return false
  const value = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!value) return false
  return safeEqual(value, expected)
}
