// Opciones de una pregunta (única / múltiple / verdadero-falso), accesibles:
// radios o casillas dentro de un fieldset con la pregunta como leyenda.
// Compartido por el repaso espaciado y las evaluaciones. Si se pasa `correctas`
// (solo DESPUÉS de responder en el repaso) marca cuáles eran las correctas.

import type { QuestionTipo } from '@/types'

export function QuestionOptions({
  name, legend, tipo, opciones, value, onChange, disabled = false, correctas,
}: {
  name: string
  legend: string
  tipo: QuestionTipo
  opciones: { id: string; texto: string }[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  correctas?: string[]
}) {
  const multiple = tipo === 'opcion_multiple'

  function toggle(id: string) {
    if (disabled) return
    if (!multiple) return onChange([id])
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <fieldset className="flex flex-col gap-2.5" disabled={disabled}>
      <legend className="mb-3 text-[15px] font-medium leading-relaxed text-ink">{legend}</legend>
      {opciones.map((o) => {
        const checked = value.includes(o.id)
        const revelada = correctas !== undefined
        const esCorrecta = revelada && correctas.includes(o.id)
        const esError = revelada && checked && !esCorrecta
        const estilo = esCorrecta
          ? 'border-ok bg-ok/10'
          : esError
            ? 'border-danger bg-danger/10'
            : checked
              ? 'border-accent bg-accent/5'
              : 'border-surface-border bg-surface hover:border-accent/50'
        return (
          <label
            key={o.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm text-ink transition-colors ${estilo} ${disabled ? 'cursor-default' : ''}`}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              checked={checked}
              onChange={() => toggle(o.id)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--color-accent))]"
            />
            <span className="min-w-0 flex-1">{o.texto}</span>
            {esCorrecta && <span className="shrink-0 text-xs font-semibold text-ok" aria-hidden="true">✓</span>}
          </label>
        )
      })}
    </fieldset>
  )
}
