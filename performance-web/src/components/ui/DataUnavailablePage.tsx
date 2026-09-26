import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/components/Icon'

export function DataUnavailablePage({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { label: string; to: string; icon?: IconName }
}) {
  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-xs text-white/45">Datos reales del centro</p>
      </div>
      <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-perf-border bg-perf-surface/50 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon name="gauge" size={24} />
        </span>
        <h2 className="mt-4 text-sm font-semibold text-white/85">Aún no hay una fuente conectada</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/45">{description}</p>
        <p className="mt-2 max-w-lg text-xs leading-relaxed text-white/35">
          Performance no generará valores de muestra para completar esta pantalla.
        </p>
        {action && (
          <Link
            to={action.to}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
          >
            {action.icon && <Icon name={action.icon} size={16} />}
            {action.label}
          </Link>
        )}
      </section>
    </div>
  )
}
