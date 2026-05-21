import { useState, useRef, useEffect, useCallback } from 'react'
import * as Location from 'expo-location'
import { createRunSession, sendRunPoints, completeRunSession } from '../lib/runsApi'
import { haversineDistance, calculateCurrentPace } from '../lib/runMetrics'

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_INTERVAL_MS = 10000   // send GPS batch every 10 seconds
const GPS_INTERVAL_MS = 2000      // poll GPS every 2 seconds
const MIN_ACCURACY_M = 20         // ignore readings worse than 20m accuracy

// ─── Types ────────────────────────────────────────────────────────────────────

export type RunStatus = 'idle' | 'active' | 'completed'

export interface GpsCoordinate {
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number | null
  timestamp: string
}

export interface UseRunTrackingReturn {
  sessionId: number | null
  status: RunStatus
  coordinates: GpsCoordinate[]
  totalDistance: number   // meters
  currentPace: number     // seconds per km (0 = unknown)
  elapsedSeconds: number
  error: string | null
  startRun: () => Promise<void>
  stopRun: () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRunTracking(): UseRunTrackingReturn {
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [status, setStatus] = useState<RunStatus>('idle')
  const [coordinates, setCoordinates] = useState<GpsCoordinate[]>([])
  const [totalDistance, setTotalDistance] = useState(0)
  const [currentPace, setCurrentPace] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Refs for intervals and accumulated data
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gpsRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const batchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingPointsRef = useRef<GpsCoordinate[]>([])
  const sessionIdRef = useRef<number | null>(null)
  const coordinatesRef = useRef<GpsCoordinate[]>([])
  const totalDistanceRef = useRef(0)
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null)

  // ── Cleanup all intervals and subscriptions
  const clearAll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (gpsRef.current) {
      clearInterval(gpsRef.current)
      gpsRef.current = null
    }
    if (batchRef.current) {
      clearInterval(batchRef.current)
      batchRef.current = null
    }
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove()
      locationSubscriptionRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAll()
    }
  }, [clearAll])

  // ── Flush pending GPS points to server
  const flushPoints = useCallback(async () => {
    const sid = sessionIdRef.current
    if (!sid || pendingPointsRef.current.length === 0) return
    const batch = [...pendingPointsRef.current]
    pendingPointsRef.current = []
    try {
      await sendRunPoints(sid, batch)
    } catch {
      // Put points back on failure so they'll retry next batch
      pendingPointsRef.current = [...batch, ...pendingPointsRef.current]
    }
  }, [])

  // ── Start run
  const startRun = useCallback(async () => {
    setError(null)
    try {
      // Request permissions
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync()
      if (permStatus !== 'granted') {
        setError('Se necesita permiso de ubicación para registrar tu carrera.')
        return
      }

      // Create session on backend
      const startedAt = new Date().toISOString()
      const session = await createRunSession(startedAt)
      sessionIdRef.current = session.id
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

      // ── Elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)

      // ── GPS tracking via watchPositionAsync
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: GPS_INTERVAL_MS,
          distanceInterval: 2, // meters
        },
        (location) => {
          const { latitude, longitude, altitude, accuracy } = location.coords

          // Filter low-accuracy readings
          if (accuracy !== null && accuracy > MIN_ACCURACY_M) return

          const point: GpsCoordinate = {
            latitude,
            longitude,
            altitude: altitude ?? null,
            accuracy: accuracy ?? null,
            timestamp: new Date(location.timestamp).toISOString(),
          }

          // Update distance
          const prev = coordinatesRef.current
          if (prev.length > 0) {
            const last = prev[prev.length - 1]
            const d = haversineDistance(
              last.latitude,
              last.longitude,
              latitude,
              longitude,
            )
            totalDistanceRef.current += d
            setTotalDistance(totalDistanceRef.current)
          }

          // Update coordinates
          coordinatesRef.current = [...prev, point]
          setCoordinates([...coordinatesRef.current])

          // Update current pace
          const pace = calculateCurrentPace(coordinatesRef.current, 5)
          setCurrentPace(pace)

          // Queue for batch send
          pendingPointsRef.current.push(point)
        },
      )

      // ── Batch send interval
      batchRef.current = setInterval(() => {
        flushPoints()
      }, BATCH_INTERVAL_MS)

    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar la carrera')
      clearAll()
    }
  }, [clearAll, flushPoints])

  // ── Stop run
  const stopRun = useCallback(async () => {
    if (sessionIdRef.current == null) return
    clearAll()

    // Mark completed immediately so the UI navigates without waiting for network
    const sid = sessionIdRef.current
    const endedAt = new Date().toISOString()
    setStatus('completed')

    // Fire-and-forget: flush remaining points and complete the session on backend
    try {
      if (pendingPointsRef.current.length > 0) {
        await sendRunPoints(sid, [...pendingPointsRef.current])
        pendingPointsRef.current = []
      }
      await completeRunSession(sid, endedAt)
    } catch {
      // Network error — session is stopped locally; ignore
    }
  }, [clearAll])

  return {
    sessionId,
    status,
    coordinates,
    totalDistance,
    currentPace,
    elapsedSeconds,
    error,
    startRun,
    stopRun,
  }
}
