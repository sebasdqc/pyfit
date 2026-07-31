import { cookies } from 'next/headers'
import { ADMIN_COOKIE, SESSION_TTL_S, getSql, issueAdminToken, safeEqual } from '../../../lib/waitlist'
import { ADMIN_LOGIN_RULE, clientIp, consumeRateLimit } from '../../../lib/rateLimit'

export const dynamic = 'force-dynamic'

/** Entrar al panel: guarda el token en una cookie httpOnly si la clave coincide. */
export async function POST(req: Request) {
  const expected = process.env.WAITLIST_ADMIN_TOKEN
  if (!expected) {
    return Response.json(
      { error: 'El panel no está configurado (falta WAITLIST_ADMIN_TOKEN).' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const password =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>).password : undefined

  // Límite por IP antes de comparar la clave: la demora de 400 ms de abajo
  // encarece el fuerza bruta pero no lo impide (400 ms en paralelo no es
  // nada). Cuenta también los intentos exitosos; con 5 cada 15 min el uso
  // normal del panel ni lo roza.
  try {
    const verdict = await consumeRateLimit(getSql(), {
      bucket: `admin-login:ip:${clientIp(req)}`,
      ...ADMIN_LOGIN_RULE,
    })
    if (!verdict.allowed) {
      return Response.json(
        { error: 'Demasiados intentos. Esperá unos minutos.' },
        { status: 429, headers: { 'Retry-After': String(verdict.retryAfterS) } },
      )
    }
  } catch (err) {
    // Fail closed: sin poder contar intentos no se deja entrar. Que un problema
    // de base bloquee el login es aceptable — el panel no sirve de nada sin la
    // base, que es de donde lee la lista.
    console.error('admin login rate limit failed', err)
    return Response.json({ error: 'El panel no está disponible ahora mismo.' }, { status: 503 })
  }

  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    // Pequeña demora: encarece el fuerza bruta sin molestar al uso normal.
    await new Promise((r) => setTimeout(r, 400))
    return Response.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  // Se guarda un token de sesión firmado, NUNCA la clave (ver `issueAdminToken`).
  ;(await cookies()).set(ADMIN_COOKIE, issueAdminToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_S,
  })

  return Response.json({ ok: true })
}

/** Salir del panel. */
export async function DELETE() {
  ;(await cookies()).delete(ADMIN_COOKIE)
  return Response.json({ ok: true })
}
