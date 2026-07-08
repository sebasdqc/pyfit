import { apiGet } from './api'

/**
 * Handle público para el footer de WorkoutShareCard (p. ej. "@sebastian").
 * Prioriza el "usuario" elegido en Datos personales; si no está definido,
 * deriva uno de nombre/email (mismo fallback que existía antes por pantalla).
 */
export async function getShareUserLabel(): Promise<string | undefined> {
  try {
    const profile = await apiGet('/api/profile/')
    if (profile?.usuario) return `@${profile.usuario}`
    const base = (profile?.nombre || profile?.email?.split('@')[0] || '')
      .trim().toLowerCase().replace(/\s+/g, '')
    return base ? `@${base}` : undefined
  } catch {
    return undefined
  }
}
