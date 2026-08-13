// Controles de selección del wizard de bienvenida.
//
// Se apoyan en <input type="radio"|"checkbox"> reales, visualmente ocultos: el
// navegador ya trae la navegación por flechas dentro del grupo, el foco, el
// anuncio del estado en lectores de pantalla y el envío por teclado. Recrear
// eso con <button role="radio"> es más código y siempre peor.

import type { ReactNode } from 'react'

export interface Opcion<T extends string> {
  id: T
  label: string
  // Segunda línea opcional: qué significa la opción en términos del producto.
  hint?: string
}

// Marca de selección. Sin animación de entrada propia: el cambio de borde y
// fondo ya comunica el estado, y un ítem que rebota en cada clic cansa.
function Marca({ activa, redonda }: { activa: boolean; redonda: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors',
        redonda ? 'rounded-full' : 'rounded-[5px]',
        activa ? 'border-accent bg-accent' : 'border-white/25 bg-transparent',
      ].join(' ')}
    >
      {activa &&
        (redonda ? (
          <span className="h-1.5 w-1.5 rounded-full bg-perf-bg" />
        ) : (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-perf-bg" fill="none">
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ))}
    </span>
  )
}

function claseOpcion(activa: boolean): string {
  return [
    'group relative flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
    // El foco del input oculto se refleja en la tarjeta (el anillo global de
    // :focus-visible no alcanza a un input sr-only).
    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
    activa
      ? 'border-accent bg-accent/[0.08]'
      : 'border-perf-border bg-perf-surface/60 hover:border-white/20 hover:bg-perf-surface2/60',
  ].join(' ')
}

// ── Selección única ──────────────────────────────────────────────────────────

export function RadioGrid<T extends string>({
  name,
  legend,
  opciones,
  valor,
  onChange,
  columnas = 2,
  children,
}: {
  name: string
  legend: string
  opciones: Opcion<T>[]
  valor: T | ''
  onChange: (id: T) => void
  columnas?: 1 | 2
  // Campo dependiente (p. ej. el input de "Otro"), dentro del mismo fieldset.
  children?: ReactNode
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div
        className={
          columnas === 2
            ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2'
            : 'grid grid-cols-1 gap-2.5'
        }
      >
        {opciones.map((op) => {
          const activa = valor === op.id
          return (
            <label key={op.id} className={claseOpcion(activa)}>
              <input
                type="radio"
                name={name}
                value={op.id}
                checked={activa}
                onChange={() => onChange(op.id)}
                className="sr-only"
              />
              <Marca activa={activa} redonda />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug text-white">{op.label}</span>
                {op.hint && (
                  <span className="mt-0.5 block text-xs leading-snug text-white/55">{op.hint}</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {children}
    </fieldset>
  )
}

// ── Selección múltiple ───────────────────────────────────────────────────────

export function CheckboxGrid<T extends string>({
  legend,
  opciones,
  valores,
  onToggle,
}: {
  legend: string
  opciones: Opcion<T>[]
  valores: T[]
  onToggle: (id: T) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {opciones.map((op) => {
          const activa = valores.includes(op.id)
          return (
            <label key={op.id} className={claseOpcion(activa)}>
              <input
                type="checkbox"
                value={op.id}
                checked={activa}
                onChange={() => onToggle(op.id)}
                className="sr-only"
              />
              <Marca activa={activa} redonda={false} />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug text-white">{op.label}</span>
                {op.hint && (
                  <span className="mt-0.5 block text-xs leading-snug text-white/55">{op.hint}</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// ── Campo de texto para las opciones "Otro" ──────────────────────────────────

export function CampoOtro({
  id,
  label,
  placeholder,
  valor,
  onChange,
}: {
  id: string
  label: string
  placeholder: string
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <label htmlFor={id} className="mt-3 block">
      <span className="text-xs font-medium text-white/60">{label}</span>
      <input
        id={id}
        type="text"
        value={valor}
        maxLength={80}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1.5 w-full rounded-lg border border-perf-border bg-perf-bg px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent"
      />
    </label>
  )
}
