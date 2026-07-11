// Gestión de "Zyfit Academy Pro": estado actual, planes y cancelación.
// Paquete separado de la suscripción "Zyfit Pro" del entrenador principal
// (app mobile) — ver academy.access_service en el backend.
//
// No hay cobrador conectado todavía: elegir un plan crea una solicitud real
// (mismo backend administrado `promos/` que usa mobile para Zyfit Pro, con
// `producto: 'academy_pro'`) — el staff confirma el pago desde Django Admin.
// Cancelar SÍ es real (no otorga nada gratis, así que es seguro exponerlo).

import { useEffect, useState } from 'react'
import {
  cancelSubscription, crearSolicitudSuscripcion, getMiSolicitudSuscripcion,
  getSubscriptionStatus, validarCodigoPromocional,
} from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/Icon'
import type { AcademyPlanTipo, AcademySolicitudSuscripcion, AcademySubscriptionStatus } from '@/types'

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

const PLANES: { id: AcademyPlanTipo; nombre: string; precioNum: number; periodo: string; badge?: string }[] = [
  { id: 'mensual', nombre: 'Mensual', precioNum: 25, periodo: '/ mes' },
  { id: 'trimestral', nombre: 'Trimestral', precioNum: 50, periodo: '/ 3 meses', badge: 'Ahorra 33%' },
  { id: 'anual', nombre: 'Anual', precioNum: 150, periodo: '/ año', badge: 'Ahorra 50%' },
]

type CodigoEstado = 'idle' | 'validando' | 'valido' | 'invalido'

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
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(false)

  // Solicitud de suscripción con código de descuento (reemplaza el mockup "Próximamente")
  const [misSolicitud, setMisSolicitud] = useState<AcademySolicitudSuscripcion | null>(null)
  const [misSolicitudLoading, setMisSolicitudLoading] = useState(true)
  const [planSeleccionado, setPlanSeleccionado] = useState<AcademyPlanTipo | null>(null)
  const [codigoExpanded, setCodigoExpanded] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoEstado, setCodigoEstado] = useState<CodigoEstado>('idle')
  const [codigoMensaje, setCodigoMensaje] = useState('')
  const [precioFinalCodigo, setPrecioFinalCodigo] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [envioError, setEnvioError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!status || status.nivel === 'pro') {
      setMisSolicitudLoading(false)
      return
    }
    let active = true
    getMiSolicitudSuscripcion()
      .then((s) => { if (active) setMisSolicitud(s?.estado === 'pendiente' ? s : null) })
      .catch(() => {})
      .finally(() => { if (active) setMisSolicitudLoading(false) })
    return () => { active = false }
  }, [status])

  async function validarCodigo(codigo: string) {
    const limpio = codigo.trim()
    if (!limpio) {
      setCodigoEstado('idle')
      setPrecioFinalCodigo(null)
      return
    }
    if (!planSeleccionado) return
    setCodigoEstado('validando')
    try {
      const data = await validarCodigoPromocional(planSeleccionado, limpio)
      if (data.valido) {
        setCodigoEstado('valido')
        setCodigoMensaje(`Código aplicado: -USD ${Number(data.descuento_aplicado).toFixed(2)}`)
        setPrecioFinalCodigo(Number(data.precio_final))
      } else {
        setCodigoEstado('invalido')
        setCodigoMensaje(data.mensaje || 'Código inválido.')
        setPrecioFinalCodigo(null)
      }
    } catch {
      setCodigoEstado('invalido')
      setCodigoMensaje('No pudimos validar el código. Intenta de nuevo.')
      setPrecioFinalCodigo(null)
    }
  }

  // Si el usuario cambia de plan, recalcula el precio (si había un código
  // aplicado) o limpia el bloque de código (si deselecciona el plan).
  useEffect(() => {
    if (!planSeleccionado) {
      setCodigoExpanded(false)
      setCodigoInput('')
      setCodigoEstado('idle')
      setPrecioFinalCodigo(null)
      return
    }
    if (codigoEstado === 'valido' || codigoEstado === 'invalido') validarCodigo(codigoInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSeleccionado])

  async function handleEnviarSolicitud() {
    if (!planSeleccionado || enviando) return
    setEnviando(true)
    setEnvioError(null)
    try {
      const codigo = codigoEstado === 'valido' ? codigoInput.trim() : undefined
      const data = await crearSolicitudSuscripcion(planSeleccionado, codigo)
      setMisSolicitud(data)
    } catch {
      setEnvioError('No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.')
    } finally {
      setEnviando(false)
    }
  }

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
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok" /> Catálogo completo de las 7 escuelas
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

          {misSolicitudLoading ? (
            <div className="mt-4 flex justify-center py-6">
              <Spinner size={28} />
            </div>
          ) : misSolicitud ? (
            <div className="mt-4 rounded-xl border border-surface-border p-4">
              <p className="text-sm font-semibold text-ink">
                Plan {PLANES.find((p) => p.id === misSolicitud.plan_tipo)?.nombre ?? misSolicitud.plan_tipo}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
                USD {Number(misSolicitud.precio_final).toFixed(2)}
                {misSolicitud.codigo && (
                  <span className="text-sm font-normal text-ink-muted"> · código {misSolicitud.codigo}</span>
                )}
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                Tu solicitud está pendiente de confirmación de pago. Nuestro equipo te contactará a
                tu correo registrado en las próximas 24-48h para completar el pago y activar tu
                Zyfit Academy Pro.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PLANES.map((p) => {
                  const seleccionado = planSeleccionado === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlanSeleccionado((cur) => (cur === p.id ? null : p.id))}
                      className={`rounded-xl border p-4 text-left transition ${
                        seleccionado ? 'border-brand ring-1 ring-brand' : 'border-surface-border hover:border-ink-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">{p.nombre}</p>
                        {p.badge && <Badge tone="brand">{p.badge}</Badge>}
                      </div>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
                        USD {p.precioNum.toFixed(2)} <span className="text-sm font-normal text-ink-muted">{p.periodo}</span>
                      </p>
                    </button>
                  )
                })}
              </div>

              {planSeleccionado && (
                <div className="mt-5 rounded-xl border border-surface-border p-4">
                  <button
                    type="button"
                    onClick={() => setCodigoExpanded((v) => !v)}
                    className="flex w-full items-center justify-between text-sm font-medium text-ink-soft"
                  >
                    ¿Tienes un código de descuento?
                    <Icon name={codigoExpanded ? 'chevronDown' : 'chevronRight'} size={16} className="text-ink-muted" />
                  </button>
                  {codigoExpanded && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <input
                        value={codigoInput}
                        onChange={(e) => {
                          setCodigoInput(e.target.value)
                          if (codigoEstado !== 'idle') setCodigoEstado('idle')
                        }}
                        onBlur={() => validarCodigo(codigoInput)}
                        onKeyDown={(e) => { if (e.key === 'Enter') validarCodigo(codigoInput) }}
                        placeholder="Ej: MARIA20"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        className="input uppercase tracking-wide"
                      />
                      {codigoEstado === 'validando' && (
                        <p className="text-xs text-ink-muted">Validando código…</p>
                      )}
                      {codigoEstado === 'valido' && (
                        <p className="text-xs text-ok">{codigoMensaje}</p>
                      )}
                      {codigoEstado === 'invalido' && (
                        <p className="text-xs text-danger">{codigoMensaje}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-ink-soft">
                      Total:{' '}
                      <span className="font-semibold text-ink">
                        USD {(codigoEstado === 'valido' && precioFinalCodigo != null
                          ? precioFinalCodigo
                          : PLANES.find((p) => p.id === planSeleccionado)?.precioNum ?? 0
                        ).toFixed(2)}
                      </span>
                    </p>
                    <button
                      onClick={handleEnviarSolicitud}
                      disabled={enviando}
                      className="h-10 shrink-0 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {enviando ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                  </div>
                  {envioError && (
                    <p role="alert" className="mt-2 text-sm text-danger">{envioError}</p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
