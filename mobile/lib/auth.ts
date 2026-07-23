import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { apiPost } from './api'
import { saveTokens, saveUser, clearTokens, clearUser, getUser, getRefreshToken, saveCoachSession, clearCoachSession } from './storage'

export async function login(email: string, password: string) {
  const data = await apiPost('/api/auth/login/', { email, password }, false)
  await saveTokens(data.access, data.refresh)
  await saveUser(data.user)
  return data.user
}

export async function register(email: string, password: string) {
  const data = await apiPost('/api/auth/register/', { email, password }, false)
  await saveTokens(data.access, data.refresh)
  await saveUser(data.user)
  return data.user
}

// ─── Verificación de email ────────────────────────────────────────────────────

export async function resendVerificationEmail() {
  return apiPost('/api/auth/resend-verification/', {})
}

export async function verifyEmail(code: string) {
  await apiPost('/api/auth/verify-email/', { code })
  const stored = await getUser()
  if (stored) await saveUser({ ...stored, email_verificado: true })
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────

export type GoogleLoginResult =
  | { status: 'ok'; user: any }      // sesión iniciada (cuenta nueva o existente)
  | { status: 'cancelled' }          // el usuario cerró la hoja de Google
  | { status: 'unavailable' }        // módulo/credenciales no configurados o sin Play Services
  | { status: 'error' }              // red / token inválido / fallo inesperado

let _googleConfigured = false

/**
 * Inicio de sesión con Google usando la SDK nativa
 * (@react-native-google-signin/google-signin). Obtiene un `idToken` firmado por
 * Google y lo canjea en el backend (`POST /api/auth/google/`) por el mismo par
 * JWT que el login normal; luego guarda tokens + usuario igual que login/register.
 *
 * El módulo nativo se carga con `require` perezoso para que, si un build no lo
 * incluye, solo falle este flujo y NO la importación de auth.ts (de la que
 * dependen login/register).
 */
export async function googleLogin(): Promise<GoogleLoginResult> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  if (!webClientId) return { status: 'unavailable' }

  let GoogleSignin: any
  let statusCodes: any
  try {
    ;({ GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin'))
  } catch {
    return { status: 'unavailable' }
  }

  try {
    if (!_googleConfigured) {
      GoogleSignin.configure({
        webClientId,                                              // firma el idToken → audiencia que valida el backend
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // opcional; iOS también usa el iosUrlScheme del plugin
        offlineAccess: false,
      })
      _googleConfigured = true
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response: any = await GoogleSignin.signIn()

    // v13+: signIn() devuelve { type: 'cancelled' } | { type: 'success', data: { idToken, ... } }.
    // Toleramos también formas antiguas donde idToken viene en la raíz.
    if (response?.type === 'cancelled') return { status: 'cancelled' }
    const idToken = response?.data?.idToken ?? response?.idToken
    if (!idToken) return { status: 'error' }

    const data = await apiPost('/api/auth/google/', { id_token: idToken }, false)
    await saveTokens(data.access, data.refresh)
    await saveUser(data.user)
    return { status: 'ok', user: data.user }
  } catch (e: any) {
    const code = e?.code
    if (statusCodes && code === statusCodes.SIGN_IN_CANCELLED) return { status: 'cancelled' }
    if (statusCodes && code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { status: 'unavailable' }
    return { status: 'error' }
  }
}

// ─── Apple Sign-In ────────────────────────────────────────────────────────────

export type AppleLoginResult =
  | { status: 'ok'; user: any }      // sesión iniciada (cuenta nueva o existente)
  | { status: 'cancelled' }          // el usuario cerró la hoja de Apple
  | { status: 'unavailable' }        // no es iOS 13+, o el módulo no está disponible
  | { status: 'error' }              // red / token inválido / fallo inesperado

/**
 * Inicio de sesión con Apple usando la SDK nativa (expo-apple-authentication).
 * Solo disponible en iOS (Apple no ofrece Sign in with Apple nativo en
 * Android). Obtiene un `identityToken` firmado por Apple y lo canjea en el
 * backend (`POST /api/auth/apple/`) por el mismo par JWT que el login normal.
 *
 * `fullName` solo llega la PRIMERA vez que el usuario autoriza la app — se
 * envía al backend para poblar el nombre del perfil en ese momento; en logins
 * posteriores Apple lo devuelve `null` y el backend ya tiene el Profile creado.
 */
export async function appleLogin(): Promise<AppleLoginResult> {
  if (Platform.OS !== 'ios') return { status: 'unavailable' }

  let AppleAuthentication: any
  try {
    AppleAuthentication = require('expo-apple-authentication')
  } catch {
    return { status: 'unavailable' }
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync()
    if (!available) return { status: 'unavailable' }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    const identityToken = credential?.identityToken
    if (!identityToken) return { status: 'error' }

    const fullName = credential?.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : null

    const data = await apiPost('/api/auth/apple/', {
      identity_token: identityToken,
      full_name: fullName || undefined,
    }, false)
    await saveTokens(data.access, data.refresh)
    await saveUser(data.user)
    return { status: 'ok', user: data.user }
  } catch (e: any) {
    // ASAuthorizationError.Code.canceled === 1001
    if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === '1001') return { status: 'cancelled' }
    return { status: 'error' }
  }
}

export type CoachLoginResult =
  | { status: 'ok'; user: any }      // coach con acceso activado
  | { status: 'pending' }            // credenciales válidas pero acceso de coach no activado
  | { status: 'invalid' }            // credenciales incorrectas
  | { status: 'error' }              // red / servidor

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[auth] EXPO_PUBLIC_API_URL no definida — usando localhost')
}

/**
 * Login del portal de entrenador. Usa un fetch dedicado (no apiPost) para
 * quedar desacoplado de la sesión del atleta y del manejo global de 401 de
 * lib/api.ts (que limpiaría tokens y redirigiría al login del atleta).
 *
 * Los tokens del coach se guardan bajo claves propias (saveCoachSession), sin
 * tocar la sesión del atleta. El portal del coach aún no consume los tokens
 * (la home usa datos de ejemplo), pero los dejamos listos para futuros endpoints.
 */
export async function coachLogin(email: string, password: string): Promise<CoachLoginResult> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api/auth/coach/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return { status: 'error' }
  }
  if (res.ok) {
    const data = await res.json().catch(() => ({}))
    if (data.access && data.refresh) {
      await saveCoachSession(data.access, data.refresh, data.user || {})
    }
    return { status: 'ok', user: data.user }
  }
  if (res.status === 403) return { status: 'pending' }
  if (res.status === 401) return { status: 'invalid' }
  return { status: 'error' }
}

export async function logout() {
  const refresh = await getRefreshToken()
  if (refresh) {
    await apiPost('/api/auth/logout/', { refresh }).catch(() => {})
  }
  await clearTokens()
  await clearUser()
  // Limpiar cualquier estado de impersonación y de sesión de coach al cerrar
  // sesión, para que el próximo login (incluso si es otra cuenta, en un
  // dispositivo compartido) no arrastre datos previos de ningún rol.
  await SecureStore.deleteItemAsync('admin_impersonating').catch(() => {})
  await clearCoachSession().catch(() => {})
}

export { getUser }
