import { cookies } from 'next/headers'
import { DATAROOM_COOKIE, SESSION_TTL_S, issueDataroomToken, safeEqual } from '../../../lib/dataroom'
import { DATAROOM_LOGIN_RULE, clientIp, consumeRateLimit } from '../../../lib/rateLimit'
import { getSql } from '../../../lib/waitlist'

export const dynamic = 'force-dynamic'

/** Entrar al dataroom: guarda el token en una cookie httpOnly si la clave coincide. */
export async function POST(req: Request) {
  const expected = process.env.DATAROOM_TOKEN
  if (!expected) {
    return Response.json({ error: 'El dataroom no está configurado (falta DATAROOM_TOKEN).' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const password =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>).password : undefined

  try {
    const verdict = await consumeRateLimit(getSql(), {
      bucket: `dataroom-login:ip:${clientIp(req)}`,
      ...DATAROOM_LOGIN_RULE,
    })
    if (!verdict.allowed) {
      return Response.json(
        { error: 'Demasiados intentos. Esperá unos minutos.' },
        { status: 429, headers: { 'Retry-After': String(verdict.retryAfterS) } },
      )
    }
  } catch (err) {
    console.error('dataroom login rate limit failed', err)
    return Response.json({ error: 'El dataroom no está disponible ahora mismo.' }, { status: 503 })
  }

  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    await new Promise((r) => setTimeout(r, 400))
    return Response.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  ;(await cookies()).set(DATAROOM_COOKIE, issueDataroomToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_S,
  })

  return Response.json({ ok: true })
}

/** Salir del dataroom. */
export async function DELETE() {
  ;(await cookies()).delete(DATAROOM_COOKIE)
  return Response.json({ ok: true })
}
