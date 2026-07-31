/**
 * Rate limit por IP, con Neon como almacén compartido entre invocaciones.
 *
 * Por qué Postgres y no Redis: la landing YA usa Neon en cada alta de la lista
 * de espera, así que no agrega ni un servicio que provisionar ni una variable
 * de entorno nueva, y funciona igual en Preview y en Producción. El volumen es
 * de una landing, no de una API: el costo de una query extra es irrelevante.
 *
 * Ventana deslizante, **sin tope global a propósito**. Un tope global (p. ej.
 * "300 altas por hora en total") suena más seguro pero regala un ataque de
 * disponibilidad: cualquiera puede gastarlo y dejar a la gente real sin poder
 * anotarse durante una hora. El riesgo que importa acá —un script metiendo
 * miles de direcciones ajenas para que se les mande correo— es por origen, y
 * el límite por IP ya lo corta.
 *
 * Módulo sin dependencias de Next (recibe el `sql` por parámetro) para poder
 * probarlo aislado, igual que `adminToken.ts`.
 */

/** Se borran las filas más viejas que esto. Debe ser >= la ventana más larga. */
export const RETENTION_S = 24 * 60 * 60

export type RateRule = {
  /** Identifica a quién se le cuenta. Convención: `<endpoint>:ip:<ip>`. */
  bucket: string
  /** Ventana en segundos. */
  windowS: number
  /** Cuántos intentos se permiten dentro de la ventana. */
  maxHits: number
}

export type RateVerdict = {
  allowed: boolean
  /** Intentos ya registrados en la ventana, antes de este. */
  hits: number
  /** Segundos hasta que se libere un lugar. Solo útil si `allowed` es false. */
  retryAfterS: number
}

/** Firma mínima del `sql` de `@neondatabase/serverless` que usa este módulo. */
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>

/** `POST /api/waitlist` — un alta real es una sola; 5/hora deja margen para NAT y typos. */
export const WAITLIST_RULE = { windowS: 60 * 60, maxHits: 5 } as const

/** `POST /api/admin/login` — solo lo usa el dueño del panel; 5 cada 15 min perdona typos. */
export const ADMIN_LOGIN_RULE = { windowS: 15 * 60, maxHits: 5 } as const

/**
 * IP del cliente. En Vercel estas dos cabeceras las pone la plataforma y
 * sobrescriben lo que manda el cliente, así que no se pueden falsear desde
 * afuera; el mismo orden que usa `@vercel/functions.ipAddress()`.
 *
 * Fuera de Vercel (`next dev`) no vienen, y todo cae en un único bucket
 * `sin-ip`. Es correcto para desarrollo y no debería pasar en producción.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const first = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (first) return first
  return 'sin-ip'
}

/**
 * Cuenta los intentos de `bucket` en la ventana y, **si no está bloqueado**,
 * registra este. Todo en una sola query: el conteo y el alta comparten
 * snapshot, así que no hay ventana entre "leer" y "escribir".
 *
 * No registrar el intento cuando ya está bloqueado es deliberado: mantiene la
 * cantidad de filas por bucket acotada a `maxHits`, así una inundación no puede
 * usar el propio limitador para inflar la tabla. El efecto es un balde con
 * fuga: quien está bloqueado recupera un lugar cada `windowS / maxHits`.
 *
 * Concurrencia: dos requests simultáneas pueden pasar las dos con el mismo
 * conteo. El exceso está acotado por la concurrencia real, no es ilimitado, y
 * para lo que protege esto es irrelevante.
 */
export async function consumeRateLimit(sql: Sql, rule: RateRule): Promise<RateVerdict> {
  if (rule.windowS > RETENTION_S) {
    throw new Error(`ventana de ${rule.windowS}s mayor que la retención de ${RETENTION_S}s`)
  }

  const run = () => sql`
    WITH purga AS (
      DELETE FROM rate_limit_hits
      WHERE hit_at < now() - (${RETENTION_S}::int * interval '1 second')
    ),
    ventana AS (
      SELECT hit_at FROM rate_limit_hits
      WHERE bucket = ${rule.bucket}
        AND hit_at > now() - (${rule.windowS}::int * interval '1 second')
    ),
    conteo AS (SELECT count(*)::int AS n FROM ventana),
    alta AS (
      INSERT INTO rate_limit_hits (bucket)
      SELECT ${rule.bucket} FROM conteo WHERE n < ${rule.maxHits}::int
      RETURNING 1
    )
    SELECT
      (SELECT n FROM conteo) AS hits,
      (SELECT count(*)::int FROM alta) AS registrados,
      COALESCE((
        SELECT ceil(extract(epoch FROM
          min(hit_at) + (${rule.windowS}::int * interval '1 second') - now()
        ))::int FROM ventana
      ), 0) AS retry_after_s
  `

  let rows: Record<string, unknown>[]
  try {
    rows = await run()
  } catch (err) {
    // 42P01 = la tabla no existe. Se crea y se reintenta una sola vez, así el
    // camino normal es UNA query y el esquema igual se autorrepara en cualquier
    // entorno o base nueva sin un paso manual.
    if (pgCode(err) !== '42P01') throw err
    await ensureSchema(sql)
    rows = await run()
  }

  const row = rows[0] ?? {}
  const hits = Number(row.hits ?? 0)
  return {
    allowed: Number(row.registrados ?? 0) > 0,
    hits,
    retryAfterS: Math.max(1, Number(row.retry_after_s ?? rule.windowS)),
  }
}

function pgCode(err: unknown): string | undefined {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : undefined
}

/** DDL de `rate_limit_hits`. Idempotente. Ver también `db/001_rate_limit_hits.sql`. */
export async function ensureSchema(sql: Sql): Promise<void> {
  // Sin clave primaria a propósito: la tabla es de alta rotación y nadie
  // referencia una fila; el índice compuesto es lo único que se consulta.
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limit_hits (
      bucket text NOT NULL,
      hit_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS rate_limit_hits_bucket_hit_at_idx
      ON rate_limit_hits (bucket, hit_at)
  `
}
