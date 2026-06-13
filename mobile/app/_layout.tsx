import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ThemeProvider, useTheme } from '../lib/theme'
import { I18nProvider } from '../lib/i18n'
import { initSentry, withSentryWrap } from '../lib/sentry'
import AppleHealthService from '../lib/appleHealth'
import { getAccessToken } from '../lib/storage'
import { useNetworkStatus } from '../lib/useNetworkStatus'
// El task de background GPS DEBE importarse aquí (nivel de módulo del entry point)
// para que TaskManager.defineTask() quede registrado antes de cualquier render,
// incluso si el usuario nunca abre la pantalla de Run.
import '../lib/backgroundGps'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono'
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif'

// Sentry debe inicializarse antes que cualquier render para capturar
// errores tempranos. Es seguro llamar aunque la DSN esté vacía (no-op).
initSentry()

// ── Apple Health: sync al abrir la app si es un día nuevo ───────────────────
// Corre en background (fire-and-forget) para no bloquear el arranque.
// Compara la fecha del último sync almacenada en AsyncStorage con la fecha
// actual — si son distintas, sincroniza una vez y actualiza el registro.
async function maybeBackgroundSyncAppleHealth() {
  if (Platform.OS !== 'ios') return
  try {
    const token = await getAccessToken()
    if (!token) return                              // usuario no logueado
    const available = await AppleHealthService.isAvailable()
    if (!available) return
    // Leer última fecha de sync del backend para no sincronizar varias veces
    const { apiGet } = await import('../lib/api')
    const state = await apiGet('/api/integrations/apple-health/status/')
    if (state.status !== 'connected') return
    const lastSync = state.last_synced_at ? new Date(state.last_synced_at) : null
    const today    = new Date().toDateString()
    if (lastSync && lastSync.toDateString() === today) return  // ya sincronizó hoy
    await AppleHealthService.syncData()
  } catch {
    // Falla en silencio — el sync es best-effort y no debe crashear el arranque
  }
}

SplashScreen.preventAutoHideAsync()

function ThemedApp() {
  const { isDark } = useTheme()
  const { isOffline } = useNetworkStatus()
  const insets = useSafeAreaInsets()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
      {isOffline && (
        <View style={[styles.offlineBanner, { top: insets.top }]}>
          <Text style={styles.offlineText}>Sin conexión · los datos pueden estar desactualizados</Text>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,68,68,0.92)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  offlineText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.4,
  },
})

function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Sync Apple Health en background al arrancar — no bloquea UI
    maybeBackgroundSyncAppleHealth()
  }, [])

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
          'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
          'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
          'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
          'JetBrainsMono-Regular': JetBrainsMono_400Regular,
          'JetBrainsMono-Medium': JetBrainsMono_500Medium,
          'InstrumentSerif-Italic': InstrumentSerif_400Regular_Italic,
        })
      } catch {
        // fonts failed — app still runs with system fonts
      } finally {
        setReady(true)
        await SplashScreen.hideAsync()
      }
    }
    prepare()
  }, [])

  // GestureHandlerRootView debe envolver TODO el árbol (requisito de
  // react-native-gesture-handler / react-navigation) para que swipe-back,
  // transiciones y gestos funcionen de forma fiable en builds de producción.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!ready ? (
        <View style={{ flex: 1, backgroundColor: '#000' }} />
      ) : (
        <I18nProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <ThemedApp />
            </SafeAreaProvider>
          </ThemeProvider>
        </I18nProvider>
      )}
    </GestureHandlerRootView>
  )
}

// Envolver con Sentry permite que un ErrorBoundary global capture los crashes
// del árbol y los envíe a Sentry. Es no-op si Sentry no fue inicializado.
export default withSentryWrap(RootLayout)
