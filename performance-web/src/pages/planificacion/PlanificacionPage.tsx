// Módulo PLANIFICACIÓN. Planificador de periodización clásica de equipo:
// Macrociclo (temporada) → Mesociclos (fases) → Microciclos (semanas). Todo es
// API real, acotado al centro del usuario. La "onda de carga" dibuja la carga
// relativa de cada semana a lo largo del macrociclo; cada semana es editable.

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/auth/useAuth'
import {
  listPlans, createPlan, getPlanTree, deletePlan,
  createMeso, deleteMeso, createMicro, updateMicro, deleteMicro, listCenters,
} from '@/api/performance'
import type {
  TrainingPlan, TrainingPlanDetail, Mesocycle, Microcycle,
  MesoTipo, MicroTipo, CargaObjetivo, Nivel,
} from '@/types'

// ── Catálogos de etiquetas y colores ────────────────────────────────────────
const MESO_TIPO: Record<MesoTipo, { label: string; hex: string }> = {
  prep_general: { label: 'Preparación general', hex: '#4f8cff' },
  prep_especifica: { label: 'Preparación específica', hex: '#6ce5ff' },
  precompetitivo: { label: 'Precompetitivo', hex: '#ffaa32' },
  competitivo: { label: 'Competitivo', hex: '#32c896' },
  transicion: { label: 'Transición', hex: '#5a6b8c' },
}
const MICRO_TIPO: Record<MicroTipo, { label: string; hex: string }> = {
  ajuste: { label: 'Ajuste', hex: '#6ce5ff' },
  carga: { label: 'Carga', hex: '#4f8cff' },
  choque: { label: 'Choque', hex: '#ff4444' },
  activacion: { label: 'Activación', hex: '#7ab6ff' },
  competitivo: { label: 'Competitivo', hex: '#32c896' },
  recuperacion: { label: 'Recuperación', hex: '#5a6b8c' },
}
const CARGA_OBJ: Record<CargaObjetivo, string> = { baja: 'Baja', media: 'Media', alta: 'Alta', pico: 'Pico' }
const NIVEL: Record<Nivel, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' }
const today = () => new Date().toISOString().slice(0, 10)

export function PlanificacionPage() {
  const { user } = useAuth()
  // Centros del usuario: de su membresía o, si es admin sin membresía, los listamos.
  const [centers, setCenters] = useState<{ id: number; nombre: string }[]>(
    () => (user?.centros ?? []).map((c) => ({ id: c.center_id, nombre: c.center_nombre })),
  )
  const [centerId, setCenterId] = useState<number | null>(user?.centros?.[0]?.center_id ?? null)

  useEffect(() => {
    if (centers.length === 0) {
      listCenters().then((cs) => {
        const mapped = cs.map((c) => ({ id: c.id, nombre: c.nombre }))
        setCenters(mapped)
        setCenterId((prev) => prev ?? mapped[0]?.id ?? null)
      }).catch(() => { /* sin centros visibles */ })
    }
  }, [centers.length])

  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [plansErr, setPlansErr] = useState('')
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tree, setTree] = useState<TrainingPlanDetail | null>(null)

  // Cargar macrociclos del centro.
  useEffect(() => {
    if (centerId == null) return
    setLoadingPlans(true); setPlansErr('')
    listPlans(centerId)
      .then((data) => { setPlans(data); if (!selectedId && data[0]) setSelectedId(data[0].id) })
      .catch(() => setPlansErr('No se pudieron cargar los planes. Revisa tu sesión.'))
      .finally(() => setLoadingPlans(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId])

  // Cargar el árbol del macrociclo seleccionado.
  useEffect(() => {
    if (centerId == null || selectedId == null) { setTree(null); return }
    getPlanTree(centerId, selectedId).then(setTree).catch(() => setTree(null))
  }, [centerId, selectedId])

  async function refreshTree() {
    if (centerId == null || selectedId == null) return
    setTree(await getPlanTree(centerId, selectedId))
  }
  async function refreshPlans() {
    if (centerId == null) return
    setPlans(await listPlans(centerId))
  }

  if (centerId == null) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-xl font-semibold text-white">Planificación</h1>
        <p className="mt-2 text-sm text-white/45">
          {centers.length === 0
            ? 'Tu cuenta no tiene un centro asignado todavía.'
            : 'Selecciona un centro para empezar.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* Encabezado + selector de centro */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Planificación</h1>
          <p className="text-xs text-white/45">Periodización: macrociclo → mesociclos → microciclos</p>
        </div>
        {centers.length > 1 && (
          <select
            value={centerId}
            onChange={(e) => { setCenterId(Number(e.target.value)); setSelectedId(null); setTree(null) }}
            className="rounded-lg border border-perf-border bg-perf-surface px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
          >
            {centers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* Columna de macrociclos */}
        <PlanList
          plans={plans}
          loading={loadingPlans}
          error={plansErr}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={async (p) => { await refreshPlans(); setSelectedId(p.id) }}
          centerId={centerId}
        />

        {/* Detalle del macrociclo */}
        {tree ? (
          <PlanDetail
            centerId={centerId}
            plan={tree}
            onChanged={async () => { await refreshTree(); await refreshPlans() }}
            onDeleted={async () => { setSelectedId(null); setTree(null); await refreshPlans() }}
          />
        ) : (
          <Panel title="Macrociclo">
            <p className="text-sm text-white/40">Selecciona o crea un macrociclo para planificar su periodización.</p>
          </Panel>
        )}
      </div>
    </div>
  )
}

// ── Lista de macrociclos + alta ──────────────────────────────────────────────
function PlanList({
  plans, loading, error, selectedId, onSelect, onCreated, centerId,
}: {
  plans: TrainingPlan[]
  loading: boolean
  error: string
  selectedId: number | null
  onSelect: (id: number) => void
  onCreated: (p: TrainingPlan) => void
  centerId: number
}) {
  const [adding, setAdding] = useState(false)
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [inicio, setInicio] = useState(today())
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!nombre.trim()) return
    setBusy(true)
    try {
      const p = await createPlan(centerId, { nombre: nombre.trim(), objetivo: objetivo.trim(), fecha_inicio: inicio })
      setNombre(''); setObjetivo(''); setInicio(today()); setAdding(false)
      onCreated(p)
    } finally { setBusy(false) }
  }

  return (
    <Panel
      title="Macrociclos"
      subtitle={loading ? 'Cargando…' : `${plans.length} plan(es)`}
      action={
        <button type="button" onClick={() => setAdding((v) => !v)} className="text-xs font-medium text-accentLight hover:text-accent">
          {adding ? 'Cancelar' : '+ Nuevo'}
        </button>
      }
    >
      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-perf-border bg-perf-surface2 p-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (p. ej. Temporada 26/27)" className={inputCls} />
          <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Objetivo (opcional)" className={inputCls} />
          <label className="text-xs text-white/45">Inicio
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={`${inputCls} mt-1 [color-scheme:dark]`} />
          </label>
          <button type="button" onClick={submit} disabled={busy || !nombre.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accentDark disabled:opacity-50">
            {busy ? 'Creando…' : 'Crear macrociclo'}
          </button>
        </div>
      )}

      {error ? (
        <p className="text-sm text-perf-danger">{error}</p>
      ) : plans.length === 0 && !loading ? (
        <p className="text-sm text-white/40">Aún no hay macrociclos. Crea el primero.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {plans.map((p) => {
            const sel = p.id === selectedId
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    sel ? 'border-accent bg-accent/10' : 'border-perf-border bg-perf-surface2 hover:border-accent/40'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{p.nombre}</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {p.total_mesociclos} fase(s) · {p.total_microciclos} semana(s)
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

// ── Detalle del macrociclo: onda de carga + fases ────────────────────────────
function PlanDetail({
  centerId, plan, onChanged, onDeleted,
}: {
  centerId: number
  plan: TrainingPlanDetail
  onChanged: () => void
  onDeleted: () => void
}) {
  const [addingMeso, setAddingMeso] = useState(false)

  // Onda de carga: todos los microciclos en orden, con su fase.
  const wave = useMemo(() => {
    const rows: { label: string; carga: number; hex: string; meso: string; micro: string }[] = []
    let i = 1
    for (const m of plan.mesociclos) {
      for (const w of m.microciclos) {
        rows.push({ label: `S${i}`, carga: w.carga_relativa, hex: MICRO_TIPO[w.tipo].hex, meso: m.nombre, micro: MICRO_TIPO[w.tipo].label })
        i += 1
      }
    }
    return rows
  }, [plan])

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera del macrociclo */}
      <Panel
        title={plan.nombre}
        subtitle={[plan.objetivo, `Inicio ${plan.fecha_inicio}`].filter(Boolean).join(' · ')}
        action={
          <button
            type="button"
            onClick={() => { if (confirm('¿Eliminar este macrociclo y toda su periodización?')) deletePlan(centerId, plan.id).then(onDeleted) }}
            className="text-xs text-white/40 hover:text-perf-danger"
          >
            Eliminar
          </button>
        }
      >
        <div className="flex flex-wrap gap-4 text-xs text-white/55">
          <span>{plan.total_mesociclos} fase(s)</span>
          <span>{plan.total_microciclos} semana(s)</span>
        </div>

        {/* Onda de carga */}
        {wave.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-white/55">Onda de carga (carga relativa por semana)</p>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wave} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#16203a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#0f1525', border: '1px solid #1c2740', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.55)' }}
                    formatter={(v: number, _n, p) => [`${v}% · ${p.payload.micro}`, p.payload.meso]}
                  />
                  <Bar dataKey="carga" radius={[3, 3, 0, 0]}>
                    {wave.map((d, idx) => <Cell key={idx} fill={d.hex} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-white/35">Añade fases y semanas para ver la onda de carga.</p>
        )}
      </Panel>

      {/* Fases (mesociclos) */}
      {plan.mesociclos.map((m) => (
        <MesoBand key={m.id} centerId={centerId} planId={plan.id} meso={m} onChanged={onChanged} />
      ))}

      {/* Añadir fase */}
      {addingMeso ? (
        <NewMesoForm
          centerId={centerId}
          planId={plan.id}
          orden={plan.mesociclos.length + 1}
          onDone={() => { setAddingMeso(false); onChanged() }}
          onCancel={() => setAddingMeso(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingMeso(true)}
          className="rounded-2xl border border-dashed border-perf-border py-3 text-sm font-medium text-white/55 transition-colors hover:border-accent/50 hover:text-white"
        >
          + Añadir fase (mesociclo)
        </button>
      )}
    </div>
  )
}

// ── Banda de un mesociclo con sus semanas ────────────────────────────────────
function MesoBand({
  centerId, planId, meso, onChanged,
}: {
  centerId: number
  planId: number
  meso: Mesocycle
  onChanged: () => void
}) {
  const [addingMicro, setAddingMicro] = useState(false)
  const t = MESO_TIPO[meso.tipo]

  return (
    <section className="overflow-hidden rounded-2xl border border-perf-border bg-perf-surface">
      <div className="flex items-center gap-3 border-b border-perf-border px-5 py-3" style={{ borderLeft: `3px solid ${t.hex}` }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{meso.nombre}</h3>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${t.hex}1a`, color: t.hex }}>
              {t.label}
            </span>
          </div>
          {meso.enfasis && <p className="mt-0.5 truncate text-xs text-white/45">{meso.enfasis}</p>}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-white/45">
          <span>Carga {CARGA_OBJ[meso.carga_objetivo]}</span>
          <span>{meso.microciclos.length || meso.duracion_semanas} sem.</span>
          <button
            type="button"
            onClick={() => { if (confirm(`¿Eliminar la fase "${meso.nombre}" y sus semanas?`)) deleteMeso(centerId, planId, meso.id).then(onChanged) }}
            className="text-white/35 hover:text-perf-danger"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-4">
        {meso.microciclos.map((w) => (
          <MicroCell key={w.id} centerId={centerId} planId={planId} mesoId={meso.id} micro={w} onChanged={onChanged} />
        ))}
        {addingMicro ? (
          <NewMicroForm
            centerId={centerId}
            planId={planId}
            mesoId={meso.id}
            orden={meso.microciclos.length + 1}
            onDone={() => { setAddingMicro(false); onChanged() }}
            onCancel={() => setAddingMicro(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingMicro(true)}
            className="flex h-[120px] w-[104px] shrink-0 items-center justify-center rounded-xl border border-dashed border-perf-border text-xs font-medium text-white/45 transition-colors hover:border-accent/50 hover:text-white"
          >
            + semana
          </button>
        )}
      </div>
    </section>
  )
}

// ── Celda de microciclo (semana), con carga editable ─────────────────────────
function MicroCell({
  centerId, planId, mesoId, micro, onChanged,
}: {
  centerId: number
  planId: number
  mesoId: number
  micro: Microcycle
  onChanged: () => void
}) {
  const [carga, setCarga] = useState(String(micro.carga_relativa))
  const t = MICRO_TIPO[micro.tipo]

  async function commitCarga() {
    const n = Math.max(0, Math.min(100, Number(carga) || 0))
    if (n === micro.carga_relativa) return
    await updateMicro(centerId, planId, mesoId, micro.id, { carga_relativa: n })
    onChanged()
  }

  return (
    <div className="relative flex h-[120px] w-[104px] shrink-0 flex-col rounded-xl border border-perf-border bg-perf-surface2 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: t.hex }}>{t.label}</span>
        <button type="button" onClick={() => deleteMicro(centerId, planId, mesoId, micro.id).then(onChanged)} className="text-white/30 hover:text-perf-danger" title="Quitar semana">✕</button>
      </div>
      {/* Barra de carga */}
      <div className="mt-2 flex flex-1 items-end">
        <div className="h-full w-full overflow-hidden rounded-md bg-perf-bg">
          <div className="w-full rounded-md transition-all" style={{ height: `${micro.carga_relativa}%`, background: t.hex, opacity: 0.55 }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <input
          type="number" min={0} max={100} value={carga}
          onChange={(e) => setCarga(e.target.value)}
          onBlur={commitCarga}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-12 rounded border border-perf-border bg-perf-surface px-1 py-0.5 text-center text-xs text-white outline-none focus:border-accent"
        />
        <span className="text-[10px] text-white/40">% · {NIVEL[micro.intensidad]}</span>
      </div>
    </div>
  )
}

// ── Formularios de alta ──────────────────────────────────────────────────────
function NewMesoForm({
  centerId, planId, orden, onDone, onCancel,
}: {
  centerId: number; planId: number; orden: number; onDone: () => void; onCancel: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<MesoTipo>('prep_general')
  const [enfasis, setEnfasis] = useState('')
  const [carga, setCarga] = useState<CargaObjetivo>('media')
  const [semanas, setSemanas] = useState('4')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!nombre.trim()) return
    setBusy(true)
    try {
      await createMeso(centerId, planId, {
        orden, nombre: nombre.trim(), tipo, enfasis: enfasis.trim(),
        carga_objetivo: carga, duracion_semanas: Number(semanas) || 4,
      })
      onDone()
    } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-perf-border bg-perf-surface p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Labeled label="Nombre de la fase">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="p. ej. Pretemporada" className={inputCls} />
        </Labeled>
        <Labeled label="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as MesoTipo)} className={inputCls}>
            {Object.entries(MESO_TIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Labeled>
        <Labeled label="Énfasis">
          <input value={enfasis} onChange={(e) => setEnfasis(e.target.value)} placeholder="p. ej. Base aeróbica + fuerza general" className={inputCls} />
        </Labeled>
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Carga objetivo">
            <select value={carga} onChange={(e) => setCarga(e.target.value as CargaObjetivo)} className={inputCls}>
              {Object.entries(CARGA_OBJ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Labeled>
          <Labeled label="Semanas">
            <input type="number" min={1} max={12} value={semanas} onChange={(e) => setSemanas(e.target.value)} className={inputCls} />
          </Labeled>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={submit} disabled={busy || !nombre.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accentDark disabled:opacity-50">
          {busy ? 'Añadiendo…' : 'Añadir fase'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-perf-border px-4 py-2 text-sm text-white/70 hover:text-white">Cancelar</button>
      </div>
    </div>
  )
}

function NewMicroForm({
  centerId, planId, mesoId, orden, onDone, onCancel,
}: {
  centerId: number; planId: number; mesoId: number; orden: number; onDone: () => void; onCancel: () => void
}) {
  const [tipo, setTipo] = useState<MicroTipo>('carga')
  const [carga, setCarga] = useState('75')
  const [volumen, setVolumen] = useState<Nivel>('medio')
  const [intensidad, setIntensidad] = useState<Nivel>('medio')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await createMicro(centerId, planId, mesoId, {
        orden, tipo, carga_relativa: Math.max(0, Math.min(100, Number(carga) || 0)),
        volumen, intensidad,
      })
      onDone()
    } finally { setBusy(false) }
  }

  return (
    <div className="flex w-[200px] shrink-0 flex-col gap-2 rounded-xl border border-accent/40 bg-perf-surface2 p-3">
      <select value={tipo} onChange={(e) => setTipo(e.target.value as MicroTipo)} className={miniInput}>
        {Object.entries(MICRO_TIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <label className="text-[10px] text-white/45">Carga relativa %
        <input type="number" min={0} max={100} value={carga} onChange={(e) => setCarga(e.target.value)} className={`${miniInput} mt-0.5`} />
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        <select value={volumen} onChange={(e) => setVolumen(e.target.value as Nivel)} className={miniInput} title="Volumen">
          {Object.entries(NIVEL).map(([k, v]) => <option key={k} value={k}>Vol {v}</option>)}
        </select>
        <select value={intensidad} onChange={(e) => setIntensidad(e.target.value as Nivel)} className={miniInput} title="Intensidad">
          {Object.entries(NIVEL).map(([k, v]) => <option key={k} value={k}>Int {v}</option>)}
        </select>
      </div>
      <div className="flex gap-1">
        <button type="button" onClick={submit} disabled={busy} className="flex-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accentDark disabled:opacity-50">Añadir</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-perf-border px-2 py-1 text-xs text-white/60 hover:text-white">✕</button>
      </div>
    </div>
  )
}

// ── Piezas pequeñas ──────────────────────────────────────────────────────────
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/55">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full rounded-lg border border-perf-border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent'
const miniInput = 'w-full rounded-md border border-perf-border bg-perf-surface px-1.5 py-1 text-xs text-white outline-none focus:border-accent'
