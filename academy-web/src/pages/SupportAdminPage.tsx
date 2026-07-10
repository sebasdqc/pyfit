// Bandeja de soporte (SOLO admin) — /admin/soporte. Lista un hilo por
// estudiante con al menos un mensaje, ordenado por el más reciente, con el
// conteo de mensajes del estudiante sin leer. Al abrir un hilo se navega a
// SupportAdminThreadPage.tsx.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSupportThreads } from '@/api/academy'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/auth/useAuth'
import { useT } from '@/locale/useT'
import type { SupportThreadSummary } from '@/types'

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function SupportAdminPage() {
  const t = useT()
  const { user } = useAuth()
  const [hilos, setHilos] = useState<SupportThreadSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    listSupportThreads()
      .then(setHilos)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (!user?.is_admin) {
    return (
      <EmptyState
        icon="shield"
        title={t('adminSupport.accessDeniedTitle')}
        description={t('adminSupport.accessDeniedBody')}
      />
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <p className="za-eyebrow">{t('adminSupport.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{t('adminSupport.title')}</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={32} />
        </div>
      ) : error ? (
        <EmptyState icon="instructor" title={t('adminSupport.errorTitle')} description={t('adminSupport.errorBody')} />
      ) : hilos.length === 0 ? (
        <EmptyState icon="instructor" title={t('adminSupport.emptyTitle')} description={t('adminSupport.emptyBody')} />
      ) : (
        <div className="flex flex-col gap-2">
          {hilos.map((h) => (
            <Link
              key={h.student_id}
              to={`/admin/soporte/${h.student_id}`}
              className="za-card flex items-center gap-3 p-4 transition-colors hover:bg-surface-soft"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{h.nombre}</p>
                  <span className="shrink-0 text-xs text-ink-muted">{h.email}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-soft">
                  {h.ultimo_from_admin && <span className="text-ink-muted">{t('adminSupport.youPrefix')}</span>}
                  {h.ultimo_mensaje}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {h.ultimo_at && <span className="text-xs text-ink-muted">{formatFecha(h.ultimo_at)}</span>}
                {h.no_leidos > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">
                    {h.no_leidos}
                  </span>
                )}
              </div>
              <Icon name="chevronRight" size={16} className="shrink-0 text-ink-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
