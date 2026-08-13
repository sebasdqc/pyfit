// Centro activo del panel. Mantiene cuál de los centros del usuario está
// seleccionado (persistido en localStorage), lo reconcilia con la lista de
// centros de /me/ y expone el gating fino de módulos según la membresía.
//
// Antes cada pantalla resolvía el centro por su cuenta (Dashboard usaba
// centros[0], Equipo tenía su propio <select>…): no había una noción única de
// "centro activo". Este provider la centraliza para que el selector del Topbar,
// la barra lateral y todos los módulos compartan el mismo contexto.

import {
  createContext, useCallback, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { useAuth } from '@/auth/useAuth'
import { listCenters } from '@/api/performance'
import { MODULES } from '@/lib/constants'
import { perfilDe, type PerfilCentro, type TerminoId } from '@/lib/perfiles'
import type { CenterMembershipSummary, ModuleId, TipoCentro } from '@/types'

const STORAGE_KEY = 'zperf_active_center'
const ALL_MODULE_IDS: ModuleId[] = MODULES.map((m) => m.id)

export interface ActiveCenterValue {
  centers: CenterMembershipSummary[]
  activeCenterId: number | null
  activeCenter: CenterMembershipSummary | null
  setActiveCenterId: (id: number) => void
  // Gating fino: ¿el usuario puede ver este módulo en el centro activo?
  // Admin/director ven todo; el staff, solo los módulos de su membresía.
  canSeeModule: (moduleId: ModuleId) => boolean
  // Público del centro activo y su perfil de producto (navegación + vocabulario).
  // Ver lib/perfiles.ts. Sin centro resuelto todavía, cae a la línea base.
  tipoCentro: TipoCentro
  perfil: PerfilCentro
  // Vocabulario: el mismo concepto nombrado como lo nombra este público.
  termino: (id: TerminoId) => string
  // Etiqueta de un ítem de navegación para este público, con su valor por
  // defecto. Lo usan los títulos de página: el encabezado tiene que decir lo
  // mismo que el enlace del sidebar que te trajo hasta acá, o la navegación
  // deja de tener sentido apenas el perfil renombra algo.
  etiquetaNav: (navId: string, porDefecto: string) => string
}

// eslint-disable-next-line react-refresh/only-export-components
export const ActiveCenterContext = createContext<ActiveCenterValue | null>(null)

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeStored(id: number | null): void {
  try {
    if (id == null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    /* sin localStorage (modo privado/cuota): se ignora */
  }
}

export function ActiveCenterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Centros de la membresía (vía /me/). Si el usuario es admin/staff sin
  // membresía explícita, se completan con listCenters() (ve todos los centros).
  const membershipCenters = useMemo(() => user?.centros ?? [], [user])
  const [fetched, setFetched] = useState<CenterMembershipSummary[]>([])

  useEffect(() => {
    if (!user || membershipCenters.length > 0) {
      setFetched([])
      return
    }
    let alive = true
    listCenters()
      .then((cs) => {
        if (!alive) return
        setFetched(
          cs.map((c) => ({
            center_id: c.id,
            center_nombre: c.nombre,
            center_tipo: c.tipo,
            rol: 'director_tecnico' as const,
            modulos: ALL_MODULE_IDS,
          })),
        )
      })
      .catch(() => {
        /* sin permisos para listar: el usuario simplemente no tiene centros */
      })
    return () => {
      alive = false
    }
  }, [user, membershipCenters.length])

  const centers = membershipCenters.length > 0 ? membershipCenters : fetched

  const [activeCenterId, setActiveCenterIdState] = useState<number | null>(() => readStored())

  // Reconciliar el centro activo con los centros disponibles: si el guardado ya
  // no existe (o no hay ninguno), caer al primero disponible.
  useEffect(() => {
    if (centers.length === 0) {
      if (activeCenterId !== null) setActiveCenterIdState(null)
      return
    }
    const exists = centers.some((c) => c.center_id === activeCenterId)
    if (!exists) {
      const next = centers[0].center_id
      setActiveCenterIdState(next)
      writeStored(next)
    }
  }, [centers, activeCenterId])

  const setActiveCenterId = useCallback((id: number) => {
    setActiveCenterIdState(id)
    writeStored(id)
  }, [])

  const activeCenter = useMemo(
    () => centers.find((c) => c.center_id === activeCenterId) ?? null,
    [centers, activeCenterId],
  )

  const isAdminOrDirector = !!user?.is_admin || !!user?.is_director

  const canSeeModule = useCallback(
    (moduleId: ModuleId) => {
      if (isAdminOrDirector) return true
      // Sin centro resuelto todavía: no ocultamos nada (evita un panel vacío).
      if (!activeCenter) return true
      return activeCenter.modulos.includes(moduleId)
    },
    [isAdminOrDirector, activeCenter],
  )

  // 'equipos' mientras no haya centro resuelto: es la línea base y coincide con
  // el default del backend, así que el primer render nunca recorta el panel.
  const tipoCentro: TipoCentro = activeCenter?.center_tipo ?? 'equipos'
  const perfil = useMemo(() => perfilDe(tipoCentro), [tipoCentro])
  const termino = useCallback((id: TerminoId) => perfil.terminos[id], [perfil])
  const etiquetaNav = useCallback(
    (navId: string, porDefecto: string) => perfil.navEtiquetas[navId] ?? porDefecto,
    [perfil],
  )

  const value = useMemo<ActiveCenterValue>(
    () => ({
      centers, activeCenterId, activeCenter, setActiveCenterId, canSeeModule,
      tipoCentro, perfil, termino, etiquetaNav,
    }),
    [
      centers, activeCenterId, activeCenter, setActiveCenterId, canSeeModule,
      tipoCentro, perfil, termino, etiquetaNav,
    ],
  )

  return <ActiveCenterContext.Provider value={value}>{children}</ActiveCenterContext.Provider>
}
