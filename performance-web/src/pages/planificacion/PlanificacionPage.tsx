// Módulo PLANIFICACIÓN. Planificador de periodización clásica de equipo:
// Macrociclo (temporada) → Mesociclos (fases) → Microciclos (semanas). Todo es
// API real, acotado al centro del usuario. Permite crear/editar/reordenar fases y
// semanas, fijar la carga relativa (onda de carga) y fechas, y asignar el plan a
// un grupo del centro.

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { CreateCenterButton } from '@/components/CreateCenterModal'
import { useAuth } from '@/auth/useAuth'
import {
  listPlans, createPlan, getPlanTree, deletePlan,
  createMeso, updateMeso, deleteMeso,
  createMicro, updateMicro, deleteMicro, listCenters,
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
const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))
const shortDate = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : null)
function addWeeks(iso: string, weeks: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export function PlanificacionPage() {
  const { user } = useAuth()
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
  // Modo de la vista: 'ver' (por defecto, solo lectura, profesional) u 'editar'
  // (revela los controles de alta/edición/reordenado).
  const [edit, setEdit] = useState(false)

  useEffect(() => {
    if (centerId == null) return
    setLoadingPlans(true); setPlansErr('')
    listPlans(centerId)
      .then((data) => { setPlans(data); if (!selectedId && data[0]) setSelectedId(data[0].id) })
      .catch(() => setPlansErr('No se pudieron cargar los planes. Revisa tu sesión.'))
      .finally(() => setLoadingPlans(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId])

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
        {centers.length === 0 && (
          <div className="mt-4">
            <CreateCenterButton
              onCreated={(c) => {
                setCenters((prev) => [...prev, { id: c.id, nombre: c.nombre }])
                setCenterId(c.id)
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Planificación</h1>
          <p className="text-xs text-white/45">Periodización: macrociclo → mesociclos → microciclos</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Modo Visualización / Edición */}
          <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-surface p-0.5">
            <button
              type="button"
              onClick={() => setEdit(false)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                !edit ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              <Icon name="eye" size={14} />
              Visualización
            </button>
            <button
              type="button"
              onClick={() => setEdit(true)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                edit ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              <Icon name="edit" size={14} />
              Edición
            </button>
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <PlanList
          plans={plans}
          loading={loadingPlans}
          error={plansErr}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={async (p) => { await refreshPlans(); setSelectedId(p.id) }}
          centerId={centerId}
          edit={edit}
        />

        {tree ? (
          <PlanDetail
            centerId={centerId}
            plan={tree}
            edit={edit}
            onChanged={async () => { await refreshTree(); await refreshPlans() }}
            onDeleted={async () => { setSelectedId(null); setTree(null); await refreshPlans() }}
          />
        ) : (
          <Panel title="Macrociclo">
            <p className="text-sm text-white/40">
              {edit
                ? 'Selecciona o crea un macrociclo para planificar su periodización.'
                : 'Selecciona un macrociclo para ver su periodización.'}
            </p>
          </Panel>
        )}
      </div>
    </div>
  )
}

// ── Lista de macrociclos + alta ──────────────────────────────────────────────
function PlanList({
  plans, loading, error, selectedId, onSelect, onCreated, centerId, edit,
}: {
  plans: TrainingPlan[]
  loading: boolean
  error: string
  selectedId: number | null
  onSelect: (id: number) => void
  onCreated: (p: TrainingPlan) => void
  centerId: number
  edit: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [grupo, setGrupo] = useState('')
  const [inicio, setInicio] = useState(today())
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!nombre.trim()) return
    setBusy(true)
    try {
      const p = await createPlan(centerId, {
        nombre: nombre.trim(), objetivo: objetivo.trim(), grupo: grupo.trim(), fecha_inicio: inicio,
      })
      setNombre(''); setObjetivo(''); setGrupo(''); setInicio(today()); setAdding(false)
      onCreated(p)
    } finally { setBusy(false) }
  }

  return (
    <Panel
      title="Macrociclos"
      subtitle={loading ? 'Cargando…' : `${plans.length} plan(es)`}
      action={
        edit ? (
          <button type="button" onClick={() => setAdding((v) => !v)} className="text-xs font-medium text-accentLight hover:text-accent">
            {adding ? 'Cancelar' : '+ Nuevo'}
          </button>
        ) : undefined
      }
    >
      {edit && adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-perf-border bg-perf-surface2 p-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (p. ej. Temporada 26/27)" className={inputCls} />
          <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Objetivo (opcional)" className={inputCls} />
          <input value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Grupo (p. ej. Primer equipo, Sub-18)" className={inputCls} />
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
      ) : loading ? (
        <div className="flex items-center gap-2.5 py-6 text-sm text-white/45">
          <Spinner size={18} />
          Cargando macrociclos…
        </div>
      ) : plans.length === 0 ? (
        <p className="text-sm text-white/40">
          {edit ? 'Aún no hay macrociclos. Crea el primero.' : 'Aún no hay macrociclos. Activa el modo edición para crear uno.'}
        </p>
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
                    {p.grupo ? `${p.grupo} · ` : ''}{p.total_mesociclos} fase(s) · {p.total_microciclos} sem.
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
  centerId, plan, edit, onChanged, onDeleted,
}: {
  centerId: number
  plan: TrainingPlanDetail
  edit: boolean
  onChanged: () => void
  onDeleted: () => void
}) {
  const [addingMeso, setAddingMeso] = useState(false)
  const totalWeeks = plan.mesociclos.reduce((acc, m) => acc + m.microciclos.length, 0)
  const finEstimado = totalWeeks ? addWeeks(plan.fecha_inicio, totalWeeks) : null

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

  // Offset acumulado de semanas antes de cada fase (para sugerir fechas).
  const offsets = useMemo(() => {
    const out: number[] = []
    let acc = 0
    for (const m of plan.mesociclos) { out.push(acc); acc += m.microciclos.length }
    return out
  }, [plan])

  async function moveMeso(idx: number, dir: -1 | 1) {
    const list = plan.mesociclos
    const j = idx + dir
    if (j < 0 || j >= list.length) return
    const a = list[idx], b = list[j]
    await Promise.all([
      updateMeso(centerId, plan.id, a.id, { orden: b.orden }),
      updateMeso(centerId, plan.id, b.id, { orden: a.orden }),
    ])
    onChanged()
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={plan.nombre}
        subtitle={[plan.objetivo, `Inicio ${plan.fecha_inicio}`].filter(Boolean).join(' · ')}
        action={
          edit ? (
            <button
              type="button"
              onClick={() => { if (confirm('¿Eliminar este macrociclo y toda su periodización?')) deletePlan(centerId, plan.id).then(onDeleted) }}
              className="text-xs text-white/40 hover:text-perf-danger"
            >
              Eliminar
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-white/55">
          {plan.grupo && <span className="rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accentLight">{plan.grupo}</span>}
          <span className="rounded-full border border-perf-border px-2.5 py-1">{plan.total_mesociclos} fase(s)</span>
          <span className="rounded-full border border-perf-border px-2.5 py-1">{plan.total_microciclos} semana(s)</span>
          <span className="rounded-full border border-perf-border px-2.5 py-1">
            {shortDate(plan.fecha_inicio)} → {finEstimado ? shortDate(finEstimado) : '—'}
          </span>
        </div>

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
          <p className="mt-4 text-xs text-white/35">
            {edit
              ? 'Añade fases y semanas para ver la onda de carga.'
              : 'Este macrociclo aún no tiene fases. Activa el modo edición para planificarlo.'}
          </p>
        )}
      </Panel>

      {plan.mesociclos.map((m, idx) => (
        <MesoBand
          key={m.id}
          centerId={centerId}
          planId={plan.id}
          meso={m}
          planStart={plan.fecha_inicio}
          weekOffset={offsets[idx]}
          edit={edit}
          canUp={idx > 0}
          canDown={idx < plan.mesociclos.length - 1}
          onMoveUp={() => moveMeso(idx, -1)}
          onMoveDown={() => moveMeso(idx, 1)}
          onChanged={onChanged}
        />
      ))}

      {edit && (addingMeso ? (
        <MesoForm
          centerId={centerId}
          planId={plan.id}
          mode="create"
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
      ))}
    </div>
  )
}

// ── Banda de un mesociclo con sus semanas ────────────────────────────────────
function MesoBand({
  centerId, planId, meso, planStart, weekOffset, edit, canUp, canDown, onMoveUp, onMoveDown, onChanged,
}: {
  centerId: number
  planId: number
  meso: Mesocycle
  planStart: string
  weekOffset: number
  edit: boolean
  canUp: boolean
  canDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
}) {
  const [addingMicro, setAddingMicro] = useState(false)
  const [editing, setEditing] = useState(false)
  const t = MESO_TIPO[meso.tipo]
  const weeks = meso.microciclos.length || meso.duracion_semanas
  const fechaRango = `${shortDate(addWeeks(planStart, weekOffset))} – ${shortDate(addWeeks(planStart, weekOffset + weeks))}`

  async function moveMicro(idx: number, dir: -1 | 1) {
    const list = meso.microciclos
    const j = idx + dir
    if (j < 0 || j >= list.length) return
    const a = list[idx], b = list[j]
    await Promise.all([
      updateMicro(centerId, planId, meso.id, a.id, { orden: b.orden }),
      updateMicro(centerId, planId, meso.id, b.id, { orden: a.orden }),
    ])
    onChanged()
  }

  if (editing && edit) {
    return (
      <MesoForm
        centerId={centerId}
        planId={planId}
        mode="edit"
        initial={meso}
        onDone={() => { setEditing(false); onChanged() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const suggestedDate = addWeeks(planStart, weekOffset + meso.microciclos.length)

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
        <div className="ml-auto flex shrink-0 items-center gap-2.5 text-xs text-white/45">
          <span className="hidden md:inline">{fechaRango}</span>
          <span className="hidden sm:inline">Carga {CARGA_OBJ[meso.carga_objetivo]}</span>
          <span>{weeks} sem.</span>
          {edit && (
            <span className="flex items-center gap-1.5 border-l border-perf-border pl-2.5">
              <IconBtn onClick={onMoveUp} disabled={!canUp} title="Subir fase">▲</IconBtn>
              <IconBtn onClick={onMoveDown} disabled={!canDown} title="Bajar fase">▼</IconBtn>
              <IconBtn onClick={() => setEditing(true)} title="Editar fase">✎</IconBtn>
              <IconBtn
                onClick={() => { if (confirm(`¿Eliminar la fase "${meso.nombre}" y sus semanas?`)) deleteMeso(centerId, planId, meso.id).then(onChanged) }}
                title="Eliminar fase" danger
              >✕</IconBtn>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-4">
        {meso.microciclos.map((w, idx) => (
          <MicroCell
            key={w.id}
            centerId={centerId}
            planId={planId}
            mesoId={meso.id}
            micro={w}
            weekNum={weekOffset + idx + 1}
            edit={edit}
            canLeft={idx > 0}
            canRight={idx < meso.microciclos.length - 1}
            onMoveLeft={() => moveMicro(idx, -1)}
            onMoveRight={() => moveMicro(idx, 1)}
            onChanged={onChanged}
          />
        ))}
        {edit && (addingMicro ? (
          <MicroForm
            centerId={centerId}
            planId={planId}
            mesoId={meso.id}
            mode="create"
            orden={meso.microciclos.length + 1}
            suggestedDate={suggestedDate}
            onDone={() => { setAddingMicro(false); onChanged() }}
            onCancel={() => setAddingMicro(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingMicro(true)}
            className="flex h-[156px] w-[124px] shrink-0 items-center justify-center rounded-xl border border-dashed border-perf-border text-xs font-medium text-white/45 transition-colors hover:border-accent/50 hover:text-white"
          >
            + semana
          </button>
        ))}
        {!edit && meso.microciclos.length === 0 && (
          <p className="py-6 text-xs text-white/35">Sin semanas planificadas en esta fase.</p>
        )}
      </div>
    </section>
  )
}

// ── Celda de microciclo (semana) ─────────────────────────────────────────────
function MicroCell({
  centerId, planId, mesoId, micro, weekNum, edit, canLeft, canRight, onMoveLeft, onMoveRight, onChanged,
}: {
  centerId: number
  planId: number
  mesoId: number
  micro: Microcycle
  weekNum: number
  edit: boolean
  canLeft: boolean
  canRight: boolean
  onMoveLeft: () => void
  onMoveRight: () => void
  onChanged: () => void
}) {
  const [carga, setCarga] = useState(String(micro.carga_relativa))
  const [editing, setEditing] = useState(false)
  const t = MICRO_TIPO[micro.tipo]
  const fecha = shortDate(micro.fecha_inicio)

  async function commitCarga() {
    const n = clamp(Number(carga))
    if (n === micro.carga_relativa) return
    await updateMicro(centerId, planId, mesoId, micro.id, { carga_relativa: n })
    onChanged()
  }

  if (editing && edit) {
    return (
      <MicroForm
        centerId={centerId}
        planId={planId}
        mesoId={mesoId}
        mode="edit"
        initial={micro}
        onDone={() => { setEditing(false); onChanged() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  // Modo Visualización: tarjeta de solo lectura, limpia y profesional.
  if (!edit) {
    return (
      <div className="flex h-[156px] w-[124px] shrink-0 flex-col rounded-xl border border-perf-border bg-perf-surface2 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: t.hex }}>{t.label}</span>
          <span className="text-[10px] text-white/35">S{weekNum}</span>
        </div>
        <div className="mt-2 flex flex-1 items-end">
          <div className="h-full w-full overflow-hidden rounded-md bg-perf-bg">
            <div className="w-full rounded-md transition-all" style={{ height: `${micro.carga_relativa}%`, background: t.hex, opacity: 0.55 }} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-base font-bold text-white">{micro.carga_relativa}</span>
          <span className="text-[10px] text-white/40">% carga</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-white/45">
          <span>Vol {NIVEL[micro.volumen]} · Int {NIVEL[micro.intensidad]}</span>
        </div>
        {fecha && <span className="mt-0.5 text-[10px] text-white/35">{fecha}</span>}
      </div>
    )
  }

  // Modo Edición: carga editable inline + reordenar / editar / quitar.
  return (
    <div className="flex h-[156px] w-[124px] shrink-0 flex-col rounded-xl border border-perf-border bg-perf-surface2 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: t.hex }}>{t.label}</span>
        {fecha && <span className="text-[10px] text-white/40">{fecha}</span>}
      </div>
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
          className="w-11 rounded border border-perf-border bg-perf-surface px-1 py-0.5 text-center text-xs text-white outline-none focus:border-accent"
        />
        <span className="text-[10px] text-white/40">% {NIVEL[micro.intensidad]}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <IconBtn onClick={onMoveLeft} disabled={!canLeft} title="Mover izquierda">◀</IconBtn>
        <IconBtn onClick={() => setEditing(true)} title="Editar semana">✎</IconBtn>
        <IconBtn onClick={() => deleteMicro(centerId, planId, mesoId, micro.id).then(onChanged)} title="Quitar semana" danger>✕</IconBtn>
        <IconBtn onClick={onMoveRight} disabled={!canRight} title="Mover derecha">▶</IconBtn>
      </div>
    </div>
  )
}

// ── Formulario de fase (crear / editar) ──────────────────────────────────────
function MesoForm({
  centerId, planId, mode, initial, orden, onDone, onCancel,
}: {
  centerId: number
  planId: number
  mode: 'create' | 'edit'
  initial?: Mesocycle
  orden?: number
  onDone: () => void
  onCancel: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [tipo, setTipo] = useState<MesoTipo>(initial?.tipo ?? 'prep_general')
  const [enfasis, setEnfasis] = useState(initial?.enfasis ?? '')
  const [carga, setCarga] = useState<CargaObjetivo>(initial?.carga_objetivo ?? 'media')
  const [semanas, setSemanas] = useState(String(initial?.duracion_semanas ?? 4))
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!nombre.trim()) return
    setBusy(true)
    try {
      const payload = {
        nombre: nombre.trim(), tipo, enfasis: enfasis.trim(),
        carga_objetivo: carga, duracion_semanas: Number(semanas) || 4,
      }
      if (mode === 'edit' && initial) await updateMeso(centerId, planId, initial.id, payload)
      else await createMeso(centerId, planId, { ...payload, orden: orden ?? 1 })
      onDone()
    } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-perf-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accentLight">{mode === 'edit' ? 'Editar fase' : 'Nueva fase'}</p>
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
          {busy ? 'Guardando…' : mode === 'edit' ? 'Guardar fase' : 'Añadir fase'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-perf-border px-4 py-2 text-sm text-white/70 hover:text-white">Cancelar</button>
      </div>
    </div>
  )
}

// ── Formulario de semana (crear / editar) ────────────────────────────────────
function MicroForm({
  centerId, planId, mesoId, mode, initial, orden, suggestedDate, onDone, onCancel,
}: {
  centerId: number
  planId: number
  mesoId: number
  mode: 'create' | 'edit'
  initial?: Microcycle
  orden?: number
  suggestedDate?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [tipo, setTipo] = useState<MicroTipo>(initial?.tipo ?? 'carga')
  const [carga, setCarga] = useState(String(initial?.carga_relativa ?? 75))
  const [volumen, setVolumen] = useState<Nivel>(initial?.volumen ?? 'medio')
  const [intensidad, setIntensidad] = useState<Nivel>(initial?.intensidad ?? 'medio')
  const [fecha, setFecha] = useState(initial?.fecha_inicio ?? suggestedDate ?? '')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const payload = {
        tipo, carga_relativa: clamp(Number(carga)), volumen, intensidad,
        fecha_inicio: fecha || null,
      }
      if (mode === 'edit' && initial) await updateMicro(centerId, planId, mesoId, initial.id, payload)
      else await createMicro(centerId, planId, mesoId, { ...payload, orden: orden ?? 1 })
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
      <label className="text-[10px] text-white/45">Inicio de semana
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${miniInput} mt-0.5 [color-scheme:dark]`} />
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
        <button type="button" onClick={submit} disabled={busy} className="flex-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accentDark disabled:opacity-50">
          {busy ? '…' : mode === 'edit' ? 'Guardar' : 'Añadir'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-perf-border px-2 py-1 text-xs text-white/60 hover:text-white">✕</button>
      </div>
    </div>
  )
}

// ── Piezas pequeñas ──────────────────────────────────────────────────────────
function IconBtn({
  children, onClick, disabled, title, danger,
}: {
  children: ReactNode; onClick: () => void; disabled?: boolean; title: string; danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded px-1 text-white/40 transition-colors disabled:opacity-25 ${danger ? 'hover:text-perf-danger' : 'hover:text-white'}`}
    >
      {children}
    </button>
  )
}

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
