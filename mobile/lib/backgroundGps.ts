/**
 * backgroundGps.ts — GPS en segundo plano con expo-task-manager
 *
 * Arquitectura:
 *  - `startLocationUpdatesAsync` registra un background task que corre incluso
 *    con la pantalla apagada (iOS: requiere development build + UIBackgroundModes
 *    location; Android: levanta un foreground service con notificación).
 *  - El task escribe puntos en AsyncStorage (cola FIFO).
 *  - El hook `useRunTracking` drena la cola cada 2 s para actualizar la UI.
 *
 * Fallback gracioso:
 *  - Si el permiso "always" no es concedido (o estamos en Expo Go iOS), el task
 *    simplemente no arranca. `watchPositionAsync` del hook sigue capturando
 *    mientras la app está en primer plano — el usuario pierde puntos solo cuando
 *    apaga la pantalla. En producción (dev build) el background funciona completo.
 *
 * IMPORTANTE: `TaskManager.defineTask` DEBE llamarse en el nivel de módulo
 * (no dentro de un componente ni de un hook). Este archivo se importa desde
 * el layout raíz `app/_layout.tsx` para garantizar que el task esté registrado
 * antes de cualquier render.
 */

import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { GpsCoordinate } from '../hooks/useRunTracking'

// ─── Constantes ───────────────────────────────────────────────────────────────

export const BACKGROUND_GPS_TASK = 'zyfit-background-gps'

const QUEUE_KEY  = '@zyfit/bgGpsQueue'    // puntos pendientes de consumir
const ACTIVE_KEY = '@zyfit/bgGpsActive'   // flag "sesión activa"

const MIN_ACCURACY_M = 25  // igual que useRunTracking (filtra lecturas malas)

// ─── Definición del Task (nivel módulo — obligatorio) ─────────────────────────

TaskManager.defineTask(BACKGROUND_GPS_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('[BGGps] error en task:', error.message)
    return
  }

  // Verificar que la sesión sigue activa (el usuario no la paró mientras
  // la pantalla estaba apagada — evita acumular puntos huérfanos)
  const activeFlag = await AsyncStorage.getItem(ACTIVE_KEY)
  if (activeFlag !== 'true') return

  const locations: Location.LocationObject[] = data?.locations ?? []
  if (locations.length === 0) return

  // Filtrar lecturas de baja precisión
  const filtered = locations.filter(
    l => l.coords.accuracy === null || l.coords.accuracy <= MIN_ACCURACY_M,
  )
  if (filtered.length === 0) return

  const newPoints: GpsCoordinate[] = filtered.map(loc => ({
    latitude:  loc.coords.latitude,
    longitude: loc.coords.longitude,
    altitude:  loc.coords.altitude  ?? null,
    accuracy:  loc.coords.accuracy  ?? null,
    timestamp: new Date(loc.timestamp).toISOString(),
  }))

  // Append a la cola — operación atómica vía lectura + escritura
  try {
    const raw      = await AsyncStorage.getItem(QUEUE_KEY)
    const existing = raw ? (JSON.parse(raw) as GpsCoordinate[]) : []
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, ...newPoints]))
  } catch (e) {
    console.warn('[BGGps] error escribiendo cola:', e)
  }
})

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Solicita permiso de ubicación "always" e inicia el background task.
 * Lanza si el permiso es denegado.
 * Si el task ya estaba corriendo (reinicio de sesión), lo detiene primero.
 */
export async function startBackgroundGps(): Promise<boolean> {
  // Vaciar cola y marcar activo ANTES de pedir permiso (el task puede recibir
  // puntos muy rápido después de arrancar)
  await AsyncStorage.setItem(QUEUE_KEY,  JSON.stringify([]))
  await AsyncStorage.setItem(ACTIVE_KEY, 'true')

  // En Expo Go el permiso "background" puede no ser soportado — capturamos el error
  let bgGranted = false
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync()
    bgGranted = status === 'granted'
  } catch {
    // Expo Go o dispositivo sin soporte → continúa solo con foreground
  }

  if (!bgGranted) {
    // No lanzamos error: el hook usa watchPositionAsync como fallback
    return false
  }

  // Detener instancia anterior si existe
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_GPS_TASK)
    if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_GPS_TASK)
  } catch {}

  await Location.startLocationUpdatesAsync(BACKGROUND_GPS_TASK, {
    accuracy:          Location.Accuracy.BestForNavigation,
    timeInterval:      2000,   // ms
    distanceInterval:  2,      // metros mínimos entre lecturas
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,  // barra azul iOS
    foregroundService: {
      // Android: foreground service (obligatorio para background en Android 8+)
      notificationTitle: 'Zyfit · Carrera en curso',
      notificationBody:  'Registrando tu recorrido en segundo plano…',
      notificationColor: '#4f8cff',
    },
  })

  return true
}

/**
 * Detiene el background task y marca la sesión como inactiva.
 */
export async function stopBackgroundGps(): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, 'false')
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_GPS_TASK)
    if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_GPS_TASK)
  } catch {}
}

/**
 * Lee y vacía la cola de puntos acumulados por el background task.
 * El hook llama esto periódicamente para fusionar con su estado local.
 */
export async function drainBackgroundQueue(): Promise<GpsCoordinate[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const points = JSON.parse(raw) as GpsCoordinate[]
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]))
    return points
  } catch {
    return []
  }
}
