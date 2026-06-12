import * as SecureStore from 'expo-secure-store'

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync('access_token', access)
  await SecureStore.setItemAsync('refresh_token', refresh)
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token')
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync('refresh_token')
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('access_token')
  await SecureStore.deleteItemAsync('refresh_token')
}

export async function saveUser(user: object) {
  await SecureStore.setItemAsync('user_data', JSON.stringify(user))
}

export async function getUser(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync('user_data')
  return raw ? JSON.parse(raw) : null
}

export async function clearUser() {
  await SecureStore.deleteItemAsync('user_data')
}

// ─── Sesión del portal de entrenador ───────────────────────────────────────────
// Claves propias del coach, separadas de las del atleta para que ambas sesiones
// no se pisen. El portal del coach todavía no consume los tokens (la home usa
// datos de ejemplo), pero los persistimos para cuando existan endpoints de coach.
const COACH_ACCESS_KEY = 'coach_access_token'
const COACH_REFRESH_KEY = 'coach_refresh_token'
const COACH_USER_KEY = 'coach_user_data'

export async function saveCoachSession(access: string, refresh: string, user: object) {
  await SecureStore.setItemAsync(COACH_ACCESS_KEY, access)
  await SecureStore.setItemAsync(COACH_REFRESH_KEY, refresh)
  await SecureStore.setItemAsync(COACH_USER_KEY, JSON.stringify(user))
}

export async function getCoachUser(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(COACH_USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export async function clearCoachSession() {
  await SecureStore.deleteItemAsync(COACH_ACCESS_KEY)
  await SecureStore.deleteItemAsync(COACH_REFRESH_KEY)
  await SecureStore.deleteItemAsync(COACH_USER_KEY)
}

export async function getCoachAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(COACH_ACCESS_KEY)
}

export async function getCoachRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(COACH_REFRESH_KEY)
}

export async function saveCoachTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(COACH_ACCESS_KEY, access)
  await SecureStore.setItemAsync(COACH_REFRESH_KEY, refresh)
}

// ─── Onboarding slider (first-launch value screens) ───────────────────────────

const SLIDER_SEEN_KEY = 'slider_seen'

export async function getSliderSeen(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(SLIDER_SEEN_KEY)
  return val === '1'
}

export async function setSliderSeen(): Promise<void> {
  await SecureStore.setItemAsync(SLIDER_SEEN_KEY, '1')
}
