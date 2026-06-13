import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
const PROBE_TIMEOUT_MS = 4000
const POLL_INTERVAL_MS = 30_000

/**
 * Detecta si el dispositivo puede alcanzar el backend.
 * Usa un HEAD a /api/auth/login/ (que retorna 405, pero sí responde = online).
 * Se vuelve a probar al recuperar foco de la app y cada 30 s.
 */
export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false)
  const probing = useRef(false)

  const probe = useCallback(async () => {
    if (probing.current) return
    probing.current = true
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
      await fetch(`${BASE_URL}/api/auth/login/`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timer)
      setIsOffline(false)
    } catch {
      setIsOffline(true)
    } finally {
      probing.current = false
    }
  }, [])

  useEffect(() => {
    probe()
    const interval = setInterval(probe, POLL_INTERVAL_MS)
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') probe()
    })
    return () => {
      clearInterval(interval)
      sub.remove()
    }
  }, [probe])

  return { isOffline }
}
