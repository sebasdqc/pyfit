import { cookies } from 'next/headers'
import { safeEqual, issueAdminToken, verifyAdminToken, SESSION_TTL_S } from './adminToken'

/**
 * Acceso al dataroom con una clave compartida, mismo esquema que el panel de
 * la lista de espera (ver `adminToken.ts`): cookie httpOnly con un token
 * firmado, nunca la clave en sí. Cookie y secreto propios (`DATAROOM_COOKIE`
 * / `DATAROOM_TOKEN`) para no compartir sesión ni rotación con el panel de
 * admin — son audiencias distintas (inversores vs. el dueño del sitio).
 */

export { SESSION_TTL_S, issueAdminToken as issueDataroomToken, safeEqual } from './adminToken'

export const DATAROOM_COOKIE = 'zyfit_dataroom'

/** ¿La request trae una cookie de sesión de dataroom válida y vigente? */
export async function isDataroomAuthed(): Promise<boolean> {
  const secret = process.env.DATAROOM_TOKEN
  if (!secret) return false
  const value = (await cookies()).get(DATAROOM_COOKIE)?.value
  if (!value) return false
  return verifyAdminToken(value, secret)
}
