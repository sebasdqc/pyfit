// Ajustes del centro activo.
//
// Existe sobre todo por un campo: `tipo`. Decide la navegación y el vocabulario
// de TODO el staff del centro, se siembra con la respuesta del onboarding de
// quien lo creó, y hasta ahora la única forma de corregirlo era el admin de
// Django. Los demás datos del centro se editan de paso, en el mismo lugar.
//
// Al guardar se refresca /me/: el tipo viaja en ese payload, así que la barra
// lateral se reordena sola sin recargar la página.

import { useEffect, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { RadioGrid, type Opcion } from '@/components/ui/OptionGrid'
import { Toggle } from '@/components/ui/Toggle'
import { useAuth } from '@/auth/useAuth'
import { useActiveCenter } from '@/centers/useActiveCenter'
import { getCenter, updateCenter } from '@/api/performance'
import type { SportsCenter, TipoCentro } from '@/types'

// Las descripciones son las mismas que usa el onboarding y la landing: un
// centro mal clasificado casi siempre viene de no haber entendido la diferencia,
// así que acá conviene repetirla, no abreviarla.
const TIPOS: Opcion<TipoCentro>[] = [
  {
    id: 'equipos',
    label: 'Equipo deportivo',
    hint: 'Un club o centro con cuerpo técnico completo trabajando sobre el mismo plantel.',
  },
  {
    id: 'instituciones',
    label: 'Institución educativa',
    hint: 'Escuela o academia que forma jóvenes atletas y sigue su evolución por temporadas.',
  },
  {
    id: 'atletas',
    label: 'Atleta de alto rendimiento',
    hint: 'Deportista individual con su propio cuerpo técnico, que quiere sus datos en un solo lugar.',
  },
]

const INPUT =
  'mt-1.5 w-full rounded-lg border border-perf-border bg-perf-bg px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent'

function mensajeDeError(e: unknown): string {
  const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    const primero = Object.entries(data)[0]
    if (primero) {
      const [campo, val] = primero
      return `${campo}: ${Array.isArray(val) ? String(val[0]) : String(val)}`
    }
  }
  return 'No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.'
}

export function AjustesPage() {
  const { user, refreshUser } = useAuth()
  const { activeCenterId, activeCenter } = useActiveCenter()

  const [centro, setCentro] = useState<SportsCenter | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)

  // Borrador editable
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoCentro>('equipos')
  const [ciudad, setCiudad] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [proteccionMenores, setProteccionMenores] = useState(false)

  const puedeEditar = !!user && (user.is_admin || user.is_director)

  useEffect(() => {
    if (activeCenterId == null) {
      setCargando(false)
      return
    }
    let vivo = true
    setCargando(true)
    setError('')
    getCenter(activeCenterId)
      .then((c) => {
        if (!vivo) return
        setCentro(c)
        setNombre(c.nombre)
        setTipo(c.tipo)
        setCiudad(c.ciudad ?? '')
        setDisciplina(c.disciplina ?? '')
        setProteccionMenores(c.proteccion_menores)
      })
      .catch(() => {
        if (vivo) setError('No se pudo cargar el centro.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [activeCenterId])

  const hayCambios =
    !!centro &&
    (nombre.trim() !== centro.nombre ||
      tipo !== centro.tipo ||
      ciudad.trim() !== (centro.ciudad ?? '') ||
      disciplina.trim() !== (centro.disciplina ?? '') ||
      proteccionMenores !== centro.proteccion_menores)

  async function guardar() {
    if (activeCenterId == null || !hayCambios || guardando) return
    setGuardando(true)
    setError('')
    setGuardado(false)
    try {
      const actualizado = await updateCenter(activeCenterId, {
        nombre: nombre.trim(),
        tipo,
        ciudad: ciudad.trim(),
        disciplina: disciplina.trim(),
        proteccion_menores: proteccionMenores,
      })
      setCentro(actualizado)
      // El tipo viaja en /me/: refrescar reordena la barra lateral al instante.
      await refreshUser()
      setGuardado(true)
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (activeCenterId == null || !centro) {
    return (
      <div className="mx-auto flex max-w-[900px] flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-white">Ajustes</h1>
        <Panel>
          <p className="text-sm text-white/60">
            {error || 'Selecciona un centro para ver sus ajustes.'}
          </p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Ajustes del centro</h1>
        <p className="text-xs text-white/50">{activeCenter?.center_nombre ?? centro.nombre}</p>
      </div>

      {!puedeEditar && (
        <Panel>
          <p className="text-sm text-white/60">
            Solo el director del centro puede cambiar estos datos. Puedes consultarlos, pero no
            editarlos.
          </p>
        </Panel>
      )}

      {/* Tipo de centro — el motivo por el que existe esta pantalla. */}
      <Panel>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-white">Tipo de centro</h2>
          <p className="max-w-2xl text-xs leading-relaxed text-white/50">
            Define qué secciones aparecen en el panel y cómo se llaman, para todo el staff del
            centro. No cambia ningún dato ya cargado y se puede volver a cambiar cuando quieras.
          </p>
        </div>
        <div className="mt-4">
          <RadioGrid
            name="tipo-centro"
            legend="Tipo de centro"
            opciones={TIPOS}
            valor={tipo}
            onChange={(id) => puedeEditar && setTipo(id)}
            columnas={1}
          />
        </div>
      </Panel>

      {/* Protección de datos de menores */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Protección de datos de menores</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/50">
              Exige el consentimiento de la tutoría para registrar datos de salud, psicológicos y
              antropométricos de las personas menores de edad del centro. Mientras falte, el
              servidor rechaza el registro — no es un aviso, es un bloqueo.
            </p>
          </div>
          <Toggle
            checked={proteccionMenores}
            onChange={(v) => puedeEditar && setProteccionMenores(v)}
            disabled={!puedeEditar}
            label="Protección de datos de menores"
          />
        </div>
        {proteccionMenores && !centro.proteccion_menores && (
          <p className="mt-4 rounded-lg bg-perf-warn/10 px-3.5 py-2.5 text-xs leading-relaxed text-perf-warn">
            Antes de guardar: quien no tenga fecha de nacimiento cargada se tratará como menor de
            edad, y su registro de lesiones y evaluaciones quedará bloqueado hasta que haya
            consentimiento. Revisa las fichas primero.
          </p>
        )}
      </Panel>

      {/* Datos generales */}
      <Panel>
        <h2 className="text-sm font-semibold text-white">Datos del centro</h2>
        <div className="mt-4 flex flex-col gap-4">
          <label className="block max-w-md">
            <span className="text-xs font-medium text-white/60">Nombre</span>
            <input
              value={nombre}
              maxLength={160}
              disabled={!puedeEditar}
              onChange={(e) => setNombre(e.target.value)}
              className={INPUT}
            />
          </label>

          <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-white/60">Disciplina</span>
              <input
                value={disciplina}
                maxLength={80}
                disabled={!puedeEditar}
                onChange={(e) => setDisciplina(e.target.value)}
                placeholder="Fútbol"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-white/60">Ciudad</span>
              <input
                value={ciudad}
                maxLength={120}
                disabled={!puedeEditar}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Opcional"
                className={INPUT}
              />
            </label>
          </div>

          <div>
            <span className="text-xs font-medium text-white/60">Identificador</span>
            <p className="mt-1.5 font-mono text-sm text-white/45">{centro.slug}</p>
            <p className="mt-1 text-[11px] text-white/35">
              No se puede cambiar: identifica al centro de forma estable.
            </p>
          </div>
        </div>
      </Panel>

      {/* Acciones */}
      {puedeEditar && (
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
          {error && (
            <p role="alert" className="text-sm text-perf-danger">
              {error}
            </p>
          )}
          {guardado && !hayCambios && (
            <p role="status" className="text-sm text-perf-ok">
              Cambios guardados.
            </p>
          )}
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={!hayCambios || guardando}
            className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:min-w-[170px]"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  )
}
