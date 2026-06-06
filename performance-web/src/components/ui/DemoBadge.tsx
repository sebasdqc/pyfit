// Distintivo que marca de forma explícita los datos NO reales del panel, para no
// presentar nunca datos de muestra como si fueran de la plantilla del cliente.
// Dos variantes de texto según el origen:
//   • Mock completo (sin centro real)            → "Datos de demostración"
//   • Roster real con métricas aún sintetizadas  → "Métricas simuladas"

type Variant = 'demo' | 'sim'

const TEXT: Record<Variant, { label: string; title: string }> = {
  demo: {
    label: 'Datos de demostración',
    title:
      'Plantilla y métricas de ejemplo. Registra atletas en Equipo y selecciona el centro para ver datos reales.',
  },
  sim: {
    label: 'Métricas simuladas',
    title:
      'El roster (nombres, dorsales, estado) es real. Las métricas de rendimiento se simulan hasta que el centro empiece a capturarlas.',
  },
}

export function DemoBadge({ variant = 'demo' }: { variant?: Variant }) {
  const { label, title } = TEXT[variant]
  return (
    <span
      title={title}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-perf-warn/30 bg-perf-warn/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-perf-warn"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-perf-warn" />
      {label}
    </span>
  )
}
