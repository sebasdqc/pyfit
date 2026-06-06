// Modal de edición de un atleta: datos demográficos, parámetros de rendimiento
// (radar 0–100) y métricas de carga. Construye un patch y lo entrega a onSave;
// el saneado/acotado de valores lo hace updateAthlete (lib/squadEdit).

import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { RADAR_AXES, type Athlete } from '@/lib/mockSquad'
import type { AthletePatch } from '@/lib/squadEdit'

type FormState = Record<string, string>

function toForm(a: Athlete): FormState {
  return {
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
          <Section title="Datos">
            <Text label="Nombre completo" value={form.nombre} onChange={(v) => set('nombre', v)} className="col-span-2" />
            <Num label="Dorsal" value={form.dorsal} onChange={(v) => set('dorsal', v)} />
            <Text label="Posición" value={form.posicion} onChange={(v) => set('posicion', v)} />
            <Select label="Estado" value={form.estado} onChange={(v) => set('estado', v)} options={[['ok', 'Disponible'], ['duda', 'En duda'], ['baja', 'No disponible']]} />
            <Text label="Nacionalidad" value={form.nacionalidad} onChange={(v) => set('nacionalidad', v)} />
            <Num label="Edad" value={form.edad} onChange={(v) => set('edad', v)} />
            <Num label="Altura (cm)" value={form.altura} onChange={(v) => set('altura', v)} />
            <Num label="Peso (kg)" value={form.peso} onChange={(v) => set('peso', v)} />
            <Select label="Pie hábil" value={form.pie} onChange={(v) => set('pie', v)} options={[['Derecho', 'Derecho'], ['Izquierdo', 'Izquierdo']]} />
            <Text label="Grupo" value={form.grupo} onChange={(v) => set('grupo', v)} />
          </Section>

          <Section title="Rendimiento (0–100)">
            {RADAR_AXES.map((ax) => (
              <Num key={ax.key} label={ax.label} value={form[ax.key]} onChange={(v) => set(ax.key, v)} min={0} max={100} />
            ))}
          </Section>

          <Section title="Carga y estado">
            <Num label="ACWR" value={form.acwr} onChange={(v) => set('acwr', v)} step={0.01} />
            <Num label="Bienestar (0–10)" value={form.bienestar} onChange={(v) => set('bienestar', v)} step={0.1} min={0} max={10} />
            <Num label="Carga semanal (UA)" value={form.cargaSemanal} onChange={(v) => set('cargaSemanal', v)} />
            <Num label="Disponibilidad (%)" value={form.disponibilidad} onChange={(v) => set('disponibilidad', v)} min={0} max={100} />
            <Num label="Minutos" value={form.minutos} onChange={(v) => set('minutos', v)} />
            <Num label="Sesiones" value={form.sesiones} onChange={(v) => set('sesiones', v)} />
          </Section>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end gap-2 border-t border-perf-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 hover:text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(toPatch(form))}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
          >
            Guardar cambios
          </button>
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

const inputClass =
  'mt-1 w-full rounded-lg border border-perf-border bg-perf-bg px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent'

function Text({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-white/45">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  )
}

function Num({
  label, value, onChange, min, max, step, className = '',
}: {
  label: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number; className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-white/45">{label}</span>
      <input type="number" inputMode="decimal" value={value} min={min} max={max} step={step} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-xs text-white/45">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  )
}
