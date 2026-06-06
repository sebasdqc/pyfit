// Modal de edición de un atleta: datos demográficos, parámetros de rendimiento
// (radar 0–100) y métricas de carga. Construye un patch y lo entrega a onSave;
// el saneado/acotado de valores lo hace updateAthlete (lib/squadEdit).

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { RADAR_AXES, type Athlete } from '@/lib/mockSquad'
import { validateAthlete, type AthletePatch } from '@/lib/squadEdit'
import { fileToAvatarDataUrl } from '@/lib/image'

type FormState = Record<string, string>

function toForm(a: Athlete): FormState {
  return {
    foto: a.foto ?? '',
    nombre: a.nombre, dorsal: String(a.dorsal), posicion: a.posicion, estado: a.estado,
    nacionalidad: a.nacionalidad, edad: String(a.edad), altura: String(a.altura), peso: String(a.peso),
    pie: a.pie, grupo: a.grupo,
    velocidad: String(a.radar.velocidad), resistencia: String(a.radar.resistencia), fuerza: String(a.radar.fuerza),
    potencia: String(a.radar.potencia), agilidad: String(a.radar.agilidad), recuperacion: String(a.radar.recuperacion),
    acwr: String(a.acwr), bienestar: String(a.bienestar), cargaSemanal: String(a.cargaSemanal),
    disponibilidad: String(a.disponibilidad), minutos: String(a.minutos), sesiones: String(a.sesiones),
  }
}

const num = (s: string) => (s.trim() === '' ? 0 : Number(s))

function toPatch(f: FormState): AthletePatch {
  return {
    foto: f.foto || undefined,
    nombre: f.nombre, posicion: f.posicion, nacionalidad: f.nacionalidad, grupo: f.grupo,
    estado: f.estado as Athlete['estado'], pie: f.pie as Athlete['pie'],
    dorsal: num(f.dorsal), edad: num(f.edad), altura: num(f.altura), peso: num(f.peso),
    acwr: num(f.acwr), bienestar: num(f.bienestar), cargaSemanal: num(f.cargaSemanal),
    disponibilidad: num(f.disponibilidad), minutos: num(f.minutos), sesiones: num(f.sesiones),
    radar: {
      velocidad: num(f.velocidad), resistencia: num(f.resistencia), fuerza: num(f.fuerza),
      potencia: num(f.potencia), agilidad: num(f.agilidad), recuperacion: num(f.recuperacion),
    },
  }
}

export function AthleteEditModal({
  athlete,
  onClose,
  onSave,
}: {
  athlete: Athlete
  onClose: () => void
  onSave: (patch: AthletePatch) => void
}) {
  const [form, setForm] = useState<FormState>(() => toForm(athlete))
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Foto: se procesa en el cliente (recorte cuadrado + reescala) y se guarda
  // como data URL en el patch. Aún no hay endpoint de subida de archivos.
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState('')

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setPhotoError('')
    try {
      set('foto', await fileToAvatarDataUrl(file))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.')
    }
  }

  // Validación en vivo: resalta los campos fuera de rango y bloquea el guardado.
  const patch = useMemo(() => toPatch(form), [form])
  const errors = useMemo(() => validateAthlete(patch), [patch])
  const hasErrors = Object.keys(errors).length > 0

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-perf-border bg-perf-surface shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-perf-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Editar atleta</h2>
            <p className="text-xs text-white/45">{athlete.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/45 hover:text-white" aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Foto del atleta */}
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={form.nombre || athlete.nombre} src={form.foto || null} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-perf-border bg-perf-surface2 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:border-accent hover:text-white"
                >
                  <Icon name="camera" size={14} />
                  {form.foto ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {form.foto && (
                  <button
                    type="button"
                    onClick={() => {
                      set('foto', '')
                      setPhotoError('')
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-white/45 transition-colors hover:text-perf-danger"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {photoError ? (
                <span className="mt-1.5 block text-[11px] text-perf-danger">{photoError}</span>
              ) : (
                <p className="mt-1.5 text-[11px] text-white/35">JPG o PNG · se recorta cuadrada (máx. 256 px).</p>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>
          </div>

          <Section title="Datos">
            <Text label="Nombre completo" value={form.nombre} onChange={(v) => set('nombre', v)} error={errors.nombre} className="col-span-2" />
            <Num label="Dorsal" value={form.dorsal} onChange={(v) => set('dorsal', v)} error={errors.dorsal} />
            <Text label="Posición" value={form.posicion} onChange={(v) => set('posicion', v)} />
            <Select label="Estado" value={form.estado} onChange={(v) => set('estado', v)} options={[['ok', 'Disponible'], ['duda', 'En duda'], ['baja', 'No disponible']]} />
            <Text label="Nacionalidad" value={form.nacionalidad} onChange={(v) => set('nacionalidad', v)} />
            <Num label="Edad" value={form.edad} onChange={(v) => set('edad', v)} error={errors.edad} />
            <Num label="Altura (cm)" value={form.altura} onChange={(v) => set('altura', v)} error={errors.altura} />
            <Num label="Peso (kg)" value={form.peso} onChange={(v) => set('peso', v)} error={errors.peso} />
            <Select label="Pie hábil" value={form.pie} onChange={(v) => set('pie', v)} options={[['Derecho', 'Derecho'], ['Izquierdo', 'Izquierdo']]} />
            <Text label="Grupo" value={form.grupo} onChange={(v) => set('grupo', v)} />
          </Section>

          <Section title="Rendimiento (0–100)">
            {RADAR_AXES.map((ax) => (
              <Num key={ax.key} label={ax.label} value={form[ax.key]} onChange={(v) => set(ax.key, v)} error={errors[ax.key]} min={0} max={100} />
            ))}
          </Section>

          <Section title="Carga y estado">
            <Num label="ACWR" value={form.acwr} onChange={(v) => set('acwr', v)} error={errors.acwr} step={0.01} />
            <Num label="Bienestar (0–10)" value={form.bienestar} onChange={(v) => set('bienestar', v)} error={errors.bienestar} step={0.1} min={0} max={10} />
            <Num label="Carga semanal (UA)" value={form.cargaSemanal} onChange={(v) => set('cargaSemanal', v)} error={errors.cargaSemanal} />
            <Num label="Disponibilidad (%)" value={form.disponibilidad} onChange={(v) => set('disponibilidad', v)} error={errors.disponibilidad} min={0} max={100} />
            <Num label="Minutos" value={form.minutos} onChange={(v) => set('minutos', v)} error={errors.minutos} />
            <Num label="Sesiones" value={form.sesiones} onChange={(v) => set('sesiones', v)} error={errors.sesiones} />
          </Section>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-3 border-t border-perf-border px-5 py-4">
          <p className={`text-xs ${hasErrors ? 'text-perf-danger' : 'text-transparent'}`}>
            Corrige los campos resaltados para guardar.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 hover:text-white">
              Cancelar
            </button>
            <button
              type="button"
              disabled={hasErrors}
              onClick={() => onSave(patch)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Campos ─────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mb-5 last:mb-0">
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{title}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </fieldset>
  )
}

const baseInput = 'mt-1 w-full rounded-lg border bg-perf-bg px-3 py-2 text-sm text-white outline-none transition-colors'
const inputCls = (error?: string) =>
  `${baseInput} ${error ? 'border-perf-danger focus:border-perf-danger' : 'border-perf-border focus:border-accent'}`

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <span className="mt-1 block text-[11px] text-perf-danger">{error}</span>
}

function Text({ label, value, onChange, error, className = '' }: { label: string; value: string; onChange: (v: string) => void; error?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-white/45">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls(error)} />
      <FieldError error={error} />
    </label>
  )
}

function Num({
  label, value, onChange, error, min, max, step, className = '',
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; min?: number; max?: number; step?: number; className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-white/45">{label}</span>
      <input type="number" inputMode="decimal" value={value} min={min} max={max} step={step} onChange={(e) => onChange(e.target.value)} className={inputCls(error)} />
      <FieldError error={error} />
    </label>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-xs text-white/45">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls()}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  )
}
