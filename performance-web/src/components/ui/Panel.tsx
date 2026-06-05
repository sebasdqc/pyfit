// Card/panel base del portal: fondo de superficie, borde sutil, cabecera con
// título + subtítulo opcionales y un slot de acción a la derecha. Compartido
// por el dashboard y el perfil para que el estilo no diverja.

import type { ReactNode } from 'react'

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = 'p-5',
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`rounded-2xl border border-perf-border bg-perf-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-perf-border px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
