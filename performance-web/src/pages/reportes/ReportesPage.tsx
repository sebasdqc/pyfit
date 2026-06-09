// Módulo REPORTES. Genera informes exportables (PDF + CSV) del centro a partir de
// datos REALES: disponibilidad de plantilla, lesiones, tests, bienestar,
// cuestionarios y próximos eventos. La pantalla muestra una vista previa de lo
// que se va a exportar. El PDF se genera en el cliente con jspdf (import dinámico);
// el CSV abre nativo en Excel/Sheets. No incluye métricas sintéticas.

import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SquadState } from '@/components/ui/SquadState'
import { Spinner } from '@/components/ui/Spinner'
import { useSquad } from '@/centers/useSquad'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { ESTADO_LABEL, type Athlete } from '@/lib/mockSquad'
import { ESTADO_LESION, SEV_LABEL, TIPO_LABEL } from '@/lib/mockInjuries'
import {
  demoReportData, fetchReportData, latestWellnessByAthlete, type ReportData,
} from '@/lib/reportData'
import {
  downloadAthleteCsv, downloadAthletePdf, downloadTeamCsv, downloadTeamPdf,
  type ReportContext,
} from '@/lib/reportExport'

const todayISO = () => new Date().toISOString().slice(0, 10)

export function ReportesPage() {
  const { athletes: squad, loading, error, isRealRoster, centerId } = useSquad()
  const { activeCenter } = useActiveCenter()
  const centerName = activeCenter?.center_nombre ?? 'Tu centro deportivo'
  const noContent = loading || error || (isRealRoster && squad.length === 0)

  const [data, setData] = useState<ReportData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [tab, setTab] = useState<'equipo' | 'atleta'>('equipo')
  const [sel, setSel] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)

  // Carga los datos del informe (real → servidor; demo → stores locales).
  useEffect(() => {
    if (noContent) return
    let alive = true
    setLoadingData(true)
    const load = isRealRoster && centerId != null
      ? fetchReportData(centerId, squad)
      : Promise.resolve(demoReportData())
    load
      .then((d) => { if (alive) { setData(d); setLoadingData(false) } })
      .catch(() => { if (alive) { setData(demoReportData()); setLoadingData(false) } })
    return () => { alive = false }
  }, [isRealRoster, centerId, squad, noContent])

  useEffect(() => {
    if (squad.length && !squad.some((a) => a.id === sel)) setSel(squad[0].id)
  }, [squad, sel])

  const atleta = squad.find((a) => a.id === sel) ?? squad[0]
  const ctx: ReportContext | null = data ? { centerName, data, squad } : null

  async function exportPdf() {
    if (!ctx) return
    setPdfBusy(true)
    try {
      if (tab === 'equipo') await downloadTeamPdf(ctx)
      else if (atleta) await downloadAthletePdf(ctx, atleta)
    } finally {
      setPdfBusy(false)
    }
  }
  function exportCsv() {
    if (!ctx) return
    if (tab === 'equipo') downloadTeamCsv(ctx)
    else if (atleta) downloadAthleteCsv(ctx, atleta)
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Reportes</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">Informes exportables del centro · PDF y CSV (Excel)</p>
        </div>
        {!noContent && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={!ctx || loadingData}
              className="rounded-lg border border-perf-border bg-perf-surface2 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white disabled:opacity-40"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={!ctx || loadingData || pdfBusy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accentDark disabled:opacity-50"
            >
              {pdfBusy ? 'Generando…' : 'Exportar PDF'}
            </button>
          </div>
        )}
      </div>

      {noContent ? (
        <SquadState loading={loading} error={error} empty={isRealRoster && squad.length === 0} />
      ) : (
        <>
          {/* Selector de tipo de informe */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-surface p-0.5">
              {(['equipo', 'atleta'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    tab === t ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {t === 'equipo' ? 'Informe de equipo' : 'Informe por atleta'}
                </button>
              ))}
            </div>
            {tab === 'atleta' && (
              <select
                value={sel}
                onChange={(e) => setSel(e.target.value)}
                className="rounded-lg border border-perf-border bg-perf-surface2 px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
              >
                {squad.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            )}
          </div>

          {loadingData ? (
            <Panel title="Preparando informe">
              <div className="flex items-center gap-2.5 py-6 text-sm text-white/45">
                <Spinner size={18} />
                Cargando datos del centro…
              </div>
            </Panel>
          ) : !data ? null : tab === 'equipo' ? (
            <TeamPreview data={data} squad={squad} />
          ) : (
            <AthletePreview data={data} athlete={atleta} />
          )}
        </>
      )}
    </div>
  )
}

// ── Vista previa: EQUIPO ─────────────────────────────────────────────────────
function TeamPreview({ data, squad }: { data: ReportData; squad: Athlete[] }) {
  const stats = useMemo(() => {
    const ok = squad.filter((a) => a.estado === 'ok').length
    const duda = squad.filter((a) => a.estado === 'duda').length
    const baja = squad.filter((a) => a.estado === 'baja').length
    const activas = data.injuries.filter((i) => i.estado !== 'alta').length
    const latest = latestWellnessByAthlete(data)
    const idx = [...latest.values()].map((w) => w.indice_bienestar)
    const bienestar = idx.length ? Math.round(idx.reduce((s, n) => s + n, 0) / idx.length) : null
    return { ok, duda, baja, activas, bienestar }
  }, [data, squad])

  const nameOf = (id: string) => squad.find((a) => a.id === id)?.nombre ?? id
  const inj = data.injuries.filter((i) => i.estado !== 'alta')
  const evs = data.events
    .filter((e) => (e.fecha_fin ?? e.fecha_inicio) >= todayISO())
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
    .slice(0, 12)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Atletas" value={`${squad.length}`} />
        <Kpi label="Disponibles" value={`${stats.ok}`} />
        <Kpi label="En duda" value={`${stats.duda}`} />
        <Kpi label="No disponibles" value={`${stats.baja}`} />
        <Kpi label="Lesiones activas" value={`${stats.activas}`} />
        <Kpi label="Bienestar medio" value={stats.bienestar != null ? `${stats.bienestar}` : '—'} />
      </div>

      <Panel title="Disponibilidad de la plantilla" subtitle={`${squad.length} atletas`}>
        <Table
          head={['Atleta', 'Dorsal', 'Posición', 'Grupo', 'Estado']}
          rows={squad.map((a) => [a.nombre, a.dorsal || '—', a.posicion, a.grupo, ESTADO_LABEL[a.estado]])}
        />
      </Panel>

      <Panel title="Lesiones activas" subtitle={`${inj.length} parte(s)`}>
        <Table
          head={['Atleta', 'Zona', 'Tipo', 'Severidad', 'Estado', 'Días', 'RTP']}
          rows={inj.map((i) => [nameOf(i.athleteId), i.zona, TIPO_LABEL[i.tipo], SEV_LABEL[i.severidad], ESTADO_LESION[i.estado].label, `${i.diasBaja}d`, i.rtp])}
          empty="Sin lesiones activas."
        />
      </Panel>

      {evs.length > 0 && (
        <Panel title="Próximos eventos" subtitle={`${evs.length} en agenda`}>
          <Table
            head={['Fecha', 'Tipo', 'Evento', 'Detalle']}
            rows={evs.map((e) => [e.fecha_inicio, e.tipo, e.titulo, e.rival || e.ubicacion || e.grupo || '—'])}
          />
        </Panel>
      )}
    </>
  )
}

// ── Vista previa: ATLETA ─────────────────────────────────────────────────────
function AthletePreview({ data, athlete }: { data: ReportData; athlete?: Athlete }) {
  if (!athlete) return null
  const inj = data.injuries.filter((i) => i.athleteId === athlete.id)
  const tst = data.tests.filter((t) => t.athleteId === athlete.id)
  const wel = [...data.wellness.filter((w) => w.athleteId === athlete.id)].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12)
  const psy = data.psych.filter((p) => p.athleteId === athlete.id)

  return (
    <>
      <Panel title="Atleta">
        <div className="flex items-center gap-3">
          <Avatar name={athlete.nombre} src={athlete.foto} size={44} />
          <div>
            <p className="text-sm font-semibold text-white">{athlete.nombre}</p>
            <p className="text-xs text-white/45">
              Dorsal {athlete.dorsal || '—'} · {athlete.posicion} · {athlete.grupo} · {ESTADO_LABEL[athlete.estado]}
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Lesiones" subtitle={`${inj.length} registro(s)`}>
        <Table
          head={['Fecha', 'Zona', 'Tipo', 'Severidad', 'Estado', 'Días', 'RTP']}
          rows={inj.map((i) => [i.fecha, i.zona, TIPO_LABEL[i.tipo], SEV_LABEL[i.severidad], ESTADO_LESION[i.estado].label, `${i.diasBaja}d`, i.rtp])}
          empty="Sin lesiones registradas."
        />
      </Panel>

      <Panel title="Tests" subtitle={`${tst.length} registro(s)`}>
        <Table
          head={['Fecha', 'Test', 'Familia', 'Resumen']}
          rows={tst.map((t) => [t.fecha, t.nombre, t.familia, resumenTest(t.resultados)])}
          empty="Sin tests registrados."
        />
      </Panel>

      <Panel title="Bienestar" subtitle={`${wel.length} check-in(s)`}>
        <Table
          head={['Fecha', 'Índice', 'Estado']}
          rows={wel.map((w) => [w.fecha, `${w.indice_bienestar}`, w.estado])}
          empty="Sin check-ins de bienestar."
        />
      </Panel>

      <Panel title="Cuestionarios" subtitle={`${psy.length} evaluación(es)`}>
        <Table
          head={['Fecha', 'Instrumento', 'Índice', 'Interpretación']}
          rows={psy.map((p) => [p.fecha, p.nombre, `${p.resultados.indice}`, p.resultados.indice_label])}
          empty="Sin cuestionarios registrados."
        />
      </Panel>
    </>
  )
}

function resumenTest(resultados: Record<string, unknown>): string {
  return Object.entries(resultados)
    .filter(([, v]) => v === null || typeof v !== 'object')
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v === null ? '—' : v}`)
    .join(' · ') || '—'
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function Table({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty?: string }) {
  if (rows.length === 0) {
    return <p className="py-2 text-sm text-white/40">{empty ?? 'Sin registros.'}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-perf-border text-[11px] uppercase tracking-wide text-white/40">
            {head.map((h) => <th key={h} className="px-2 py-2 font-medium first:pl-0">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-perf-border/60">
          {rows.map((r, i) => (
            <tr key={i} className="text-white/80">
              {r.map((c, j) => <td key={j} className="px-2 py-2 first:pl-0">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
