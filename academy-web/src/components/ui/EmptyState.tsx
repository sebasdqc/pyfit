import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'

// Estado vacío reutilizable: ícono en círculo de marca + título + descripción +
// acción opcional. Mantiene la sensación limpia/institucional del producto.
export function EmptyState({
  icon = 'catalog',
  title,
  description,
  action,
}: {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="za-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/5 text-brand">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
