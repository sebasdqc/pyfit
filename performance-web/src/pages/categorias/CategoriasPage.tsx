// Categorías / cohortes del centro — unidad de trabajo de las instituciones
// educativas.
//
// Antes esto era `CenterAthlete.grupo`, un texto libre: servía para etiquetar,
// no para comparar entre categorías ni seguir a un alumno entre temporadas.
// Acá una categoría es una entidad con temporada y responsable, y la misma
// categoría puede existir año tras año ("Sub-14 2026" y "Sub-14 2027" son filas
// distintas) — que es exactamente lo que habilita la lectura longitudinal.

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { Panel } from '@/components/ui/Panel'
import { Spinner } from '@/components/ui/Spinner'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/auth/useAuth'
import { useActiveCenter } from '@/centers/useActiveCenter'
import {
  createCategoria, deleteCategoria, listCategorias, updateCategoria,
} from '@/api/performance'
import type { Categoria } from '@/types'

const INPUT =
  'mt-1.5 w-full rounded-lg border border-perf-border bg-perf-bg px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent'

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

export function CategoriasPage() {
  const { user } = useAuth()
  const { activeCenterId, termino } = useActiveCenter()
  const [categorias, setCategorias] = useState<Categoria[] | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState<Categoria | 'nueva' | null>(null)

  const puedeGestionar = !!user && (user.is_admin || user.is_director)

  const cargar = useCallback(async () => {
    if (activeCenterId == null) {
      setCargando(false)
      return
    }
    setCargando(true)
    setError('')
    try {
      setCategorias(await listCategorias(activeCenterId))
    } catch {
      setError('No se pudieron cargar las categorías.')
    } finally {
      setCargando(false)
    }
  }, [activeCenterId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function borrar(cat: Categoria) {
    if (activeCenterId == null) return
    const ok = window.confirm(
      `¿Eliminar la categoría "${cat.nombre}"? Sus ${cat.total_atletas} integrantes no se borran: quedan sin categoría asignada.`,
    )
    if (!ok) return
    try {
      await deleteCategoria(activeCenterId, cat.id)
      await cargar()
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo eliminar la categoría.'))
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (activeCenterId == null) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-xl font-semibold tracking-tight text-white">{termino('grupo')}</h1>
        <p className="mt-2 text-sm text-white/45">Selecciona un centro para empezar.</p>
      </div>
    )
  }

  const lista = categorias ?? []

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">{termino('grupo')}</h1>
          <p className="text-xs text-white/45">
            La misma categoría puede existir en varias temporadas — así se sigue a un{' '}
            {termino('persona').toLowerCase()} a lo largo de los años.
          </p>
        </div>
        {puedeGestionar && (
          <button
            type="button"
            onClick={() => setEditando('nueva')}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
          >
            <span aria-hidden className="text-base leading-none">+</span>
            Nueva categoría
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-perf-danger/10 px-3.5 py-2.5 text-sm text-perf-danger">
          {error}
        </p>
      )}

      {lista.length === 0 ? (
        <Panel>
          <p className="text-sm text-white/60">
            Todavía no hay categorías. Créalas para organizar a tus{' '}
            {termino('personas').toLowerCase()} por edad o nivel, y poder compararlas entre sí y
            entre temporadas.
          </p>
        </Panel>
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-perf-border">
            {lista.map((cat) => (
              <li key={cat.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{cat.nombre}</span>
                    {cat.temporada && (
                      <span className="rounded-full border border-perf-border px-2 py-0.5 text-[10px] font-medium text-white/55">
                        {cat.temporada}
                      </span>
                    )}
                    {!cat.activa && (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/45">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-white/45">
                    {cat.total_atletas} {cat.total_atletas === 1 ? termino('persona').toLowerCase() : termino('personas').toLowerCase()}
                    {cat.responsable_nombre ? ` · ${cat.responsable_nombre}` : ''}
                  </p>
                </div>
                {puedeGestionar && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditando(cat)}
                      className="rounded-lg p-2 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                      aria-label={`Editar ${cat.nombre}`}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void borrar(cat)}
                      className="rounded-lg p-2 text-white/45 transition-colors hover:bg-perf-danger/10 hover:text-perf-danger"
                      aria-label={`Eliminar ${cat.nombre}`}
                    >
                      <Icon name="close" size={17} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {editando && activeCenterId != null && (
        <CategoriaModal
          centerId={activeCenterId}
          categoria={editando === 'nueva' ? null : editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null)
            void cargar()
          }}
        />
      )}
    </div>
  )
}

function CategoriaModal({
  centerId, categoria, onClose, onSaved,
}: {
  centerId: number
  categoria: Categoria | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [temporada, setTemporada] = useState(categoria?.temporada ?? '')
  const [orden, setOrden] = useState(String(categoria?.orden ?? 0))
  const [activa, setActiva] = useState(categoria?.activa ?? true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const puedeGuardar = nombre.trim().length > 0 && !guardando

  async function guardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError('')
    const payload = {
      nombre: nombre.trim(),
      temporada: temporada.trim(),
      orden: Number(orden) || 0,
      activa,
    }
    try {
      if (categoria) await updateCategoria(centerId, categoria.id, payload)
      else await createCategoria(centerId, payload)
      onSaved()
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo guardar la categoría.'))
      setGuardando(false)
    }
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="categoria-title"
      className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-perf-border bg-perf-surface shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-between border-b border-perf-border px-5 py-4">
        <h2 id="categoria-title" className="text-sm font-semibold text-white">
          {categoria ? 'Editar categoría' : 'Nueva categoría'}
        </h2>
        <button type="button" onClick={onClose} className="text-white/45 hover:text-white" aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        <label className="block">
          <span className="text-xs font-medium text-white/60">Nombre</span>
          <input
            data-autofocus
            value={nombre}
            maxLength={80}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Sub-14"
            className={INPUT}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-white/60">Temporada</span>
            <input
              value={temporada}
              maxLength={20}
              onChange={(e) => setTemporada(e.target.value)}
              placeholder="2026"
              className={INPUT}
            />
            <span className="mt-1 block text-[11px] text-white/35">
              Texto libre: admite «2026», «2026/27» o «Ciclo 2026».
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-white/60">Orden</span>
            <input
              type="number"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className={INPUT}
            />
            <span className="mt-1 block text-[11px] text-white/35">
              Para que Sub-10 no caiga después de Sub-1.
            </span>
          </label>
        </div>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={activa}
            onChange={(e) => setActiva(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm text-white/80">Categoría activa</span>
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
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Dialog>
  )
}
