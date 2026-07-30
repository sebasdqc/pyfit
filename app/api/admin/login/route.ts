import { cookies } from 'next/headers'
import { ADMIN_COOKIE, safeEqual } from '../../../lib/waitlist'

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

  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    // Pequeña demora: encarece el fuerza bruta sin molestar al uso normal.
    await new Promise((r) => setTimeout(r, 400))
    return Response.json({ error: 'Clave incorrecta' }, { status: 401 })
  }

  ;(await cookies()).set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return Response.json({ ok: true })
}

/** Salir del panel. */
export async function DELETE() {
  ;(await cookies()).delete(ADMIN_COOKIE)
  return Response.json({ ok: true })
}
