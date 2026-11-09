// Producción de medios — SOLO admin (academy.media_ops_service).
// Casi la mitad de las lecciones son de video o audio y nacieron solo con su
// guion. Esta página convierte esa deuda en una cola de trabajo: por curso,
// cuántas faltan y, de cada una, cuánto dura el guion (≈ lo que hay que grabar).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminMedios } from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import { Panel, PanelEmpty, StatCard, StatRow, num } from '@/components/admin/AdminBits'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import type { AdminMedios } from '@/types'

function horas(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function AdminMediaPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminMedios | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [abierto, setAbierto] = useState<number | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!user?.is_admin) return
    setLoading(true)
    setError(false)
    getAdminMedios()
      .then((d) => { setData(d); setAbierto((prev) => prev ?? d.cursos.find((c) => c.pendientes.length)?.course_id ?? null) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [reload, user?.is_admin])

  if (!user?.is_admin) {
    return <EmptyState icon="shield" title="Área de administración" description="Solo los administradores pueden ver la producción de medios." />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <header className="border-b border-surface-border pb-5">
        <Link to="/admin/metricas" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
          <Icon name="chevronLeft" size={16} /> Métricas
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Producción de medios</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Lecciones de video y audio de cursos publicados. Mientras no tengan archivo, el alumno solo ve su guion.
          Para anexar un medio abre el curso y usa «Anexar video» en la lección.
        </p>
      </header>

      {loading && !data ? (
        <div className="flex justify-center py-20"><Spinner size={40} /></div>
      ) : error ? (
        <EmptyState
          icon="activity"
          title="No se pudo cargar la producción de medios"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={<button onClick={() => setReload((v) => v + 1)} className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">Reintentar</button>}
        />
      ) : data && (
        <>
          <StatRow>
            <StatCard label="Con medio cargado" value={`${data.avance}%`} detail={`${num(data.con_medio)} de ${num(data.total)} lecciones`} icon="check" tone={data.avance === 100 ? 'ok' : 'neutral'} />
            <StatCard label="Por producir" value={num(data.pendientes)} detail="video y audio sin archivo" icon="play" tone={data.pendientes ? 'warn' : 'neutral'} />
            <StatCard label="Por grabar" value={horas(data.minutos_por_grabar)} detail="estimado según el largo de cada guion" icon="clock" />
            <StatCard label="Con subtítulos" value={num(data.con_subtitulos)} detail={`de ${num(data.con_medio)} con medio`} icon="doc" />
          </StatRow>

          <div className="h-2 overflow-hidden rounded-full bg-surface-border" role="progressbar" aria-valuenow={data.avance} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de producción de medios">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${data.avance}%` }} />
          </div>

          <Panel id="medios-title" title="Por curso" subtitle="Abre un curso para ver sus lecciones pendientes. El tiempo es una estimación a ~150 palabras por minuto.">
            {data.cursos.length === 0 ? <PanelEmpty message="No hay lecciones de video o audio en cursos publicados." /> : (
              <ul className="divide-y divide-surface-border">
                {data.cursos.map((c) => {
                  const pct = c.total ? Math.round((c.con_medio * 100) / c.total) : 0
                  const abiertoAhora = abierto === c.course_id
                  return (
                    <li key={c.course_id}>
                      <button
                        type="button"
                        onClick={() => setAbierto(abiertoAhora ? null : c.course_id)}
                        aria-expanded={abiertoAhora}
                        className="grid w-full gap-2 px-5 py-3.5 text-left hover:bg-surface-soft/60 sm:grid-cols-[minmax(0,1fr)_12rem_9rem_1.5rem] sm:items-center"
                      >
                        <span className="truncate text-sm font-medium text-ink">{c.curso}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-surface-soft" aria-hidden="true">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="text-xs text-ink-muted">{c.con_medio}/{c.total} con medio</span>
                        <Icon name="chevronDown" size={16} className={`text-ink-muted transition-transform ${abiertoAhora ? 'rotate-180' : ''}`} />
                      </button>
                      {abiertoAhora && (
                        <div className="border-t border-surface-border bg-surface-soft/40 px-5 py-3">
                          {c.pendientes.length === 0 ? (
                            <p className="py-2 text-sm text-ok">Todas las lecciones de este curso tienen medio.</p>
                          ) : (
                            <>
                              <table className="w-full min-w-[520px] text-sm">
                                <thead>
                                  <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                                    <th className="py-2 font-semibold">Lección</th>
                                    <th className="py-2 font-semibold">Tipo</th>
                                    <th className="py-2 text-right font-semibold">Guion</th>
                                    <th className="py-2 text-right font-semibold">Grabar</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-border">
                                  {c.pendientes.map((l) => (
                                    <tr key={l.lesson_id}>
                                      <td className="py-2 pr-3"><p className="font-medium text-ink">{l.titulo}</p><p className="text-xs text-ink-muted">{l.modulo}</p></td>
                                      <td className="py-2 pr-3"><Badge tone={l.tipo === 'video' ? 'accent' : 'neutral'}>{l.tipo === 'video' ? 'Video' : 'Audio'}</Badge></td>
                                      <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{num(l.guion_palabras)} palabras</td>
                                      <td className="py-2 text-right tabular-nums text-ink-soft">{l.minutos_estimados ? `~${l.minutos_estimados} min` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <Link to={`/instructor/cursos/${c.course_id}/contenido`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-dark">
                                Abrir el curso para anexar medios <Icon name="arrowRight" size={13} />
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
