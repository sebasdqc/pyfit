/**
 * AppleHealthService — stub para Expo Go.
 *
 * react-native-health requiere un Development Build o EAS build (módulo nativo).
 * Este stub expone la misma interfaz pero siempre indica que HealthKit no está
 * disponible, por lo que la pantalla de Dispositivos muestra el estado correcto
 * sin romper en Expo Go.
 *
 * Cuando se migre a dev build, reemplazar este archivo por la implementación
 * real en appleHealth.native.ts y configurar el resolver de Metro.
 */
import { apiPost } from './api'

export interface DeviceMetrics {
  hrv: number | null
  sleep_score: number | null
  resting_hr: number | null
  heart_rate: number | null
  stress_level: null
}

export interface SyncResult {
  last_synced_at: string
}

const AppleHealthService = {
  isAvailable(): Promise<boolean> {
    return Promise.resolve(false)
  },

  requestPermissions(): Promise<void> {
    return Promise.resolve()
  },

  async syncData(): Promise<SyncResult> {
    throw new Error('HealthKit no disponible en Expo Go. Usa un Development Build.')
  },
}

export default AppleHealthService
