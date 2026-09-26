// Plantilla unificada del centro activo. Es la ÚNICA fuente de atletas para todo
// el panel (Plantilla, Rendimiento, Test, Psicológico, Simulador): así, registrar
// un atleta en /equipo lo hace aparecer en todos los módulos (cierra el bucle que
// antes estaba roto, con dos fuentes de verdad: el mock de squadStore y la API).
//
// Comportamiento:
//   • Centro con atletas → roster REAL (API), sin métricas inventadas.
//   • Centro sin atletas → lista vacía real (las pantallas invitan a /equipo).
//   • Sin centro → lista vacía. Un fallo o un hueco nunca cae a datos demo.

import {
  createContext, useCallback, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { useActiveCenter } from './useActiveCenter'
import { listCenterAthletes } from '@/api/performance'
import { saveAthleteEdit } from '@/lib/athletesApi'
import { athleteFromCenter } from '@/lib/squadSynth'
import { updateAthlete, type AthletePatch } from '@/lib/squadEdit'
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
  // El panel autenticado falla hacia "real/vacío" desde el primer render para
  // impedir incluso un frame de stores demo antes de resolver el centro.
  const [isRealRoster, setIsRealRoster] = useState(true)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    // Sin centro → vacío explícito. No hay fallback demo en cuentas reales.
    if (activeCenterId == null) {
      setAthletes([])
      setIsRealRoster(true)
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
        const real = dtos.map(athleteFromCenter)
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
          // Solo los campos modelados se persisten; no hay overrides sintéticos.
          saveAthleteEdit(activeCenterId, Number(id), patch).catch(() => {})
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
