// Hook compartido de la racha de estudio. Sigue el patrón simple de la app (sin
// TanStack Query): un cache a nivel de módulo que comparten el indicador de la
// Topbar y la tarjeta de "Mi aprendizaje", con un `refresh()` que se llama tras
// completar una lección/quiz para actualizar la racha en todas partes a la vez.

import { useEffect, useState } from 'react'
import { getStreak } from '@/api/academy'
import type { StreakState } from '@/types'

let cache: StreakState | null = null
const listeners = new Set<(s: StreakState | null) => void>()

export async function refreshStreak(): Promise<StreakState | null> {
  try {
    cache = await getStreak()
  } catch {
    // Mantiene el último valor conocido si falla (no rompe la UI).
  }
  listeners.forEach((fn) => fn(cache))
  return cache
}

// Limpia el cache al cerrar sesión para que no se filtre entre usuarios.
export function resetStreakCache() {
  cache = null
  listeners.forEach((fn) => fn(null))
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakState | null>(cache)

  useEffect(() => {
    listeners.add(setStreak)
    if (cache === null) refreshStreak()
    else setStreak(cache)
    return () => {
      listeners.delete(setStreak)
    }
  }, [])

  return { streak, refresh: refreshStreak }
}
