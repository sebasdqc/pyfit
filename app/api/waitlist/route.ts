import { getSql, getWaitlistCount } from '../../lib/waitlist'
import { WAITLIST_RULE, clientIp, consumeRateLimit } from '../../lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json(
      { count: await getWaitlistCount() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('waitlist count failed', err)
    return Response.json({ error: 'No pudimos leer el contador.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const email = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).email : undefined
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return Response.json({ error: 'Email inválido' }, { status: 400 })
  }

  const normalized = email.trim().toLowerCase()
  const sql = getSql()

  // Límite por IP. Va DESPUÉS de validar el formato para que un typo no gaste
  // cupo, y ANTES del INSERT: sin esto, un script puede meter miles de
  // direcciones ajenas, y el día que se enchufe el envío de email eso quema la
  // reputación del dominio.
  try {
    const verdict = await consumeRateLimit(sql, { bucket: `waitlist:ip:${clientIp(req)}`, ...WAITLIST_RULE })
    if (!verdict.allowed) {
      return Response.json(
        { error: 'Demasiados intentos desde esta conexión. Prueba de nuevo en un rato.' },
        { status: 429, headers: { 'Retry-After': String(verdict.retryAfterS) } },
      )
    }
  } catch (err) {
    // Fail closed: si no se puede contar, no se guarda. La alternativa deja el
    // endpoint abierto justo cuando la base tiene problemas — y el INSERT de
    // abajo iba a fallar igual.
    console.error('waitlist rate limit failed', err)
    return Response.json({ error: 'No pudimos guardar tu email, intenta de nuevo.' }, { status: 503 })
  }

  try {
    await sql`INSERT INTO waitlist_signups (email) VALUES (${normalized})`
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined
    // Email repetido (unique violation): se responde EXACTAMENTE igual que un
    // alta nueva. Distinguirlos (antes: `{ok:true, already:true}`) convertía
    // este endpoint en un oráculo para averiguar si una dirección concreta
    // está en la lista.
    if (code !== '23505') {
      console.error('waitlist insert failed', err)
      return Response.json({ error: 'No pudimos guardar tu email, intenta de nuevo.' }, { status: 500 })
    }
  }

  return Response.json({ ok: true })
}
