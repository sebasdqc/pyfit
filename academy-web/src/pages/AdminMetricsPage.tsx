// Panel de gestión de la academia — SOLO admin (academy.admin_billing_views).
// Cuatro preguntas del negocio: ¿cómo va la academia?, ¿cómo van los
// estudiantes?, ¿se quedan?, ¿cuánto entra y cuánto se va? Todo son
// agregados: nunca filas por estudiante. Las definiciones (qué es "activo",
// qué es una cohorte) se muestran junto al dato para no malinterpretarlo.

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAdminMetricas } from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import {
  BarList, Callout, ColumnChart, Panel, PanelEmpty, StatCard, StatRow, Variation,
  fechaCorta, num, usd,
} from '@/components/admin/AdminBits'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import type { AdminMetricas, AdminPeriodo } from '@/types'

const PERIODOS: AdminPeriodo[] = [7, 30, 90]
const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'estudiantes', label: 'Estudiantes' },
  { id: 'retencion', label: 'Retención' },
  { id: 'finanzas', label: 'Finanzas' },
] as const
type TabId = (typeof TABS)[number]['id']

const METODO_LABEL: Record<string, string> = {
  transferencia: 'Transferencia', pago_movil: 'Pago móvil', zelle: 'Zelle',
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', otro: 'Otro',
}
const PLAN_LABEL: Record<string, string> = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' }

export function AdminMetricsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: TabId = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as TabId) : 'resumen'
  const [dias, setDias] = useState<AdminPeriodo>(30)
  const [data, setData] = useState<AdminMetricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!user?.is_admin) return
    setLoading(true)
    setError(false)
    getAdminMetricas(dias)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [dias, reload, user?.is_admin])

  if (!user?.is_admin) {
    return <EmptyState icon="shield" title="Área de administración" description="Solo los administradores pueden ver las métricas de la academia." />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-surface-border pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Métricas de la academia</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Rendimiento, estudiantes, retención y finanzas de tu organización. Solo datos agregados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/cobros"
            className="inline-flex h-10 items-center rounded-xl border border-surface-border px-4 text-sm font-semibold text-ink hover:border-accent hover:text-accent"
          >
            Gestionar cobros
          </Link>
          <Link
            to="/admin/medios"
            className="inline-flex h-10 items-center rounded-xl border border-surface-border px-4 text-sm font-semibold text-ink hover:border-accent hover:text-accent"
          >
            Producción de medios
          </Link>
          <div role="group" aria-label="Período" className="inline-flex rounded-xl border border-surface-border p-1">
            {PERIODOS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={dias === p}
                onClick={() => setDias(p)}
                className={`h-8 rounded-lg px-3 text-sm font-semibold ${dias === p ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'}`}
              >
                {p} días
              </button>
            ))}
          </div>
        </div>
      </header>

      <div role="tablist" aria-label="Secciones" className="flex gap-1 overflow-x-auto border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id })}
            className={`-mb-px h-10 shrink-0 border-b-2 px-4 text-sm font-semibold ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-20"><Spinner size={40} /></div>
      ) : error ? (
        <EmptyState
          icon="activity"
          title="No se pudieron cargar las métricas"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={<button onClick={() => setReload((v) => v + 1)} className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">Reintentar</button>}
        />
      ) : data ? (
        <div className={`flex flex-col gap-6 transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`} role="tabpanel">
          {tab === 'resumen' && <Resumen d={data} />}
          {tab === 'estudiantes' && <Estudiantes d={data} />}
          {tab === 'retencion' && <Retencion d={data} />}
          {tab === 'finanzas' && <Finanzas d={data} />}
        </div>
      ) : null}
    </div>
  )
}

function Resumen({ d }: { d: AdminMetricas }) {
  const { resumen: r, estudiantes: e, finanzas: f, cursos: c } = d
  return (
    <>
      <StatRow>
        <StatCard label="Estudiantes" value={num(r.estudiantes)} detail={`${num(e.nuevos)} nuevos en ${d.periodo.dias} días`} icon="users" />
        <StatCard label="Matrículas" value={num(r.matriculas)} detail={`${num(r.matriculas_periodo)} en el período`} icon="layers" />
        <StatCard label="Finalización" value={`${r.tasa_finalizacion}%`} detail={`${num(r.completadas)} cursos completados`} icon="check" />
        <StatCard label="Cursos publicados" value={num(r.cursos_publicados)} detail={c.sin_matriculas ? `${c.sin_matriculas} sin matrículas` : 'Todos con matrículas'} icon="library" tone={c.sin_matriculas ? 'warn' : 'neutral'} />
      </StatRow>
      <StatRow>
        <StatCard label="Activos (30 días)" value={num(e.activos_30d)} detail={`${num(e.activos_7d)} en los últimos 7 días`} icon="activity" />
        <StatCard label="Certificados" value={num(r.certificados_periodo)} detail={`emitidos en ${d.periodo.dias} días`} icon="certificate" />
        <StatCard label={`Ingresos (${d.periodo.dias} días)`} value={usd(f.ingresos_periodo)} detail={<Variation value={f.ingresos_variacion} />} icon="star" />
        <StatCard label="Suscriptores Pro" value={num(f.suscriptores_activos)} detail={`${f.conversion_a_pago}% de los estudiantes`} icon="rocket" />
      </StatRow>

      {r.visitantes_anonimos && (
        <p className="rounded-2xl border border-surface-border bg-surface-soft/60 px-5 py-3 text-sm text-ink-soft">
          Visitantes que probaron sin registrarse: <strong className="text-ink">{num(r.visitantes_anonimos.sesiones)}</strong>,
          de los cuales <strong className="text-ink">{num(r.visitantes_anonimos.convertidas)}</strong> crearon cuenta
          ({r.visitantes_anonimos.conversion}%).
        </p>
      )}

      <Aprendizaje d={d} />

      <Panel id="cursos-title" title="Cursos" subtitle="Ordenados por matrículas. Una finalización baja con muchas matrículas suele indicar contenido que cuesta terminar." aside={`${c.total_publicados} publicados`}>
        {c.filas.length === 0 ? <PanelEmpty message="Aún no hay cursos publicados." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Curso</th>
                  <th className="px-3 py-3 text-right font-semibold">Matrículas</th>
                  <th className="px-3 py-3 text-right font-semibold">Finalización</th>
                  <th className="px-3 py-3 text-right font-semibold">Progreso prom.</th>
                  <th className="px-3 py-3 text-right font-semibold">Aprobación quiz</th>
                  <th className="px-5 py-3 text-right font-semibold" title="Diferencia entre la evaluación final y el diagnóstico inicial">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {c.filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-ink">{fila.titulo}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{num(fila.matriculas)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{fila.matriculas ? `${fila.tasa_finalizacion}%` : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{fila.matriculas ? `${fila.progreso_promedio}%` : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{fila.quiz_intentos ? `${fila.quiz_aprobacion}%` : '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-soft">{fila.ganancia === null ? '—' : `${fila.ganancia > 0 ? '+' : ''}${fila.ganancia} pts`}{fila.ganancia !== null && <span className="block text-[11px] text-ink-muted">{fila.evaluados} alumno(s)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}

function Estudiantes({ d }: { d: AdminMetricas }) {
  const e = d.estudiantes
  const serie = e.serie_nuevos.map((p) => ({ label: fechaCorta(p.fecha), value: p.nuevos }))
  return (
    <>
      <StatRow>
        <StatCard label="Estudiantes totales" value={num(e.total)} detail="con al menos una matrícula" icon="users" />
        <StatCard label={`Nuevos (${d.periodo.dias} días)`} value={num(e.nuevos)} detail={<Variation value={e.nuevos_variacion} />} icon="plus" />
        <StatCard label="Activos hoy" value={num(e.activos_hoy)} detail={`${num(e.activos_7d)} esta semana · ${num(e.activos_30d)} este mes`} icon="activity" />
        <StatCard label="En riesgo" value={num(e.en_riesgo)} detail={`matrícula activa y ${e.dias_en_riesgo}+ días sin estudiar`} icon="clock" tone={e.en_riesgo ? 'warn' : 'neutral'} />
      </StatRow>
      <StatRow cols={3}>
        <StatCard label="Frecuencia de uso" value={`${e.stickiness}%`} detail={`${e.dau_promedio_30d} activos por día de ${num(e.activos_30d)} del mes`} icon="flame" />
        <StatCard label="Lecciones completadas" value={num(e.lecciones_completadas)} detail={`en ${d.periodo.dias} días`} icon="doc" />
        <StatCard label="Quizzes" value={num(e.quiz_intentos)} detail={`${e.quiz_aprobacion}% de intentos aprobados`} icon="quiz" />
      </StatRow>
      {e.sin_verificar > 0 && (
        <Callout title={`${num(e.sin_verificar)} estudiante(s) con el correo sin verificar`}>
          Pueden usar la academia, pero no pueden recuperar su cuenta ni recibir avisos hasta confirmar su correo.
        </Callout>
      )}
      <Panel id="nuevos-title" title="Nuevos estudiantes por día" subtitle="Cuenta la primera matrícula de cada persona." aside={`${d.periodo.dias} días`}>
        <ColumnChart items={serie} labelEvery={d.periodo.dias <= 7 ? 1 : d.periodo.dias <= 30 ? 5 : 15} label="Nuevos estudiantes por día" />
      </Panel>
      <p className="text-xs leading-5 text-ink-muted">
        «Activo» = estudió ese día (completó una lección o rindió un quiz). Abrir la app o navegar el catálogo no cuenta.
        «Frecuencia de uso» es el promedio de activos por día dividido entre los activos del mes: cuanto más alto, más seguido vuelven.
      </p>
    </>
  )
}

function Retencion({ d }: { d: AdminMetricas }) {
  const r = d.retencion
  const semanas = Array.from({ length: r.semanas }, (_, i) => i)
  return (
    <>
      <StatRow cols={3}>
        <StatCard label="Vuelven la semana siguiente" value={r.retencion_semana_1 === null ? '—' : `${r.retencion_semana_1}%`} detail="promedio de las cohortes con datos" icon="flame" />
        <StatCard label="En riesgo ahora" value={num(d.estudiantes.en_riesgo)} detail={`${d.estudiantes.dias_en_riesgo}+ días sin estudiar`} icon="clock" tone={d.estudiantes.en_riesgo ? 'warn' : 'neutral'} />
        <StatCard label="Frecuencia de uso" value={`${d.estudiantes.stickiness}%`} detail="activos por día / activos del mes" icon="activity" />
      </StatRow>
      <Panel id="cohortes-title" title="Retención por cohorte semanal" subtitle="De los estudiantes que se matricularon por primera vez cada semana, ¿qué porcentaje estudió en las semanas siguientes?">
        {r.cohortes.every((c) => c.tamano === 0) ? <PanelEmpty message="Todavía no hay estudiantes en las últimas 8 semanas." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3 text-left font-semibold">Semana</th>
                  <th className="px-2 py-3 text-right font-semibold">Estudiantes</th>
                  {semanas.map((s) => <th key={s} className="px-1 py-3 text-center font-semibold">Sem. {s}</th>)}
                </tr>
              </thead>
              <tbody>
                {r.cohortes.map((c) => (
                  <tr key={c.semana} className="border-t border-surface-border">
                    <td className="px-5 py-2 text-ink">{fechaCorta(c.semana)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-ink-soft">{num(c.tamano)}</td>
                    {semanas.map((s) => {
                      const v = c.retencion[s]
                      if (v === undefined || v === null) return <td key={s} className="px-1 py-2 text-center text-ink-muted">·</td>
                      return (
                        <td key={s} className="px-1 py-1.5 text-center">
                          <span
                            className={`block rounded-md py-1.5 text-xs font-semibold tabular-nums ${v >= 55 ? 'text-white' : 'text-ink'}`}
                            style={{ backgroundColor: `rgb(var(--color-accent) / ${Math.max(0.06, v / 100)})` }}
                          >
                            {v}%
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-xs leading-5 text-ink-muted">
        La semana 0 es la de la primera matrícula. Una celda con «·» todavía no ocurrió. Cohortes con pocos estudiantes
        oscilan mucho: mira la tendencia, no un solo número.
      </p>
    </>
  )
}

function Finanzas({ d }: { d: AdminMetricas }) {
  const f = d.finanzas
  const serie = f.serie_mensual.map((m) => ({
    label: new Date(`${m.mes}T00:00:00`).toLocaleDateString('es', { month: 'short' }),
    value: m.ingresos,
  }))
  const avisos = []
  if (f.solicitudes_pendientes) avisos.push(
    <Callout key="sol" title={`${f.solicitudes_pendientes} solicitud(es) de Pro esperando cobro`}>
      <Link to="/admin/cobros" className="font-semibold text-accent hover:text-accent-dark">Revisarlas en Cobros</Link>
    </Callout>,
  )
  if (f.vencidos_sin_marcar) avisos.push(
    <Callout key="venc" tone="danger" title={`${f.vencidos_sin_marcar} suscripción(es) con el período vencido`}>
      Ya no dan acceso Pro. Registra su renovación si pagaron.
    </Callout>,
  )
  if (f.por_vencer_7d) avisos.push(
    <Callout key="pv" title={`${f.por_vencer_7d} suscripción(es) vencen en 7 días`}>
      {f.por_vencer_30d} en los próximos 30 días.
    </Callout>,
  )
  if (f.suscriptores_sin_pago_registrado) avisos.push(
    <Callout key="sp" title={`${f.suscriptores_sin_pago_registrado} suscriptor(es) sin pago registrado`}>
      Tienen Pro pero ningún cobro en el libro (otorgados a mano): no suman al MRR.
    </Callout>,
  )
  if (f.comisiones_pendientes > 0) avisos.push(
    <Callout key="com" title={`${usd(f.comisiones_pendientes)} en comisiones de influencers por pagar`}>
      De cobros confirmados con código de descuento.
    </Callout>,
  )

  return (
    <>
      <StatRow>
        <StatCard label={`Ingresos (${d.periodo.dias} días)`} value={usd(f.ingresos_periodo)} detail={<Variation value={f.ingresos_variacion} />} icon="star" />
        <StatCard label="MRR" value={usd(f.mrr)} detail={`ARR ${usd(f.arr)}`} icon="activity" />
        <StatCard label="Suscriptores activos" value={num(f.suscriptores_activos)} detail={`${f.conversion_a_pago}% de los estudiantes`} icon="users" />
        <StatCard label="ARPU" value={usd(f.arpu)} detail="MRR por suscriptor con pago" icon="rocket" />
      </StatRow>
      <StatRow>
        <StatCard label="Altas" value={num(f.altas_periodo)} detail={`nuevos suscriptores en ${d.periodo.dias} días`} icon="plus" />
        <StatCard label="Renovaciones" value={num(f.renovaciones_periodo)} detail="pagos de quien ya había pagado" icon="check" />
        <StatCard label="Bajas" value={num(f.bajas_periodo)} detail={`${f.cancelados_con_acceso} cancelaron y aún tienen acceso`} icon="clock" tone={f.bajas_periodo ? 'warn' : 'neutral'} />
        <StatCard label="Churn (aprox.)" value={f.churn_aprox === null ? '—' : `${f.churn_aprox}%`} detail={f.churn_aprox === null ? 'sin suscriptores al inicio del período' : 'bajas / suscriptores al inicio'} icon="flame" tone={f.churn_aprox !== null && f.churn_aprox >= 10 ? 'danger' : 'neutral'} />
      </StatRow>

      {avisos.length > 0 && <section className="grid gap-3 lg:grid-cols-2" aria-label="Avisos de cobros">{avisos}</section>}

      <Panel id="ingresos-title" title="Ingresos por mes" subtitle="Cobros confirmados, por fecha de pago." aside={`Histórico ${usd(f.ingresos_historico)}`}>
        <ColumnChart items={serie} format={usd} label="Ingresos por mes" />
        <p className="border-t border-surface-border px-5 py-3 text-sm text-ink-soft">
          Este mes: <strong className="text-ink">{usd(f.ingresos_mes_actual)}</strong> · mes anterior: <strong className="text-ink">{usd(f.ingresos_mes_anterior)}</strong>
        </p>
      </Panel>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel id="metodo-title" title="Por método de pago" aside={`${d.periodo.dias} días`}>
          {f.por_metodo.length === 0 ? <PanelEmpty message="Sin cobros en el período." /> : (
            <BarList items={f.por_metodo.map((m) => ({ label: METODO_LABEL[m.metodo] ?? m.metodo, value: m.ingresos, hint: `${m.pagos} pago(s)` }))} format={usd} />
          )}
        </Panel>
        <Panel id="plan-title" title="Por plan" aside={`${d.periodo.dias} días`}>
          {f.por_plan.length === 0 ? <PanelEmpty message="Sin cobros en el período." /> : (
            <BarList items={f.por_plan.map((m) => ({ label: PLAN_LABEL[m.plan] ?? m.plan, value: m.ingresos, hint: `${m.pagos} pago(s)` }))} format={usd} />
          )}
        </Panel>
      </section>

      <p className="text-xs leading-5 text-ink-muted">
        Los ingresos salen del libro de pagos (cobros confirmados, sin los anulados). MRR = cada suscriptor vigente con su
        último pago llevado a mes (trimestral ÷ 3, anual ÷ 12). Churn es aproximado: las bajas del período entre los
        suscriptores que había al inicio.
      </p>
    </>
  )
}

function Aprendizaje({ d }: { d: AdminMetricas }) {
  const a = d.aprendizaje
  const sinDatos = a.diagnosticos === 0 && a.finales === 0
  return (
    <Panel
      id="aprendizaje-title"
      title="Evidencia de aprendizaje"
      subtitle="¿Los cursos enseñan? Diagnóstico al empezar y evaluación final con las mismas preguntas; la diferencia es lo aprendido."
      aside={`${num(a.con_ambas)} alumno(s) con ambas`}
    >
      {sinDatos ? (
        <PanelEmpty message="Aún nadie ha hecho el diagnóstico inicial. Aparecerá una invitación al abrir un curso nuevo." />
      ) : (
        <div className="grid divide-y divide-surface-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <StatCard label="Puntaje al empezar" value={a.puntaje_diagnostico === null ? '—' : `${a.puntaje_diagnostico}%`} detail={`${num(a.diagnosticos)} diagnósticos`} icon="flag" />
          <StatCard label="Puntaje al terminar" value={a.puntaje_final === null ? '—' : `${a.puntaje_final}%`} detail={`${num(a.finales)} evaluaciones finales`} icon="check" />
          <StatCard label="Ganancia promedio" value={a.ganancia_promedio === null ? '—' : `${a.ganancia_promedio > 0 ? '+' : ''}${a.ganancia_promedio} pts`} detail="solo alumnos con ambas medidas" icon="activity" tone={a.ganancia_promedio !== null && a.ganancia_promedio <= 0 ? 'warn' : 'ok'} />
          <StatCard label="Ganancia normalizada" value={a.ganancia_normalizada === null ? '—' : `${a.ganancia_normalizada}%`} detail="de lo que faltaba por aprender" icon="star" />
        </div>
      )}
      <p className="border-t border-surface-border px-5 py-3 text-sm text-ink-soft">
        Repaso espaciado: <strong className="text-ink">{num(a.repaso.estudiantes_repasando)}</strong> estudiante(s) repasaron en el período ·{' '}
        <strong className="text-ink">{num(a.repaso.preguntas_en_mazo)}</strong> preguntas en mazos ·{' '}
        <strong className="text-ink">{num(a.repaso.dominadas)}</strong> dominadas.
      </p>
    </Panel>
  )
}
