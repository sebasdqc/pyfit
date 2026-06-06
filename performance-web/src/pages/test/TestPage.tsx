// Módulo TEST. Catálogo de tests (físicos / técnicos / tácticos) servido por el
// backend, formulario generado desde el `input_schema` de cada test, cálculo en el
// SERVIDOR (POST /tests/compute/ — el cliente solo envía inputs crudos) y guardado
// del resultado por atleta. El catálogo y el cálculo son API real; la selección de
// atleta usa la plantilla de muestra y el historial se persiste en localStorage
// (mismo patrón que el resto del panel) hasta que el backend exponga atletas reales.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { Panel } from '@/components/ui/Panel'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { SEM } from '@/lib/tone'
import { ESTADO_TONE, type Athlete } from '@/lib/mockSquad'
import { useSquad } from '@/centers/useSquad'
import { fetchTestCatalog, computeTest } from '@/api/performance'
import { loadTests, saveTest, deleteTest, type SavedTest } from '@/lib/testStore'
import type { TestCatalogItem, TestFamilia, TestSchemaField } from '@/types'

// ── Etiquetas y orden de familias ───────────────────────────────────────────
const FAMILIAS: { id: TestFamilia; label: string }[] = [
  { id: 'fisico', label: 'Físico' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'tactico', label: 'Táctico' },
]
const FAMILIA_LABEL: Record<TestFamilia, string> = {
  fisico: 'Físico', tecnico: 'Técnico', tactico: 'Táctico',
}

const today = () => new Date().toISOString().slice(0, 10)
const human = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

// ── Modelo de valores del formulario ────────────────────────────────────────
type CompRow = { nombre: string; apropiadas: string; inapropiadas: string }
type FieldValue = string | string[] | CompRow[]
type Values = Record<string, FieldValue>

function initValues(schema: TestSchemaField[]): Values {
  const v: Values = {}
  for (const f of schema) {
    if (f.type === 'list') v[f.name] = ['', '']
    else if (f.type === 'componentes') v[f.name] = [{ nombre: '', apropiadas: '', inapropiadas: '' }]
    else v[f.name] = ''
  }
  return v
}

// Construye el payload de inputs para el servidor; omite vacíos (el servidor valida).
function buildInputs(schema: TestSchemaField[], values: Values): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of schema) {
    const v = values[f.name]
    if (f.type === 'list') {
      const arr = (v as string[]).map((s) => s.trim()).filter((s) => s !== '').map(Number)
      if (arr.length) out[f.name] = arr
    } else if (f.type === 'componentes') {
      const rows = (v as CompRow[])
        .filter((r) => r.nombre.trim() !== '' || r.apropiadas !== '' || r.inapropiadas !== '')
        .map((r) => ({
          nombre: r.nombre.trim(),
          apropiadas: Number(r.apropiadas || 0),
          inapropiadas: Number(r.inapropiadas || 0),
        }))
      if (rows.length) out[f.name] = rows
    } else {
      const s = (v as string).trim()
      if (s !== '') out[f.name] = Number(s)
    }
  }
  return out
}

export function TestPage() {
  const { athletes: squad, loading: squadLoading, isRealRoster } = useSquad()
  const [catalog, setCatalog] = useState<TestCatalogItem[]>([])
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)

  const [familia, setFamilia] = useState<'todos' | TestFamilia>('todos')
  const [slug, setSlug] = useState<string | null>(null)
  const [athleteId, setAthleteId] = useState<string>('')

  // Mantiene seleccionado un atleta válido cuando llega/cambia la plantilla.
  useEffect(() => {
    if (!squad.length) return
    setAthleteId((prev) => (squad.some((a) => a.id === prev) ? prev : squad[0].id))
  }, [squad])
  const [fecha, setFecha] = useState<string>(today())
  const [values, setValues] = useState<Values>({})
  const [computed, setComputed] = useState<Record<string, unknown> | null>(null)
  const [computing, setComputing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [saved, setSaved] = useState<SavedTest[]>(() => loadTests())
  const [justSaved, setJustSaved] = useState(false)

  // Cargar el catálogo (API real).
  useEffect(() => {
    let alive = true
    fetchTestCatalog()
      .then((data) => { if (alive) { setCatalog(data); setLoadErr('') } })
      .catch(() => { if (alive) setLoadErr('No se pudo cargar el catálogo de tests. Revisa tu sesión.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const test = catalog.find((t) => t.slug === slug) ?? null
  const visibles = familia === 'todos' ? catalog : catalog.filter((t) => t.familia === familia)
  const athlete = squad.find((a) => a.id === athleteId) ?? squad[0]
  const histAthlete = saved.filter((s) => s.athleteId === athleteId)

  function selectTest(t: TestCatalogItem) {
    setSlug(t.slug)
    setValues(initValues(t.input_schema))
    setComputed(null)
    setFieldErrors({})
    setGeneralError('')
    setJustSaved(false)
  }

  function setField(name: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [name]: value }))
    setJustSaved(false)
  }

  async function onCalcular() {
    if (!test) return
    setComputing(true); setFieldErrors({}); setGeneralError(''); setJustSaved(false)
    try {
      const res = await computeTest(test.slug, buildInputs(test.input_schema, values))
      setComputed(res.resultados)
    } catch (e) {
      const data = (e as AxiosError<{ errors?: Record<string, string> }>).response?.data
      setComputed(null)
      if (data?.errors) {
        const { __all__, ...fields } = data.errors
        setFieldErrors(fields)
        setGeneralError(__all__ ?? (Object.keys(fields).length ? '' : 'Revisa los datos ingresados.'))
      } else {
        setGeneralError('No se pudo calcular. Verifica tu conexión o tu sesión.')
      }
    } finally {
      setComputing(false)
    }
  }

  function onGuardar() {
    if (!test || !computed || !athlete) return
    const next = saveTest({
      athleteId: athlete.id,
      slug: test.slug,
      nombre: test.nombre,
      familia: test.familia,
      fecha,
      inputs: buildInputs(test.input_schema, values),
      resultados: computed,
    })
    setSaved(next)
    setJustSaved(true)
  }

  function onDelete(id: string) {
    setSaved(deleteTest(id))
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Tests</h1>
            <DemoBadge variant={isRealRoster ? 'sim' : 'demo'} />
          </div>
          <p className="text-xs text-white/45">
            Evaluación física, técnica y táctica · el cálculo se realiza en el servidor
          </p>
        </div>
        {/* Filtro por familia */}
        <div className="flex items-center gap-0.5 rounded-lg border border-perf-border bg-perf-surface p-0.5">
          {(['todos', ...FAMILIAS.map((f) => f.id)] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFamilia(id as 'todos' | TestFamilia)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                familia === id ? 'bg-accent text-white' : 'text-white/55 hover:text-white'
              }`}
            >
              {id === 'todos' ? 'Todos' : FAMILIA_LABEL[id as TestFamilia]}
            </button>
          ))}
        </div>
      </div>

      {/* Catálogo */}
      <Panel title="Catálogo de tests" subtitle={loading ? 'Cargando…' : `${visibles.length} disponibles`}>
        {loadErr ? (
          <p className="text-sm text-perf-danger">{loadErr}</p>
        ) : loading ? (
          <div className="flex items-center gap-2.5 py-6 text-sm text-white/45">
            <Spinner size={18} />
            Cargando catálogo…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((t) => {
              const sel = t.slug === slug
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => selectTest(t)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    sel
                      ? 'border-accent bg-accent/10'
                      : 'border-perf-border bg-perf-surface2 hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">{t.nombre}</span>
                    <FamiliaTag familia={t.familia} />
                  </div>
                  <p className="mt-1 text-xs leading-snug text-white/45">{t.descripcion}</p>
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Medición + resultados */}
      {test && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Formulario */}
          <Panel title={test.nombre} subtitle="Captura de datos">
            <div className="flex flex-col gap-4">
              {/* Atleta */}
              <div>
                <FieldLabel>Atleta</FieldLabel>
                {squad.length === 0 ? (
                  <p className="text-sm text-white/40">
                    {squadLoading ? (
                      'Cargando atletas…'
                    ) : (
                      <>
                        Aún no hay atletas.{' '}
                        <Link to="/equipo" className="text-accentLight hover:text-accent">
                          Regístralos en Equipo
                        </Link>
                        .
                      </>
                    )}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {squad.map((a) => (
                      <AthleteChip key={a.id} a={a} sel={a.id === athleteId} onClick={() => setAthleteId(a.id)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Fecha */}
              <label className="block">
                <FieldLabel>Fecha</FieldLabel>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-lg border border-perf-border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
                />
              </label>

              {/* Campos dinámicos del test */}
              {test.input_schema.map((f) => (
                <FieldRenderer
                  key={f.name}
                  field={f}
                  value={values[f.name]}
                  error={fieldErrors[f.name]}
                  onChange={(v) => setField(f.name, v)}
                />
              ))}

              {generalError && (
                <p className="rounded-lg border border-perf-danger/30 bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">
                  {generalError}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCalcular}
                  disabled={computing}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accentDark disabled:opacity-50"
                >
                  {computing ? 'Calculando…' : 'Calcular'}
                </button>
                <button
                  type="button"
                  onClick={onGuardar}
                  disabled={!computed}
                  className="rounded-lg border border-perf-border bg-perf-surface2 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white disabled:opacity-40"
                >
                  Guardar resultado
                </button>
                {justSaved && <span className="text-xs text-perf-ok">✓ Guardado</span>}
              </div>
            </div>
          </Panel>

          {/* Resultados */}
          <Panel
            title="Resultados"
            subtitle="Calculados en el servidor"
            action={<span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accentLight">Servidor</span>}
          >
            {computed ? (
              <ResultView data={computed} />
            ) : (
              <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center">
                <p className="text-sm text-white/40">Completa los datos y pulsa <span className="text-white/70">Calcular</span>.</p>
                <p className="mt-1 text-xs text-white/30">{test.descripcion}</p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Historial del atleta */}
      {test && (
        <Panel title="Historial" subtitle={`${histAthlete.length} resultado(s) guardado(s) · ${athlete?.nombre ?? ''}`}>
          {histAthlete.length === 0 ? (
            <p className="text-sm text-white/40">Aún no hay resultados guardados para este atleta.</p>
          ) : (
            <div className="flex flex-col divide-y divide-perf-border">
              {histAthlete.map((s) => (
                <HistoryRow key={s.id} item={s} onDelete={() => onDelete(s.id)} />
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}

// ── Renderizador de campos según el tipo del esquema ─────────────────────────
function FieldRenderer({
  field, value, error, onChange,
}: {
  field: TestSchemaField
  value: FieldValue
  error?: string
  onChange: (v: FieldValue) => void
}) {
  if (field.type === 'list') {
    return <ListField field={field} value={value as string[]} error={error} onChange={onChange} />
  }
  if (field.type === 'componentes') {
    return <ComponentesField field={field} value={value as CompRow[]} error={error} onChange={onChange} />
  }
  return <ScalarField field={field} value={value as string} error={error} onChange={onChange} />
}

function ScalarField({
  field, value, error, onChange,
}: {
  field: TestSchemaField
  value: string
  error?: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <FieldLabel optional={field.required === false}>
        {field.label}{field.unit ? ` (${field.unit})` : ''}
      </FieldLabel>
      <input
        type="number"
        inputMode="decimal"
        step={field.type === 'int' ? '1' : 'any'}
        min={field.min}
        max={field.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls(!!error)}
      />
      {error && <FieldError msg={error} />}
    </label>
  )
}

function ListField({
  field, value, error, onChange,
}: {
  field: TestSchemaField
  value: string[]
  error?: string
  onChange: (v: string[]) => void
}) {
  const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)))
  const add = () => onChange([...value, ''])
  const remove = (i: number) => onChange(value.length > 1 ? value.filter((_, j) => j !== i) : value)
  return (
    <div>
      <FieldLabel optional={field.required === false}>
        {field.label}{field.unit ? ` (${field.unit})` : ''}
      </FieldLabel>
      <div className="flex flex-col gap-2">
        {value.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-xs text-white/35">{i + 1}</span>
            <input
              type="number" inputMode="decimal" step="any" value={v}
              onChange={(e) => set(i, e.target.value)} className={inputCls(!!error)}
            />
            <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md px-2 py-1 text-white/35 hover:text-perf-danger" title="Quitar">✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 text-xs font-medium text-accentLight hover:text-accent">+ Añadir medición</button>
      {error && <FieldError msg={error} />}
    </div>
  )
}

function ComponentesField({
  field, value, error, onChange,
}: {
  field: TestSchemaField
  value: CompRow[]
  error?: string
  onChange: (v: CompRow[]) => void
}) {
  const set = (i: number, patch: Partial<CompRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const add = () => onChange([...value, { nombre: '', apropiadas: '', inapropiadas: '' }])
  const remove = (i: number) => onChange(value.length > 1 ? value.filter((_, j) => j !== i) : value)
  return (
    <div>
      <FieldLabel optional={field.required === false}>{field.label}</FieldLabel>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1 text-[10px] uppercase tracking-wide text-white/35">
          <span className="flex-1">Componente</span>
          <span className="w-20 text-center">Aprop.</span>
          <span className="w-20 text-center">Inaprop.</span>
          <span className="w-6" />
        </div>
        {value.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text" placeholder="p. ej. toma de decisión" value={r.nombre}
              onChange={(e) => set(i, { nombre: e.target.value })} className={`flex-1 ${inputCls(false)}`}
            />
            <input
              type="number" inputMode="numeric" step="1" min={0} value={r.apropiadas}
              onChange={(e) => set(i, { apropiadas: e.target.value })} className={`w-20 ${inputCls(false)}`}
            />
            <input
              type="number" inputMode="numeric" step="1" min={0} value={r.inapropiadas}
              onChange={(e) => set(i, { inapropiadas: e.target.value })} className={`w-20 ${inputCls(false)}`}
            />
            <button type="button" onClick={() => remove(i)} className="w-6 shrink-0 rounded-md py-1 text-white/35 hover:text-perf-danger" title="Quitar">✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 text-xs font-medium text-accentLight hover:text-accent">+ Añadir componente</button>
      {error && <FieldError msg={error} />}
    </div>
  )
}

// ── Vista de resultados (renderiza el dict del motor de forma genérica) ──────
function ResultView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
  const scalars = entries.filter(([, v]) => v === null || typeof v !== 'object')
  const complex = entries.filter(([, v]) => v !== null && typeof v === 'object')
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {scalars.map(([k, v]) => <ResultCell key={k} k={k} v={v} />)}
      </div>
      {complex.map(([k, v]) => <ResultBlock key={k} k={k} v={v} />)}
    </div>
  )
}

function ResultCell({ k, v }: { k: string; v: unknown }) {
  if (typeof v === 'boolean') {
    const alerta = /alerta/.test(k)
    const tone = alerta ? (v ? 'danger' : 'ok') : v ? 'accent' : 'warn'
    const text = alerta ? (v ? 'Alerta' : 'Normal') : v ? 'Sí' : 'No'
    return (
      <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
        <p className="text-xs text-white/45">{human(k)}</p>
        <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${SEM[tone].soft} ${SEM[tone].text}`}>{text}</span>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="text-xs text-white/45">{human(k)}</p>
      <p className="mt-1 text-xl font-bold text-white">{v === null ? '—' : String(v)}</p>
    </div>
  )
}

function ResultBlock({ k, v }: { k: string; v: unknown }) {
  // Lista de objetos (p. ej. componentes del GPAI).
  if (Array.isArray(v)) {
    return (
      <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
        <p className="mb-2 text-xs text-white/45">{human(k)}</p>
        <div className="flex flex-col divide-y divide-perf-border">
          {v.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-0.5 py-1.5 text-sm">
              {Object.entries(row as Record<string, unknown>).map(([rk, rv]) => (
                <span key={rk} className="text-white/70">
                  <span className="text-white/40">{human(rk)}:</span> <span className="text-white">{String(rv)}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
  // Objeto plano (p. ej. desglose de penalizaciones del LSPT).
  return (
    <div className="rounded-2xl border border-perf-border bg-perf-surface p-4">
      <p className="mb-2 text-xs text-white/45">{human(k)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {Object.entries(v as Record<string, unknown>).map(([rk, rv]) => (
          <div key={rk} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-white/45">{human(rk)}</span>
            <span className="font-medium text-white">{String(rv)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Historial ────────────────────────────────────────────────────────────────
function HistoryRow({ item, onDelete }: { item: SavedTest; onDelete: () => void }) {
  // Muestra hasta 3 métricas escalares como resumen.
  const resumen = Object.entries(item.resultados)
    .filter(([, v]) => v === null || typeof v !== 'object')
    .slice(0, 3)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
      <div className="min-w-[160px]">
        <p className="text-sm font-medium text-white">{item.nombre}</p>
        <p className="text-xs text-white/40">{item.fecha} · {FAMILIA_LABEL[item.familia as TestFamilia] ?? item.familia}</p>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-0.5">
        {resumen.map(([k, v]) => (
          <span key={k} className="text-xs text-white/65">
            <span className="text-white/40">{human(k)}:</span> <span className="text-white">{v === null ? '—' : String(v)}</span>
          </span>
        ))}
      </div>
      <button type="button" onClick={onDelete} className="shrink-0 rounded-md px-2 py-1 text-xs text-white/35 hover:text-perf-danger" title="Eliminar">Eliminar</button>
    </div>
  )
}

// ── Piezas pequeñas ──────────────────────────────────────────────────────────
function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-white/55">
      {children}{optional && <span className="ml-1 text-white/30">(opcional)</span>}
    </span>
  )
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-perf-danger">{msg}</p>
}

function FamiliaTag({ familia }: { familia: TestFamilia }) {
  return (
    <span className="shrink-0 rounded-full bg-perf-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/45">
      {FAMILIA_LABEL[familia]}
    </span>
  )
}

function AthleteChip({ a, sel, onClick }: { a: Athlete; sel: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
        sel ? 'border-accent bg-accent/10 text-white' : 'border-perf-border bg-perf-surface2 text-white/70 hover:text-white'
      }`}
    >
      <Avatar name={a.nombre} src={a.foto} size={22} />
      <span className="whitespace-nowrap">{a.nombre}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${SEM[ESTADO_TONE[a.estado]].bg}`} />
    </button>
  )
}

const inputCls = (err: boolean) =>
  `w-full rounded-lg border bg-perf-surface2 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent ${
    err ? 'border-perf-danger' : 'border-perf-border'
  }`
