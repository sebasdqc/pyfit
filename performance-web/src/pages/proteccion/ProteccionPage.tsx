// Protección de datos de menores — consentimiento de la tutoría.
//
// Una institución educativa guarda sobre sus alumnos datos de salud (lesiones),
// psicométricos (BRUMS, ansiedad competitiva) y antropométricos. Cuando el
// alumno es menor de edad, eso exige autorización de quien ejerce su tutoría, y
// el backend BLOQUEA el registro mientras no exista (ver
// permissions.puede_registrar_dato_sensible).
//
// Esta pantalla es el lugar donde eso se resuelve, y está pensada alrededor de
// la pregunta que realmente se hace un director: «¿a cuáles de mis 40 alumnos
// les falta?» — no «¿este alumno tiene consentimiento?». Por eso la lista
// completa con un contador de pendientes arriba, y no un dato escondido en cada
// ficha.

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { Dialog } from '@/components/ui/Dialog'
import { CheckboxGrid, type Opcion } from '@/components/ui/OptionGrid'
import { useAuth } from '@/auth/useAuth'
import { useActiveCenter } from '@/centers/useActiveCenter'
import {
  createConsentimiento, getProteccionCentro, revocarConsentimiento,
} from '@/api/performance'
import type {
  DatoSensible, EstadoProteccion, ProteccionCentro, RelacionTutor,
} from '@/types'

const INPUT =
  'mt-1.5 w-full rounded-lg border border-perf-border bg-perf-bg px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent'

const DATOS: Opcion<DatoSensible>[] = [
  { id: 'salud', label: 'Salud y lesiones', hint: 'Registro de lesiones, diagnóstico y recuperación' },
  { id: 'psicologico', label: 'Evaluación psicológica', hint: 'Bienestar, ánimo y cuestionarios psicométricos' },
  { id: 'antropometrico', label: 'Antropometría y maduración', hint: 'Talla, peso y seguimiento del crecimiento' },
]

const DATO_LABEL: Record<DatoSensible, string> = {
  salud: 'Salud',
  psicologico: 'Psicológico',
  antropometrico: 'Antropometría',
}

const RELACIONES: [RelacionTutor, string][] = [
  ['madre', 'Madre'],
  ['padre', 'Padre'],
  ['tutor', 'Tutor/a legal'],
  ['otro', 'Otro'],
]

const hoyISO = () => new Date().toISOString().slice(0, 10)

function mensajeDeError(e: unknown, porDefecto: string): string {
  const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    const primero = Object.entries(data)[0]
    if (primero) {
      const [, val] = primero
      return Array.isArray(val) ? String(val[0]) : String(val)
    }
  }
  return porDefecto
}

export function ProteccionPage() {
  const { user } = useAuth()
  const { activeCenterId, termino } = useActiveCenter()
  const [datos, setDatos] = useState<ProteccionCentro | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [registrando, setRegistrando] = useState<EstadoProteccion | null>(null)

  const puedeGestionar = !!user && (user.is_admin || user.is_director)

  const cargar = useCallback(async () => {
    if (activeCenterId == null) {
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      setDatos(await getProteccionCentro(activeCenterId))
    } catch {
      setError('No se pudo cargar el estado de protección de datos.')
    } finally {
      setCargando(false)
    }
  }, [activeCenterId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function revocar(fila: EstadoProteccion) {
    if (activeCenterId == null || !fila.consentimiento) return
    const ok = window.confirm(
      `¿Revocar el consentimiento de ${fila.nombre}? A partir de ahora no se podrán registrar sus datos de salud, psicológicos ni antropométricos. El registro no se borra: queda como revocado.`,
    )
    if (!ok) return
    try {
      await revocarConsentimiento(activeCenterId, fila.athlete, fila.consentimiento.id, hoyISO())
      await cargar()
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo revocar el consentimiento.'))
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (activeCenterId == null || !datos) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-xl font-semibold tracking-tight text-white">Protección de datos</h1>
        <p className="mt-2 text-sm text-white/45">
          {error || 'Selecciona un centro para empezar.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Protección de datos</h1>
        <p className="text-xs text-white/45">
          Consentimiento de la tutoría para tratar datos sensibles de{' '}
          {termino('personas').toLowerCase()} menores de edad
        </p>
      </div>

      {!datos.proteccion_activa ? (
        <Panel>
          <p className="text-sm text-white/70">
            La protección de menores está <strong>desactivada</strong> en este centro: no se exige
            consentimiento para registrar datos de salud, psicológicos ni antropométricos.
          </p>
          <p className="mt-2.5 text-sm text-white/50">
            Si trabajas con menores de edad, actívala en <strong>Ajustes</strong>. Antes de hacerlo,
            carga la fecha de nacimiento de cada {termino('persona').toLowerCase()}: sin ella se
            tratan como menores y su registro queda bloqueado hasta que haya consentimiento.
          </p>
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Resumen label={termino('personas')} value={String(datos.total)} />
            <Resumen
              label="Con algo bloqueado"
              value={String(datos.pendientes)}
              tono={datos.pendientes > 0 ? 'warn' : 'ok'}
            />
          </div>
          {datos.pendientes > 0 && (
            <p className="mt-4 border-t border-perf-border pt-4 text-sm text-white/55">
              Mientras falte el consentimiento, el panel rechaza el registro de esas categorías de
              dato. No es una advertencia: es un bloqueo real del servidor.
            </p>
          )}
        </Panel>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-perf-danger/10 px-3.5 py-2.5 text-sm text-perf-danger">
          {error}
        </p>
      )}

      {datos.atletas.length === 0 ? (
        <Panel>
          <p className="text-sm text-white/60">
            Este centro todavía no tiene {termino('personas').toLowerCase()} registrados.
          </p>
        </Panel>
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-perf-border">
            {datos.atletas.map((fila) => {
              const bloqueadas = (Object.keys(fila.permisos) as DatoSensible[]).filter(
                (d) => !fila.permisos[d].permitido,
              )
              const motivo = bloqueadas.length ? fila.permisos[bloqueadas[0]].motivo : ''
              return (
                <li key={fila.athlete} className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{fila.nombre}</span>
                      {fila.edad !== null && (
                        <span className="text-xs text-white/45">{fila.edad} años</span>
                      )}
                      {fila.es_menor && datos.proteccion_activa && (
                        <span className="rounded-full bg-perf-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-perf-warn">
                          Menor
                        </span>
                      )}
                    </div>

                    {/* Estado por categoría de dato: lo que está y lo que falta. */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(Object.keys(fila.permisos) as DatoSensible[]).map((d) => {
                        const ok = fila.permisos[d].permitido
                        return (
                          <span
                            key={d}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              ok ? 'bg-perf-ok/10 text-perf-ok' : 'bg-perf-danger/10 text-perf-danger'
                            }`}
                          >
                            <Icon name={ok ? 'check' : 'close'} size={11} />
                            {DATO_LABEL[d]}
                          </span>
                        )
                      })}
                    </div>

                    {motivo && <p className="mt-2 text-xs leading-relaxed text-white/50">{motivo}</p>}

                    {fila.consentimiento && (
                      <p className="mt-2 text-xs text-white/40">
                        Autoriza {fila.consentimiento.tutor_nombre} · desde el{' '}
                        {fila.consentimiento.otorgado_en}
                        {fila.consentimiento.documento_ref ? ` · ${fila.consentimiento.documento_ref}` : ''}
                      </p>
                    )}
                  </div>

                  {puedeGestionar && datos.proteccion_activa && fila.es_menor && (
                    <div className="flex shrink-0 items-center gap-2">
                      {fila.consentimiento ? (
                        <button
                          type="button"
                          onClick={() => void revocar(fila)}
                          className="rounded-lg border border-perf-border px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-perf-danger hover:text-perf-danger"
                        >
                          Revocar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRegistrando(fila)}
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accentDark"
                        >
                          Registrar consentimiento
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <p className="text-xs leading-relaxed text-white/35">
        El panel guarda la constancia de quién autorizó, con qué alcance y cuándo. El documento
        firmado y la base legal los conserva la institución: esta herramienta da la trazabilidad,
        no reemplaza la asesoría legal del centro.
      </p>

      {registrando && activeCenterId != null && (
        <ConsentimientoModal
          centerId={activeCenterId}
          fila={registrando}
          onClose={() => setRegistrando(null)}
          onSaved={() => {
            setRegistrando(null)
            void cargar()
          }}
        />
      )}
    </div>
  )
}

function Resumen({ label, value, tono }: { label: string; value: string; tono?: 'ok' | 'warn' }) {
  const color = tono === 'warn' ? 'text-perf-warn' : tono === 'ok' ? 'text-perf-ok' : 'text-white'
  return (
    <div>
      <p className="text-xs text-white/45">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tracking-tight tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function ConsentimientoModal({
  centerId, fila, onClose, onSaved,
}: {
  centerId: number
  fila: EstadoProteccion
  onClose: () => void
  onSaved: () => void
}) {
  const [tutorNombre, setTutorNombre] = useState('')
  const [relacion, setRelacion] = useState<RelacionTutor>('tutor')
  const [email, setEmail] = useState('')
  // Se ofrecen las tres marcadas: quien registra un consentimiento normalmente
  // tiene el documento completo delante. Desmarcar es la excepción, no la regla.
  const [alcance, setAlcance] = useState<DatoSensible[]>(['salud', 'psicologico', 'antropometrico'])
  const [documento, setDocumento] = useState('')
  const [otorgado, setOtorgado] = useState(hoyISO())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const puedeGuardar = tutorNombre.trim().length > 0 && alcance.length > 0 && !!otorgado && !guardando

  function alternar(id: DatoSensible) {
    setAlcance((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  async function guardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError('')
    try {
      await createConsentimiento(centerId, fila.athlete, {
        tutor_nombre: tutorNombre.trim(),
        tutor_relacion: relacion,
        tutor_email: email.trim(),
        alcance,
        documento_ref: documento.trim(),
        otorgado_en: otorgado,
      })
      onSaved()
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo registrar el consentimiento.'))
      setGuardando(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="consentimiento-title"
      className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-perf-border bg-perf-surface shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-perf-border px-5 py-4">
        <div>
          <h2 id="consentimiento-title" className="text-sm font-semibold text-white">
            Registrar consentimiento
          </h2>
          <p className="mt-0.5 text-xs text-white/45">{fila.nombre}</p>
        </div>
        <button type="button" onClick={onClose} className="text-white/45 hover:text-white" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-white/60">Quién autoriza</span>
            <input
              data-autofocus
              value={tutorNombre}
              maxLength={160}
              onChange={(e) => setTutorNombre(e.target.value)}
              placeholder="Nombre y apellido"
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-white/60">Relación</span>
            <select
              value={relacion}
              onChange={(e) => setRelacion(e.target.value as RelacionTutor)}
              className={INPUT}
            >
              {RELACIONES.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-white/60">Email de contacto (opcional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-white/60">Fecha de otorgamiento</span>
            <input
              type="date"
              value={otorgado}
              max={hoyISO()}
              onChange={(e) => setOtorgado(e.target.value)}
              className={INPUT}
            />
          </label>
        </div>

        <div>
          <p className="mb-2.5 text-xs font-medium text-white/60">Qué autoriza</p>
          <CheckboxGrid
            legend="Categorías de dato autorizadas"
            opciones={DATOS}
            valores={alcance}
            onToggle={alternar}
          />
          {alcance.length === 0 && (
            <p className="mt-2 text-xs text-perf-warn">
              Marca al menos una categoría: un consentimiento que no autoriza nada aparenta
              cobertura sin darla.
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-medium text-white/60">Referencia del documento firmado</span>
          <input
            value={documento}
            maxLength={200}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="p. ej. Expediente 2026-114"
            className={INPUT}
          />
          <span className="mt-1 block text-[11px] text-white/35">
            El documento lo conserva la institución; acá se guarda dónde encontrarlo.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-perf-danger/10 px-3 py-2 text-xs text-perf-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-perf-border px-5 py-4">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:text-white">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={!puedeGuardar}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
    </Dialog>
  )
}
