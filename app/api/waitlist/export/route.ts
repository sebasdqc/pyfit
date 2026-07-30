import { isAdmin, listWaitlistSignups } from '../../../lib/waitlist'

export const dynamic = 'force-dynamic'

/** Escapa un campo para CSV (comillas dobles duplicadas). */
function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

/** Descarga de la lista de espera en CSV. Requiere cookie de admin. */
export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const rows = await listWaitlistSignups()
  const csv = [
    'email,fecha_alta',
    ...rows.map((r) => `${csvCell(r.email)},${csvCell(new Date(r.created_at).toISOString())}`),
  ].join('\n')

  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="zyfit-lista-de-espera.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
