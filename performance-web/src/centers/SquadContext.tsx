// Plantilla unificada del centro activo. Es la ÚNICA fuente de atletas para todo
// el panel (Plantilla, Rendimiento, Test, Psicológico, Simulador): así, registrar
// un atleta en /equipo lo hace aparecer en todos los módulos (cierra el bucle que
// antes estaba roto, con dos fuentes de verdad: el mock de squadStore y la API).
//
// Comportamiento:
//   • Centro con atletas → roster REAL (API) + métricas sintetizadas (squadSynth)
//     + overrides locales. isRealRoster = true.
//   • Centro sin atletas → lista vacía real (las pantallas invitan a /equipo).
//   • Sin centro (demo / cuenta sin centro) → squad MOCK poblado (isRealRoster
//     = false) para que el producto no se vea vacío. La <DemoBadge> lo etiqueta.

import {
  createContext, useCallback, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { useActiveCenter } from './useActiveCenter'
import { listCenterAthletes } from '@/api/performance'
import { saveAthleteEdit } from '@/lib/athletesApi'
import { athleteFromCenter } from '@/lib/squadSynth'
import { applyOverrides, pickLocalFields, saveOverride } from '@/lib/squadOverrides'
import { updateAthlete, type AthletePatch } from '@/lib/squadEdit'
import { loadSquad, saveSquad } from '@/lib/squadStore'
import type { Athlete } from '@/lib/mockSquad'

export interface SquadValue {
  athletes: Athlete[]
  loading: boolean
  error: boolean
  isRealRoster: boolean // true: viene de la API; false: demo (mock)
  centerId: number | null
  reload: () => void
  // Edita un atleta: campos reales → API; sintéticos → override local (real
  // roster) o squadStore (mock). Actualiza el estado de forma optimista.
  applyEdit: (id: string, patch: AthletePatch, meta?: Partial<Athlete>) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const SquadContext = createContext<SquadValue | null>(null)

export function SquadProvider({ children }: { children: ReactNode }) {
  const { activeCenterId } = useActiveCenter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [isRealRoster, setIsRealRoster] = useState(false)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    // Sin centro → demo mock (poblado).
    if (activeCenterId == null) {
      setAthletes(loadSquad())
      setIsRealRoster(false)
      setLoading(false)
      setError(false)
      return
    }

    let alive = true
    setLoading(true)
    setError(false)
    listCenterAthletes(activeCenterId)
      .then((dtos) => {
        if (!alive) return
        const real = applyOverrides(activeCenterId, dtos.map(athleteFromCenter))
        setAthletes(real)
        setIsRealRoster(true)
      })
      .catch(() => {
        if (!alive) return
        setError(true)
        setAthletes([])
        setIsRealRoster(true) // hay centro: no caemos al mock, mostramos el error
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activeCenterId, tick])

  const applyEdit = useCallback(
    (id: string, patch: AthletePatch, meta: Partial<Athlete> = {}) => {
      setAthletes((prev) => {
        const next = updateAthlete(prev, id, { ...patch, ...meta })
        if (isRealRoster && activeCenterId != null) {
          // Campos reales → API (cross-device). Sintéticos → override local.
          saveAthleteEdit(activeCenterId, Number(id), patch).catch(() => {})
          saveOverride(activeCenterId, id, pickLocalFields({ ...patch, ...meta }))
        } else {
          saveSquad(next) // demo mock
        }
        return next
      })
    },
    [isRealRoster, activeCenterId],
  )

  const value = useMemo<SquadValue>(
    () => ({ athletes, loading, error, isRealRoster, centerId: activeCenterId, reload, applyEdit }),
    [athletes, loading, error, isRealRoster, activeCenterId, reload, applyEdit],
  )

  return <SquadContext.Provider value={value}>{children}</SquadContext.Provider>
}
