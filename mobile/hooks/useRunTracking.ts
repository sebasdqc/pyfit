import { useState, useRef, useEffect, useCallback } from 'react'
import * as Location from 'expo-location'
import { createRunSession, sendRunPoints, completeRunSession } from '../lib/runsApi'
import { haversineDistance, calculateCurrentPace } from '../lib/runMetrics'
import {
  startBackgroundGps,
  stopBackgroundGps,
  drainBackgroundQueue,
} from '../lib/backgroundGps'

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_INTERVAL_MS  = 10_000  // enviar lote GPS al backend cada 10 s
const DRAIN_INTERVAL_MS  =  2_000  // drenar cola de background cada 2 s
const MIN_ACCURACY_M     =     20  // ignorar lecturas peores de 20 m

// ─── Types ────────────────────────────────────────────────────────────────────

export type RunStatus = 'idle' | 'active' | 'completed'

export interface GpsCoordinate {
  latitude:  number
  longitude: number
  altitude:  number | null
  accuracy:  number | null
  timestamp: string
}

export interface UseRunTrackingReturn {
  sessionId:        number | null
  status:           RunStatus
  coordinates:      GpsCoordinate[]
  totalDistance:    number   // metros
  currentPace:      number   // segundos por km (0 = desconocido)
  elapsedSeconds:   number
  backgroundActive: boolean  // true cuando el background GPS está corriendo
  error:            string | null
  startRun:  () => Promise<void>
  stopRun:   () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRunTracking(): UseRunTrackingReturn {
  const [sessionId,        setSessionId]        = useState<number | null>(null)
  const [status,           setStatus]           = useState<RunStatus>('idle')
  const [coordinates,      setCoordinates]      = useState<GpsCoordinate[]>([])
  const [totalDistance,    setTotalDistance]    = useState(0)
  const [currentPace,      setCurrentPace]      = useState(0)
  const [elapsedSeconds,   setElapsedSeconds]   = useState(0)
  const [backgroundActive, setBackgroundActive] = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  // Refs para intervals y datos acumulados
  const timerRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const batchRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const drainRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const locationSubRef       = useRef<Location.LocationSubscription | null>(null)
  const pendingPointsRef     = useRef<GpsCoordinate[]>([])
  const sessionIdRef         = useRef<number | null>(null)
  const coordinatesRef       = useRef<GpsCoordinate[]>([])
  const totalDistanceRef     = useRef(0)
  const startingRef          = useRef(false)   // guard de reentrada para startRun

  // ── Limpiar todos los intervals/subscriptions
  const clearAll = useCallback(() => {
    timerRef.current   && (clearInterval(timerRef.current),   timerRef.current   = null)
    batchRef.current   && (clearInterval(batchRef.current),   batchRef.current   = null)
    drainRef.current   && (clearInterval(drainRef.current),   drainRef.current   = null)
    locationSubRef.current?.remove()
    locationSubRef.current = null
  }, [])

  useEffect(() => () => {
    clearAll()
    // Red de seguridad: si el componente se desmonta con el GPS de fondo aún
    // activo, detenerlo para no dejar el foreground service / task huérfano.
    stopBackgroundGps().catch(() => {})
  }, [clearAll])

  // ── Integrar un punto GPS (foreground o background) en el estado
  const ingestPoint = useCallback((point: GpsCoordinate) => {
    const prev = coordinatesRef.current
    if (prev.length > 0) {
      const last = prev[prev.length - 1]
      const d = haversineDistance(last.latitude, last.longitude, point.latitude, point.longitude)
      totalDistanceRef.current += d
      setTotalDistance(totalDistanceRef.current)
    }
    coordinatesRef.current = [...prev, point]
    setCoordinates([...coordinatesRef.current])
    setCurrentPace(calculateCurrentPace(coordinatesRef.current, 5))
    pendingPointsRef.current.push(point)
  }, [])

  // ── Drenar la cola escrita por el background task
  const drainQueue = useCallback(async () => {
    const points = await drainBackgroundQueue()
    // Deduplicar por timestamp (puede haber solapamiento con foreground)
    const seen = new Set(coordinatesRef.current.map(p => p.timestamp))
    for (const p of points) {
      if (!seen.has(p.timestamp)) {
        seen.add(p.timestamp)
        ingestPoint(p)
      }
    }
  }, [ingestPoint])

  // ── Enviar lote de puntos al backend
  const flushPoints = useCallback(async () => {
    const sid = sessionIdRef.current
    if (!sid || pendingPointsRef.current.length === 0) return
    const batch = [...pendingPointsRef.current]
    pendingPointsRef.current = []
    try {
      await sendRunPoints(sid, batch)
    } catch {
      // Re-encolar en caso de error de red
      pendingPointsRef.current = [...batch, ...pendingPointsRef.current]
    }
  }, [])

  // ── Iniciar carrera
  const startRun = useCallback(async () => {
    if (startingRef.current) return   // guard doble-tap: evita crear 2 RunSession
    startingRef.current = true
    setError(null)
    try {
      // Permiso de foreground (mínimo necesario)
      const { status: perm } = await Location.requestForegroundPermissionsAsync()
      if (perm !== 'granted') {
        setError('Se necesita permiso de ubicación para registrar tu carrera.')
        return
      }

      // Crear sesión en backend
      const session = await createRunSession(new Date().toISOString())
      sessionIdRef.current   = session.id
      setSessionId(session.id)

      // Reset state
      coordinatesRef.current = []
      totalDistanceRef.current = 0
      pendingPointsRef.current = []
      setCoordinates([])
      setTotalDistance(0)
      setCurrentPace(0)
      setElapsedSeconds(0)
      setStatus('active')

      // ── Timer de tiempo transcurrido
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

      // ── Background GPS (pide permiso "always" y levanta el task)
      //    Devuelve true si el background quedó activo, false si cayó al fallback.
      const bgStarted = await startBackgroundGps()
      setBackgroundActive(bgStarted)

      if (bgStarted) {
        // El background task escribe a AsyncStorage → drenar periódicamente
        drainRef.current = setInterval(drainQueue, DRAIN_INTERVAL_MS)
      } else {
        // Fallback: watchPositionAsync captura mientras la app está en primer plano
        locationSubRef.current = await Location.watchPositionAsync(
          {
            accuracy:         Location.Accuracy.BestForNavigation,
            timeInterval:     2000,
            distanceInterval: 2,
          },
          (loc) => {
            const { latitude, longitude, altitude, accuracy } = loc.coords
            if (accuracy !== null && accuracy > MIN_ACCURACY_M) return
            ingestPoint({
              latitude, longitude,
              altitude:  altitude ?? null,
              accuracy:  accuracy ?? null,
              timestamp: new Date(loc.timestamp).toISOString(),
            })
          },
        )
      }

      // ── Envío periódico de puntos al backend (funciona igual en ambos modos)
      batchRef.current = setInterval(flushPoints, BATCH_INTERVAL_MS)

    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar la carrera')
      clearAll()
      await stopBackgroundGps().catch(() => {})
    } finally {
      startingRef.current = false
    }
  }, [clearAll, flushPoints, drainQueue, ingestPoint])

  // ── Detener carrera
  const stopRun = useCallback(async () => {
    if (sessionIdRef.current == null) return
    clearAll()
    await stopBackgroundGps().catch(() => {})
    setBackgroundActive(false)

    const sid     = sessionIdRef.current
    const endedAt = new Date().toISOString()
    setStatus('completed')

    try {
      // Drenar cola final por si quedaron puntos en background
      await drainQueue()
      if (pendingPointsRef.current.length > 0) {
        await sendRunPoints(sid, [...pendingPointsRef.current])
        pendingPointsRef.current = []
      }
      await completeRunSession(sid, endedAt)
    } catch {
      // Error de red — sesión parada localmente
    }
  }, [clearAll, drainQueue])

  return {
    sessionId,
    status,
    coordinates,
    totalDistance,
    currentPace,
    elapsedSeconds,
    backgroundActive,
    error,
    startRun,
    stopRun,
  }
}
