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

export type RunStatus = 'idle' | 'active' | 'paused' | 'completed'

export interface GpsCoordinate {
  latitude:  number
  longitude: number
  altitude:  number | null
  accuracy:  number | null
  timestamp: string
}

export interface UseRunTrackingReturn {
  sessionId:           number | null
  status:              RunStatus
  coordinates:         GpsCoordinate[]
  totalDistance:       number   // metros
  currentPace:         number   // segundos por km (0 = desconocido)
  elapsedSeconds:      number
  totalElevationGain:  number   // metros acumulados de subida
  backgroundActive:    boolean  // true cuando el background GPS está corriendo
  error:               string | null
  // true si, tras reintentar, no se pudo sincronizar el final de la carrera con
  // el backend (puntos GPS finales y/o marca de fin) — la sesión igual se
  // detiene localmente (no podemos retener el GPS indefinidamente), pero la
  // pantalla debe avisarle al usuario en vez de festejar como si nada.
  stopSyncFailed:      boolean
  startRun:  (isTrail?: boolean) => Promise<void>
  pauseRun:  () => Promise<void>
  resumeRun: () => Promise<void>
  stopRun:   () => Promise<void>
}

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRunTracking(): UseRunTrackingReturn {
  const [sessionId,           setSessionId]           = useState<number | null>(null)
  const [status,              setStatus]              = useState<RunStatus>('idle')
  const [coordinates,         setCoordinates]         = useState<GpsCoordinate[]>([])
  const [totalDistance,       setTotalDistance]       = useState(0)
  const [currentPace,         setCurrentPace]         = useState(0)
  const [elapsedSeconds,      setElapsedSeconds]      = useState(0)
  const [totalElevationGain,  setTotalElevationGain]  = useState(0)
  const [backgroundActive,    setBackgroundActive]    = useState(false)
  const [error,               setError]               = useState<string | null>(null)
  const [stopSyncFailed,      setStopSyncFailed]      = useState(false)

  // Refs para intervals y datos acumulados
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  const batchRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  const drainRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  const locationSubRef        = useRef<Location.LocationSubscription | null>(null)
  const pendingPointsRef      = useRef<GpsCoordinate[]>([])
  const sessionIdRef          = useRef<number | null>(null)
  const coordinatesRef        = useRef<GpsCoordinate[]>([])
  const totalDistanceRef      = useRef(0)
  const totalElevationGainRef = useRef(0)
  const lastAltitudeRef       = useRef<number | null>(null)
  const startingRef           = useRef(false)   // guard de reentrada para startRun
  const stoppingRef           = useRef(false)   // guard de reentrada para stopRun
  const statusRef             = useRef<RunStatus>('idle')  // status legible dentro de callbacks
  const accumulatedSecondsRef = useRef(0)        // segundos ACTIVOS acumulados (sin pausas)
  const segmentStartRef       = useRef(0)        // epoch ms del inicio del segmento activo actual

  // Mantener statusRef en sync con el estado para los guards de pause/resume
  useEffect(() => { statusRef.current = status }, [status])

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

    // Elevation gain: only accumulate rises > 1.5 m to filter GPS altitude noise
    if (point.altitude !== null) {
      if (lastAltitudeRef.current !== null) {
        const rise = point.altitude - lastAltitudeRef.current
        if (rise > 1.5) {
          totalElevationGainRef.current += rise
          setTotalElevationGain(totalElevationGainRef.current)
        }
      }
      lastAltitudeRef.current = point.altitude
    }

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

  // ── Timer: cuenta segundos ACTIVOS acumulados (excluye pausas). Reloj de
  //    pared para no desfasarse cuando el SO congela los timers JS en background.
  const startTimer = useCallback(() => {
    if (timerRef.current) return
    timerRef.current = setInterval(() => {
      setElapsedSeconds(
        accumulatedSecondsRef.current + Math.floor((Date.now() - segmentStartRef.current) / 1000),
      )
    }, 1000)
  }, [])

  // ── Levantar la captura GPS (background con fallback a foreground watch)
  const startLocationCapture = useCallback(async () => {
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
  }, [drainQueue, ingestPoint])

  // ── Detener la captura GPS (sin tocar el timer ni el batch); drena lo pendiente
  const stopLocationCapture = useCallback(async () => {
    if (drainRef.current) { clearInterval(drainRef.current); drainRef.current = null }
    locationSubRef.current?.remove()
    locationSubRef.current = null
    await drainQueue().catch(() => {})
    await stopBackgroundGps().catch(() => {})
    setBackgroundActive(false)
  }, [drainQueue])

  // ── Iniciar carrera
  const startRun = useCallback(async (isTrail = false) => {
    if (startingRef.current) return   // guard doble-tap: evita crear 2 RunSession
    startingRef.current = true
    setError(null)
    setStopSyncFailed(false)
    try {
      // Permiso de foreground (mínimo necesario)
      const { status: perm } = await Location.requestForegroundPermissionsAsync()
      if (perm !== 'granted') {
        setError('Se necesita permiso de ubicación para registrar tu carrera.')
        return
      }

      // Crear sesión en backend (is_trail llega desde el check-in de trail)
      const session = await createRunSession(new Date().toISOString(), isTrail)
      sessionIdRef.current   = session.id
      setSessionId(session.id)

      // Reset state
      coordinatesRef.current = []
      totalDistanceRef.current = 0
      totalElevationGainRef.current = 0
      lastAltitudeRef.current = null
      pendingPointsRef.current = []
      setCoordinates([])
      setTotalDistance(0)
      setCurrentPace(0)
      setElapsedSeconds(0)
      setTotalElevationGain(0)
      statusRef.current = 'active'
      setStatus('active')

      // ── Timer de tiempo ACTIVO (excluye pausas)
      accumulatedSecondsRef.current = 0
      segmentStartRef.current = Date.now()
      startTimer()

      // ── Captura GPS (background con fallback a foreground)
      await startLocationCapture()

      // ── Envío periódico de puntos al backend (funciona igual en ambos modos)
      batchRef.current = setInterval(flushPoints, BATCH_INTERVAL_MS)

    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar la carrera')
      clearAll()
      await stopBackgroundGps().catch(() => {})
    } finally {
      startingRef.current = false
    }
  }, [clearAll, flushPoints, startTimer, startLocationCapture])

  // ── Pausar carrera: congela el tiempo y detiene el GPS. El gap resultante
  //    hace que el backend excluya la pausa del tiempo en movimiento.
  const pauseRun = useCallback(async () => {
    if (statusRef.current !== 'active') return
    accumulatedSecondsRef.current += Math.floor((Date.now() - segmentStartRef.current) / 1000)
    setElapsedSeconds(accumulatedSecondsRef.current)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    statusRef.current = 'paused'
    setStatus('paused')
    await stopLocationCapture()
    await flushPoints()
  }, [stopLocationCapture, flushPoints])

  // ── Reanudar carrera: abre un nuevo segmento de tiempo y reactiva el GPS.
  const resumeRun = useCallback(async () => {
    if (statusRef.current !== 'paused') return
    segmentStartRef.current = Date.now()
    statusRef.current = 'active'
    setStatus('active')
    startTimer()
    await startLocationCapture()
  }, [startTimer, startLocationCapture])

  // ── Detener carrera
  const stopRun = useCallback(async () => {
    if (sessionIdRef.current == null || stoppingRef.current) return  // guard reentrada
    stoppingRef.current = true
    clearAll()
    await stopBackgroundGps().catch(() => {})
    setBackgroundActive(false)

    const sid     = sessionIdRef.current
    const endedAt = new Date().toISOString()

    // Hasta 3 intentos (con espera breve) antes de darnos por vencidos — una
    // sola red caída momentánea no debe perder los puntos finales ni la marca
    // de fin de la carrera.
    let synced = false
    for (let attempt = 1; attempt <= 3 && !synced; attempt++) {
      try {
        if (attempt > 1) await sleep(1500)
        await drainQueue()
        if (pendingPointsRef.current.length > 0) {
          await sendRunPoints(sid, [...pendingPointsRef.current])
          pendingPointsRef.current = []
        }
        await completeRunSession(sid, endedAt)
        synced = true
      } catch {
        // Reintentar; si es el último intento, se refleja abajo.
      }
    }
    setStopSyncFailed(!synced)
    // Navegar al resumen DESPUÉS de completar (el efecto de la pantalla reacciona
    // a 'completed'), para que el backend ya tenga las métricas al hacer el GET
    // (si el sync falló igual navegamos: no podemos retener el GPS indefinidamente,
    // pero la pantalla avisa con stopSyncFailed en vez de festejar en silencio).
    statusRef.current = 'completed'
    setStatus('completed')
  }, [clearAll, drainQueue])

  return {
    sessionId,
    status,
    coordinates,
    totalDistance,
    currentPace,
    elapsedSeconds,
    totalElevationGain,
    backgroundActive,
    error,
    stopSyncFailed,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
  }
}
