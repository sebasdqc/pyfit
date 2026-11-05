// Cobros y suscripciones de Academy Pro — SOLO admin.
// No hay pasarela de pago: el admin cobra por fuera (transferencia, pago móvil,
// efectivo...) y lo registra aquí. Cada cobro queda en el libro de pagos y
// extiende la suscripción del usuario; un cobro equivocado se ANULA (no se
// borra) y el acceso se recalcula. Ver academy.billing_service.

import { isAxiosError } from 'axios'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  anularPago, cancelarSuscripcionAdmin, getAdminPagos, getAdminSuscripciones, listAcademyUsers,
  registrarPago, rechazarSolicitud,
} from '@/api/academy'
import { useAuth } from '@/auth/useAuth'
import { Callout, Panel, PanelEmpty, fechaCorta, fechaLarga, num, usd } from '@/components/admin/AdminBits'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/Icon'
import type {
  AcademyUserAccount, AdminEstadoEfectivo, AdminMetodoPago, AdminPago, AdminPlanTipo,
  AdminSolicitud, AdminSuscripcion, AdminSuscripciones,
} from '@/types'

// Precios de lista de Academy Pro (USD) — mismos que promos.payments.PRECIOS.
// Solo precargan el monto; el admin puede cambiarlo (descuentos, acuerdos).
const PRECIO_LISTA: Record<AdminPlanTipo, number> = { mensual: 25, trimestral: 50, anual: 150 }
const PLAN_LABEL: Record<AdminPlanTipo, string> = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' }
const METODOS: { id: AdminMetodoPago; label: string }[] = [
  { id: 'transferencia', label: 'Transferencia' }, { id: 'pago_movil', label: 'Pago móvil' },
  { id: 'zelle', label: 'Zelle' }, { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' }, { id: 'otro', label: 'Otro' },
]
const METODO_LABEL = Object.fromEntries(METODOS.map((m) => [m.id, m.label])) as Record<string, string>

const ESTADO: Record<AdminEstadoEfectivo, { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' }> = {
  vigente: { label: 'Vigente', tone: 'ok' },
  por_vencer: { label: 'Por vencer', tone: 'warn' },
  vencida: { label: 'Vencida', tone: 'danger' },
  cancelada_con_acceso: { label: 'Cancelada · con acceso', tone: 'warn' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
  pago_fallido: { label: 'Pago fallido', tone: 'danger' },
}

function errorDetail(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail
    if (detail) return detail
  }
  return fallback
}

interface PagoInicial {
  user: { id: number; email: string } | null
  plan: AdminPlanTipo
  monto: number
  solicitudId?: number
}

export function AdminBillingPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminSuscripciones | null>(null)
  const [pagos, setPagos] = useState<AdminPago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [estado, setEstado] = useState<'todas' | AdminEstadoEfectivo>('todas')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [dialogPago, setDialogPago] = useState<PagoInicial | null>(null)
  const [anular, setAnular] = useState<AdminPago | null>(null)
  const [cancelar, setCancelar] = useState<AdminSuscripcion | null>(null)
  const [aviso, setAviso] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(id)
  }, [q])

  const cargar = useCallback(async () => {
    setError(false)
    try {
      const [subs, ledger] = await Promise.all([
        getAdminSuscripciones({ estado: estado === 'todas' ? undefined : estado, q: debouncedQ || undefined }),
        getAdminPagos({ q: debouncedQ || undefined }),
      ])
      setData(subs)
      setPagos(ledger)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [estado, debouncedQ])

  useEffect(() => {
    if (user?.is_admin) void cargar()
  }, [cargar, user?.is_admin])

  if (!user?.is_admin) {
    return <EmptyState icon="shield" title="Área de administración" description="Solo los administradores pueden gestionar cobros." />
  }

  const conteo = data?.conteo ?? {}
  const filtros: { id: 'todas' | AdminEstadoEfectivo; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'vigente', label: 'Vigentes' },
    { id: 'por_vencer', label: 'Por vencer' },
    { id: 'vencida', label: 'Vencidas' },
    { id: 'cancelada_con_acceso', label: 'Canceladas' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-surface-border pb-5 sm:flex-row sm:items-end">
        <div>
          <Link to="/admin/metricas?tab=finanzas" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
            <Icon name="chevronLeft" size={16} /> Métricas
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Cobros y suscripciones</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Registra los pagos de Academy Pro. Cada pago extiende el acceso del usuario; si te equivocas, anúlalo y el acceso se recalcula.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogPago({ user: null, plan: 'mensual', monto: PRECIO_LISTA.mensual })}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          <Icon name="plus" size={16} /> Registrar pago
        </button>
      </header>

      {aviso && (
        <div role="status" className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${aviso.tone === 'ok' ? 'border-ok/30 bg-ok/5 text-ink' : 'border-danger/30 bg-danger/5 text-ink'}`}>
          <span>{aviso.text}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="text-ink-muted hover:text-ink"><Icon name="close" size={16} /></button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-20"><Spinner size={40} /></div>
      ) : error ? (
        <EmptyState
          icon="activity"
          title="No se pudieron cargar los cobros"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={<button onClick={() => { setLoading(true); void cargar() }} className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark">Reintentar</button>}
        />
      ) : data && (
        <>
          {data.solicitudes.length > 0 && (
            <Panel id="sol-title" title="Solicitudes de Pro pendientes" subtitle="Usuarios que pidieron suscribirse. Cobra por fuera y registra el pago para activarlos." aside={`${data.solicitudes.length} pendiente(s)`}>
              <ul className="divide-y divide-surface-border">
                {data.solicitudes.map((s) => (
                  <SolicitudRow
                    key={s.id}
                    s={s}
                    onPagar={() => setDialogPago({ user: { id: s.user_id, email: s.email }, plan: s.plan_tipo, monto: s.precio_final, solicitudId: s.id })}
                    onRechazada={() => { setAviso({ tone: 'ok', text: `Solicitud de ${s.email} rechazada.` }); void cargar() }}
                    onError={(text) => setAviso({ tone: 'danger', text })}
                  />
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            id="subs-title"
            title="Suscriptores"
            subtitle="El estado refleja si el período pagado sigue vigente, no solo lo que quedó guardado."
            aside={
              <label className="relative block">
                <span className="sr-only">Buscar por correo o nombre</span>
                <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input className="input h-9 w-56 pl-9 text-sm" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
            }
          >
            <div className="flex flex-wrap gap-2 border-b border-surface-border px-5 py-3" role="group" aria-label="Filtrar por estado">
              {filtros.map((f) => {
                const n = f.id === 'todas' ? Object.values(conteo).reduce((a, b) => a + (b ?? 0), 0) : (conteo[f.id] ?? 0)
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={estado === f.id}
                    onClick={() => setEstado(f.id)}
                    className={`h-8 rounded-full px-3 text-xs font-semibold ${estado === f.id ? 'bg-accent text-white' : 'border border-surface-border text-ink-soft hover:text-ink'}`}
                  >
                    {f.label} · {n}
                  </button>
                )
              })}
            </div>
            {data.suscripciones.length === 0 ? (
              <PanelEmpty message="No hay suscriptores con este filtro. Registra un pago para activar el primero." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="px-5 py-3 font-semibold">Usuario</th>
                      <th className="px-3 py-3 font-semibold">Plan</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-3 py-3 font-semibold">Vence</th>
                      <th className="px-3 py-3 text-right font-semibold">Pagado</th>
                      <th className="px-5 py-3 text-right font-semibold"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {data.suscripciones.map((s) => {
                      const est = ESTADO[s.estado_efectivo] ?? { label: s.estado_efectivo, tone: 'neutral' as const }
                      return (
                        <tr key={s.user_id}>
                          <td className="max-w-[16rem] px-5 py-3">
                            <p className="truncate font-medium text-ink">{s.nombre}</p>
                            <p className="truncate text-xs text-ink-muted">{s.email}</p>
                          </td>
                          <td className="px-3 py-3 text-ink-soft">{PLAN_LABEL[s.plan_tipo]}</td>
                          <td className="px-3 py-3"><Badge tone={est.tone}>{est.label}</Badge></td>
                          <td className="px-3 py-3 text-ink-soft">
                            {s.fecha_renovacion ? (
                              <>
                                {fechaLarga(s.fecha_renovacion)}
                                {s.dias_restantes !== null && (
                                  <span className="block text-xs text-ink-muted">
                                    {s.dias_restantes >= 0 ? `en ${s.dias_restantes} día(s)` : `hace ${-s.dias_restantes} día(s)`}
                                  </span>
                                )}
                              </>
                            ) : 'Sin vencimiento'}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-soft">
                            {s.pagos ? <>{usd(s.total_pagado)}<span className="block text-xs text-ink-muted">{s.pagos} pago(s)</span></> : <span className="text-xs text-ink-muted">sin pagos</span>}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setDialogPago({ user: { id: s.user_id, email: s.email }, plan: s.plan_tipo, monto: PRECIO_LISTA[s.plan_tipo] })}
                              className="text-xs font-semibold text-accent hover:text-accent-dark"
                            >
                              Registrar pago
                            </button>
                            {(s.estado_efectivo === 'vigente' || s.estado_efectivo === 'por_vencer') && (
                              <button type="button" onClick={() => setCancelar(s)} className="ml-3 text-xs font-semibold text-ink-soft hover:text-danger">
                                Cancelar renovación
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel id="pagos-title" title="Libro de pagos" subtitle="Historial de cobros. Los anulados se conservan pero no cuentan en los ingresos." aside={`${num(pagos.length)} mostrado(s)`}>
            {pagos.length === 0 ? <PanelEmpty message="Aún no se ha registrado ningún pago." /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="px-5 py-3 font-semibold">Fecha</th>
                      <th className="px-3 py-3 font-semibold">Usuario</th>
                      <th className="px-3 py-3 font-semibold">Plan</th>
                      <th className="px-3 py-3 text-right font-semibold">Monto</th>
                      <th className="px-3 py-3 font-semibold">Método</th>
                      <th className="px-3 py-3 font-semibold">Cubre</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                      <th className="px-5 py-3 text-right font-semibold"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {pagos.map((p) => (
                      <tr key={p.id} className={p.estado === 'anulado' ? 'opacity-60' : ''}>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-soft">{fechaLarga(p.fecha_pago)}</td>
                        <td className="max-w-[14rem] truncate px-3 py-3 text-ink">{p.email || 'Cuenta eliminada'}</td>
                        <td className="px-3 py-3 text-ink-soft">{PLAN_LABEL[p.plan_tipo]}</td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums text-ink ${p.estado === 'anulado' ? 'line-through' : ''}`}>{usd(p.monto)}</td>
                        <td className="px-3 py-3 text-ink-soft">
                          {METODO_LABEL[p.metodo] ?? p.metodo}
                          {p.referencia && <span className="block text-xs text-ink-muted">ref. {p.referencia}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-muted">{fechaCorta(p.periodo_desde)} → {fechaCorta(p.periodo_hasta)}</td>
                        <td className="px-3 py-3">
                          {p.estado === 'confirmado' ? <Badge tone="ok">Confirmado</Badge> : <Badge tone="neutral">Anulado</Badge>}
                          {p.motivo_anulacion && <span className="block max-w-[10rem] truncate text-xs text-ink-muted" title={p.motivo_anulacion}>{p.motivo_anulacion}</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {p.estado === 'confirmado' && (
                            <button type="button" onClick={() => setAnular(p)} className="text-xs font-semibold text-ink-soft hover:text-danger">Anular</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {dialogPago && (
        <RegistrarPagoDialog
          inicial={dialogPago}
          onClose={() => setDialogPago(null)}
          onDone={(email, hasta) => {
            setDialogPago(null)
            setAviso({ tone: 'ok', text: `Pago registrado para ${email}. Tiene acceso Pro hasta el ${fechaLarga(hasta)}.` })
            void cargar()
          }}
        />
      )}
      {anular && (
        <AnularDialog
          pago={anular}
          onClose={() => setAnular(null)}
          onDone={() => {
            setAviso({ tone: 'ok', text: 'Pago anulado. El acceso del usuario se recalculó con los pagos que quedan.' })
            setAnular(null)
            void cargar()
          }}
        />
      )}
      {cancelar && (
        <CancelarDialog
          sub={cancelar}
          onClose={() => setCancelar(null)}
          onDone={() => {
            setAviso({ tone: 'ok', text: `Renovación de ${cancelar.email} cancelada. Conserva el acceso hasta el fin del período pagado.` })
            setCancelar(null)
            void cargar()
          }}
        />
      )}
    </div>
  )
}

function SolicitudRow({
  s, onPagar, onRechazada, onError,
}: { s: AdminSolicitud; onPagar: () => void; onRechazada: () => void; onError: (t: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function rechazar() {
    setBusy(true)
    try {
      await rechazarSolicitud(s.id)
      onRechazada()
    } catch (err) {
      onError(errorDetail(err, 'No se pudo rechazar la solicitud.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{s.email}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Plan {PLAN_LABEL[s.plan_tipo].toLowerCase()} · {usd(s.precio_final)}
          {s.descuento > 0 && <> (lista {usd(s.precio_lista)}, código <strong>{s.codigo}</strong>)</>}
          {' '}· pedida el {fechaCorta(s.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onPagar} className="h-9 rounded-lg bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-dark">Registrar pago</button>
        <button type="button" disabled={busy} onClick={rechazar} className="h-9 rounded-lg border border-surface-border px-4 text-xs font-semibold text-ink-soft hover:text-danger disabled:opacity-60">Rechazar</button>
      </div>
    </li>
  )
}

function RegistrarPagoDialog({
  inicial, onClose, onDone,
}: { inicial: PagoInicial; onClose: () => void; onDone: (email: string, hasta: string) => void }) {
  const [usuario, setUsuario] = useState(inicial.user)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<AcademyUserAccount[]>([])
  const [plan, setPlan] = useState<AdminPlanTipo>(inicial.plan)
  const [monto, setMonto] = useState(String(inicial.monto))
  const [montoTocado, setMontoTocado] = useState(inicial.solicitudId !== undefined)
  const [metodo, setMetodo] = useState<AdminMetodoPago>('transferencia')
  const [referencia, setReferencia] = useState('')
  const [fecha, setFecha] = useState('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const hoy = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (usuario || busqueda.trim().length < 2) { setResultados([]); return }
    const id = setTimeout(() => {
      listAcademyUsers({ q: busqueda.trim() }).then((r) => setResultados(r.slice(0, 6))).catch(() => setResultados([]))
    }, 300)
    return () => clearTimeout(id)
  }, [busqueda, usuario])

  function cambiarPlan(p: AdminPlanTipo) {
    setPlan(p)
    if (!montoTocado) setMonto(String(PRECIO_LISTA[p]))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!usuario) { setError('Elige el usuario que pagó.'); return }
    setEnviando(true)
    setError('')
    try {
      const res = await registrarPago({
        user_id: usuario.id, plan_tipo: plan, monto, metodo,
        referencia: referencia.trim() || undefined, fecha_pago: fecha || undefined,
        nota: nota.trim() || undefined, solicitud_id: inicial.solicitudId,
      })
      onDone(usuario.email, res.fecha_renovacion)
    } catch (err) {
      setError(errorDetail(err, 'No se pudo registrar el pago. Inténtalo de nuevo.'))
      setEnviando(false)
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="pago-titulo" className="za-card max-h-[92vh] w-full max-w-lg overflow-y-auto p-6">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <div>
          <h2 id="pago-titulo" className="text-lg font-bold text-ink">Registrar pago</h2>
          <p className="mt-1 text-sm text-ink-soft">Suma el período al acceso Pro del usuario. Si ya tiene Pro vigente, se agrega al final.</p>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Usuario</span>
          {usuario ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-soft/60 px-3 py-2.5 text-sm">
              <span className="truncate font-medium text-ink">{usuario.email}</span>
              {inicial.user === null && <button type="button" onClick={() => setUsuario(null)} className="shrink-0 text-xs font-semibold text-accent">Cambiar</button>}
            </div>
          ) : (
            <>
              <input className="input h-10 w-full text-sm" placeholder="Busca por correo o nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} autoFocus />
              {resultados.length > 0 && (
                <ul className="mt-2 divide-y divide-surface-border overflow-hidden rounded-xl border border-surface-border">
                  {resultados.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setUsuario({ id: r.id, email: r.email })} className="flex w-full flex-col px-3 py-2 text-left hover:bg-surface-soft">
                        <span className="text-sm font-medium text-ink">{r.nombre || r.email}</span>
                        <span className="text-xs text-ink-muted">{r.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Plan
            <select className="input h-10 text-sm" value={plan} onChange={(e) => cambiarPlan(e.target.value as AdminPlanTipo)}>
              {(Object.keys(PLAN_LABEL) as AdminPlanTipo[]).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]} · lista {usd(PRECIO_LISTA[p])}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Monto cobrado (USD)
            <input className="input h-10 text-sm" inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setMontoTocado(true) }} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Método
            <select className="input h-10 text-sm" value={metodo} onChange={(e) => setMetodo(e.target.value as AdminMetodoPago)}>
              {METODOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Fecha del pago
            <input className="input h-10 text-sm" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
          Referencia (opcional)
          <input className="input h-10 text-sm" maxLength={120} placeholder="N.º de transferencia, comprobante…" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          <span className="text-xs font-normal text-ink-muted">Evita cobros duplicados: no se acepta la misma referencia dos veces para el mismo usuario.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
          Nota interna (opcional)
          <textarea className="input min-h-16 py-2 text-sm" value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>

        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-surface-border px-5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
          <button type="submit" disabled={enviando} className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
            {enviando ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function AnularDialog({ pago, onClose, onDone }: { pago: AdminPago; onClose: () => void; onDone: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await anularPago(pago.id, motivo.trim())
      onDone()
    } catch (err) {
      setError(errorDetail(err, 'No se pudo anular el pago.'))
      setEnviando(false)
    }
  }
  return (
    <Dialog onClose={onClose} labelledBy="anular-titulo" className="za-card w-full max-w-md p-6">
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        <div>
          <h2 id="anular-titulo" className="text-lg font-bold text-ink">Anular pago</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {usd(pago.monto)} de {pago.email} ({fechaLarga(pago.fecha_pago)}). Dejará de contar en los ingresos y el acceso Pro de
            esta persona se recalculará con los pagos que le queden. El registro se conserva.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
          Motivo
          <input className="input h-10 text-sm" maxLength={200} placeholder="Duplicado, monto equivocado, no llegó el dinero…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-surface-border px-5 text-sm font-semibold text-ink-soft hover:text-ink">Volver</button>
          <button type="submit" disabled={enviando} className="h-10 rounded-xl bg-danger px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {enviando ? 'Anulando…' : 'Anular pago'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function CancelarDialog({ sub, onClose, onDone }: { sub: AdminSuscripcion; onClose: () => void; onDone: () => void }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  async function confirmar() {
    setEnviando(true)
    setError('')
    try {
      await cancelarSuscripcionAdmin(sub.user_id)
      onDone()
    } catch (err) {
      setError(errorDetail(err, 'No se pudo cancelar la renovación.'))
      setEnviando(false)
    }
  }
  return (
    <Dialog onClose={onClose} labelledBy="cancelar-titulo" className="za-card w-full max-w-md p-6">
      <div className="flex flex-col gap-4">
        <Callout title="Cancelar la renovación">
          <span id="cancelar-titulo" className="sr-only">Cancelar la renovación</span>
          {sub.email} conserva el acceso Pro hasta el {sub.fecha_renovacion ? fechaLarga(sub.fecha_renovacion) : 'fin del período pagado'} y
          después vuelve al plan gratuito. No se devuelve dinero. Si cobraste de más, anula el pago desde el libro.
        </Callout>
        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-surface-border px-5 text-sm font-semibold text-ink-soft hover:text-ink">Volver</button>
          <button type="button" disabled={enviando} onClick={confirmar} className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
            {enviando ? 'Cancelando…' : 'Cancelar renovación'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
