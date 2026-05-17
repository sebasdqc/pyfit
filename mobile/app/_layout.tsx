import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from '../lib/theme'
import { initSentry, withSentryWrap } from '../lib/sentry'
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

SplashScreen.preventAutoHideAsync()

function ThemedApp() {
  const { isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  )
}

function RootLayout() {
  const [ready, setReady] = useState(false)

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

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ThemedApp />
      </SafeAreaProvider>
    </ThemeProvider>
  )
}

// Envolver con Sentry permite que un ErrorBoundary global capture los crashes
// del árbol y los envíe a Sentry. Es no-op si Sentry no fue inicializado.
export default withSentryWrap(RootLayout)
