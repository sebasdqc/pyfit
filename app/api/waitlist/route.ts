import { neon } from '@neondatabase/serverless'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sql = getSql()
    const rows = await sql`SELECT COUNT(*)::int AS count FROM waitlist_signups`
    return Response.json(
      { count: rows[0]?.count ?? 0 },
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

  try {
    await sql`INSERT INTO waitlist_signups (email) VALUES (${normalized})`
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined
    if (code === '23505') {
      return Response.json({ ok: true, already: true })
    }
    console.error('waitlist insert failed', err)
    return Response.json({ error: 'No pudimos guardar tu email, intenta de nuevo.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
