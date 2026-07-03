// Gestión de "Zyfit Academy Pro": estado actual, planes y cancelación.
// Paquete separado de la suscripción "Zyfit Pro" del entrenador principal
// (app mobile) — ver academy.access_service en el backend.
//
// No hay cobrador conectado todavía: "Suscribirme" muestra el mismo mensaje
// honesto que ya usa mobile/(app)/perfil/suscripcion.tsx en vez de fingir un
// checkout. Cancelar SÍ es real (no otorga nada gratis, así que es seguro).

import { useEffect, useState } from 'react'
import { cancelSubscription, getSubscriptionStatus } from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/Icon'
import type { AcademyPlanTipo, AcademySubscriptionStatus } from '@/types'

const ESTADO_LABEL: Record<AcademySubscriptionStatus['estado'], string> = {
  sin_suscripcion: 'Sin suscripción',
  activa: 'Activa',
  cancelada: 'Cancelada',
  vencida: 'Vencida',
  pago_fallido: 'Pago fallido',
}
const ESTADO_TONE: Record<AcademySubscriptionStatus['estado'], 'ok' | 'warn' | 'neutral'> = {
  sin_suscripcion: 'neutral',
  activa: 'ok',
  cancelada: 'warn',
  vencida: 'warn',
  pago_fallido: 'warn',
}

const PLANES: { id: AcademyPlanTipo; nombre: string; precio: string; periodo: string; badge?: string }[] = [
  { id: 'mensual', nombre: 'Mensual', precio: 'USD 9.99', periodo: '/ mes' },
  { id: 'anual', nombre: 'Anual', precio: 'USD 79.99', periodo: '/ año', badge: 'Ahorra 33%' },
]

function formatFecha(iso: string | null): string {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function SubscriptionPage() {
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState<AcademySubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [proximamente, setProximamente] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getSubscriptionStatus()
      .then((s) => active && setStatus(s))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [reloadKey])

  async function handleCancel() {
    setCancelling(true)
    setCancelError(false)
    try {
      const s = await cancelSubscription()
      setStatus(s)
      setConfirmingCancel(false)
      await refreshUser()
    } catch {
      setCancelError(true)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={40} />
      </div>
    )
  }
  if (error || !status) {
    return (
      <EmptyState
        icon="lock"
        title="No se pudo cargar tu suscripción"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            Reintentar
          </button>
        }
      />
    )
  }

  const activa = status.estado === 'activa'
  const enGracia = status.estado === 'cancelada' && status.nivel === 'pro'

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <p className="za-eyebrow">Suscripción</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Zyfit Academy Pro</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Catálogo completo, certificados y una cuota diaria ampliada del tutor IA.
        </p>
      </header>

      {/* Estado actual */}
      <section className="za-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Estado</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={ESTADO_TONE[status.estado]}>{ESTADO_LABEL[status.estado]}</Badge>
              {status.plan_tipo && <span className="text-sm text-ink-soft">Plan {status.plan_tipo}</span>}
            </div>
          </div>
          {status.fecha_renovacion && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-ink-muted">
                {enGracia ? 'Acceso Pro hasta' : 'Próxima renovación'}
              </p>
              <p className="text-sm font-medium text-ink">{formatFecha(status.fecha_renovacion)}</p>
            </div>
          )}
        </div>

        {activa && !confirmingCancel && (
          <button
            onClick={() => setConfirmingCancel(true)}
            className="mt-5 text-sm font-medium text-danger hover:underline"
          >
            Cancelar suscripción
          </button>
        )}

        {confirmingCancel && (
          <div className="mt-5 rounded-xl border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm text-ink">
              Conservarás el acceso Pro hasta el
              {status.fecha_renovacion ? ` ${formatFecha(status.fecha_renovacion)}` : ' fin del período pagado'}.
              Después volverás al plan Starter.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="h-9 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                className="h-9 rounded-lg px-4 text-sm text-ink-soft hover:bg-surface-soft"
              >
                Mantener mi suscripción
              </button>
            </div>
            {cancelError && (
              <p role="alert" className="mt-2 text-sm text-danger">No se pudo cancelar. Inténtalo de nuevo.</p>
            )}
          </div>
        )}
      </section>

      {/* Beneficios */}
      <section className="za-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Qué incluye Pro</h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm text-ink-soft">
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok" /> Catálogo completo de las 3 escuelas
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok" /> Certificado al completar cada curso
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok" /> Cuota diaria ampliada del tutor IA (30 vs. 3 preguntas)
          </li>
        </ul>
      </section>

      {/* Planes (si no tiene una suscripción con acceso vigente) */}
      {status.nivel !== 'pro' && (
        <section className="za-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Elige tu plan</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PLANES.map((p) => (
              <div key={p.id} className="rounded-xl border border-surface-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{p.nombre}</p>
                  {p.badge && <Badge tone="brand">{p.badge}</Badge>}
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
                  {p.precio} <span className="text-sm font-normal text-ink-muted">{p.periodo}</span>
                </p>
                <button
                  onClick={() => setProximamente(true)}
                  className="mt-4 h-10 w-full rounded-xl bg-brand text-sm font-semibold text-white hover:opacity-90"
                >
                  Suscribirme
                </button>
              </div>
            ))}
          </div>
          {proximamente && (
            <p role="status" className="mt-4 rounded-lg bg-surface-soft p-3 text-sm text-ink-soft">
              🚀 Los pagos estarán disponibles muy pronto. Te avisaremos en cuanto puedas suscribirte a
              Academy Pro desde aquí.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
