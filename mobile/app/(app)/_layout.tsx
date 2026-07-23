import { useEffect, useRef, useState } from 'react'
import { Tabs, router } from 'expo-router'
import { StackActions } from '@react-navigation/native'
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { useTheme } from '../../lib/theme'
import { useTranslation } from '../../lib/i18n'
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg'
import { registerForPushNotifications } from '../../lib/pushNotifications'

// Adónde navegar al tocar cada tipo de push (ver `data.tipo` en users.push/
// send_reminders — 'checkin_reminder', 'streak_risk', 'racha', 'logro').
// 'checkin_reminder' lleva directo al check-in; el resto (racha/logro/riesgo
// de racha) se resuelve en el dashboard, que ya muestra ambos.
function routeForNotification(data: Record<string, any> | undefined): string {
  if (data?.tipo === 'checkin_reminder') return '/(app)/checkin'
  return '/(app)/dashboard'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconHome({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 21V12h6v9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function IconStats({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function IconHistory({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8v4l3 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M3.05 11a9 9 0 1 0 .5-3M3 5v6h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconChat({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4V5.5z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

function IconProfile({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

// Play triángulo relleno (histórico — reemplazado en el botón ENTRENAR por
// TrainButtonIcon, que alterna PESA/RUNNING). Se deja por si otra pantalla
// necesita un ícono de play a futuro.
function IconPlay({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 2 }}>
      <Path
        d="M8 5.2v13.6a1 1 0 0 0 1.54.84l10.5-6.8a1 1 0 0 0 0-1.68L9.54 4.36A1 1 0 0 0 8 5.2z"
        fill={color}
      />
    </Svg>
  )
}

// Mancuerna (fuerza) para el botón central ENTRENAR
function IconWeight({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={1.5} y={9} width={2.5} height={6} rx={1} fill={color} />
      <Rect x={4.5} y={7} width={2.5} height={10} rx={1} fill={color} />
      <Rect x={17} y={7} width={2.5} height={10} rx={1} fill={color} />
      <Rect x={20} y={9} width={2.5} height={6} rx={1} fill={color} />
      <Rect x={7} y={11} width={10} height={2} rx={1} fill={color} />
    </Svg>
  )
}

// Corredor (running) para el botón central ENTRENAR
function IconRunning({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={15} cy={5} r={2} fill={color} />
      <Path
        d="M15 8L11 13L7 12M11 13L15 17L13 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 9L17 7M13 9L10 11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Ícono animado del botón ENTRENAR: alterna PESA ⇄ RUNNING cada 5s con una
// transición estilo glitch (parpadeo + jitter + fantasmas cian/magenta, tipo
// interferencia VHS) en vez de un simple fade — el swap real de ícono ocurre
// a mitad del glitch, cuando el ruido tapa el cambio.
function TrainButtonIcon({ size = 26 }: { size?: number }) {
  const [mode, setMode] = useState<'weight' | 'running'>('weight')
  const glitch = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const runGlitch = () => {
      glitch.setValue(0)
      Animated.sequence([
        Animated.timing(glitch, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: 0.15, duration: 60, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: 0.85, duration: 60, useNativeDriver: true }),
        Animated.timing(glitch, { toValue: 0, duration: 130, useNativeDriver: true }),
      ]).start()
      setTimeout(() => {
        setMode(m => (m === 'weight' ? 'running' : 'weight'))
      }, 90)
    }
    const id = setInterval(runGlitch, 5000)
    return () => clearInterval(id)
  }, [])

  const jitterR = glitch.interpolate({ inputRange: [0, 1], outputRange: [0, 3] })
  const jitterL = glitch.interpolate({ inputRange: [0, 1], outputRange: [0, -3] })
  const ghostOpacity = glitch.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] })
  const mainOpacity = glitch.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] })

  const Icon = mode === 'weight' ? IconWeight : IconRunning

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', opacity: ghostOpacity, transform: [{ translateX: jitterL }] }}>
        <Icon color="#5ef1ff" size={size} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: ghostOpacity, transform: [{ translateX: jitterR }] }}>
        <Icon color="#ff4fd8" size={size} />
      </Animated.View>
      <Animated.View style={{ opacity: mainOpacity, transform: [{ translateX: jitterR }] }}>
        <Icon color="#ffffff" size={size} />
      </Animated.View>
    </View>
  )
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

// Map route names → translation keys for tab labels
const ROUTE_LABEL_KEY: Record<string, string> = {
  'dashboard/index':    'nav_home',
  'estadisticas/index': 'nav_stats',
  'checkin/index':      'nav_train',
  'historial/index':    'nav_history',
  'perfil':             'nav_profile',
}

// Rutas donde NO se muestra la barra inferior: durante el entrenamiento y su
// feedback, para evitar fugas a otras pantallas a mitad de la sesión.
const HIDDEN_TABBAR_ROUTES = ['ejecutar/[id]', 'feedback/[id]', 'generate/index', 'run/index', 'run/resumen/[id]', 'run/feedback/[id]', 'running/index']

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { colors, palette } = useTheme()
  const { t } = useTranslation()

  // Tras los hooks (reglas de hooks): ocultar la barra en el flujo de entrenamiento.
  const activeRouteName = state.routes[state.index]?.name
  if (HIDDEN_TABBAR_ROUTES.includes(activeRouteName)) return null

  const bottomPad = insets.bottom > 0 ? insets.bottom + 4 : 12

  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key]
    return options.tabBarLabel !== ''
  })

  return (
    <View style={[
      styles.tabBar,
      {
        width,
        paddingBottom: bottomPad,
        backgroundColor: palette === 'light' ? 'rgba(245,242,236,0.97)' : palette === 'rosado' ? 'rgba(253,242,248,0.97)' : palette === 'midnight' ? 'rgba(8,14,26,0.97)' : palette === 'sand' ? 'rgba(22,18,13,0.97)' : palette === 'forest' ? 'rgba(8,15,10,0.97)' : palette === 'neon' ? 'rgba(5,5,10,0.97)' : 'rgba(13,13,13,0.97)',
        borderTopColor: colors.borderDefault,
      },
    ]}>
      {visibleRoutes.map((route: any) => {
        const index = state.routes.indexOf(route)
        const { options } = descriptors[route.key]
        const focused = state.index === index
        const isCenter = route.name === 'checkin/index'

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (event.defaultPrevented) return
          if (focused) {
            // Re-tap en el tab activo → volver a la raíz de su stack anidado
            // (p. ej. Perfil deep → perfil/index). No-op en tabs hoja.
            const nested = route.state
            if (nested && typeof nested.index === 'number' && nested.index > 0 && nested.key) {
              navigation.dispatch({ ...StackActions.popToTop(), target: nested.key })
            }
            return
          }
          navigation.navigate({ name: route.name, merge: true })
        }

        if (isCenter) {
          // Botón ENTRENAR: círculo flotante con icono PLAY, elevado sobre el
          // borde superior y rodeado de un halo brillante (radial gradient del
          // color de acento) que lo hace destacar en todas las paletas.
          return (
            <View key={route.key} style={styles.tabItem} pointerEvents="box-none">
              <View style={styles.centerWrap}>
                {/* Halo brillante detrás del botón */}
                <Svg
                  width={CENTER_GLOW}
                  height={CENTER_GLOW}
                  style={styles.centerGlow}
                  pointerEvents="none"
                >
                  <Defs>
                    <RadialGradient id="trainGlow" cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.46} />
                      <Stop offset="50%" stopColor={colors.accent} stopOpacity={0.17} />
                      <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={CENTER_GLOW / 2} cy={CENTER_GLOW / 2} r={CENTER_GLOW / 2} fill="url(#trainGlow)" />
                </Svg>
                <TouchableOpacity
                  onPress={onPress}
                  style={[styles.centerBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                  activeOpacity={0.85}
                  accessibilityLabel={t('nav_train')}
                >
                  <TrainButtonIcon size={26} />
                </TouchableOpacity>
              </View>
            </View>
          )
        }

        const icon = options.tabBarIcon?.({
          focused,
          color: focused ? colors.accent : colors.inkMuted,
          size: 22,
        })
        const labelKey = ROUTE_LABEL_KEY[route.name]
        const label = labelKey ? t(labelKey as any) : (options.tabBarLabel as string)

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>{icon}</View>
            <Text style={[styles.tabLabel, { color: focused ? colors.accent : colors.inkMuted }]}>
              {label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout() {
  useEffect(() => {
    // Fire-and-forget: request permission + send token to backend on first load
    registerForPushNotifications()
  }, [])

  // Tocar una notificación (app en background o cerrada) ahora navega a la
  // pantalla relevante en vez de solo abrir la app en donde haya quedado.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any> | undefined
      router.push(routeForNotification(data) as any)
    })
    return () => sub.remove()
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
        // backBehavior="history": al hacer "Atrás" desde la raíz de un tab,
        // regresa al tab visitado justo antes (no siempre a Inicio). El back
        // DENTRO de Perfil lo maneja su Stack anidado (pop real de la pila).
        backBehavior="history"
      >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color }) => <IconHome color={color} />,
        }}
      />
      <Tabs.Screen
        name="estadisticas/index"
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color }) => <IconStats color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin/index"
        options={{ tabBarLabel: 'ENTRENAR' }}
      />
      {/* Chat: placeholder sin función, ocupa el lugar que tenía Historial. */}
      <Tabs.Screen
        name="chat/index"
        options={{
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color }) => <IconChat color={color} />,
        }}
      />
      {/* Historial dejó de ser un tab propio: ahora vive dentro de "Stats" como
          un chip. La ruta se mantiene oculta (href: null) para que los deep-links
          del dashboard ("ver sesión" / calendario semanal) sigan funcionando. */}
      <Tabs.Screen
        name="historial/index"
        options={{ href: null, tabBarLabel: '' }}
      />
      {/* Perfil es un Stack anidado (app/(app)/perfil/_layout.tsx). El Tabs lo
          ve como UNA sola ruta "perfil"; sus sub-pantallas (datos-personales,
          mi-cuenta, dispositivos, etc.) viven dentro del Stack, donde el botón
          Atrás hace pop real. */}
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <IconProfile color={color} />,
        }}
      />
      {/* Screens fuera del tab bar */}
      <Tabs.Screen name="notificaciones/index" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="generate/index" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="ejecutar/[id]" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="feedback/[id]" options={{ href: null, tabBarLabel: '' }} />
      {/* Free Run */}
      <Tabs.Screen name="run/index" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="run/resumen/[id]" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="run/feedback/[id]" options={{ href: null, tabBarLabel: '' }} />
      {/* Running inteligente (sesión generada) — fuera del tab bar */}
      <Tabs.Screen name="running/index" options={{ href: null, tabBarLabel: '' }} />
      {/* Admin (modo staff) */}
      <Tabs.Screen name="admin/index" options={{ href: null, tabBarLabel: '' }} />
      </Tabs>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CENTER_BTN = 58    // diámetro del botón flotante ENTRENAR
const CENTER_GLOW = 98   // diámetro del halo brillante detrás del botón

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',       // distribuye los 5 tabs uniformemente
    width: '100%',                         // ocupa todo el ancho
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    // paddingBottom se inyecta dinámico desde useSafeAreaInsets
    // backgroundColor and borderTopColor injected dynamically
  },

  // Cada tab ocupa el mismo espacio proporcional
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 0,                           // evita overflow en pantallas muy pequeñas
  },

  iconWrapper: {
    marginBottom: 4,
  },

  tabLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Botón central ENTRENAR — contenedor que sube el botón sobre el borde
  centerWrap: {
    width: CENTER_BTN,
    height: CENTER_BTN,
    alignItems: 'center',
    justifyContent: 'center',
    // Eleva el botón para que flote sobre el borde superior de la barra
    marginTop: Platform.OS === 'ios' ? -26 : -22,
  },

  // Halo brillante centrado detrás del botón (más grande que el botón)
  centerGlow: {
    position: 'absolute',
    top: (CENTER_BTN - CENTER_GLOW) / 2,
    left: (CENTER_BTN - CENTER_GLOW) / 2,
  },

  // Botón circular flotante con icono PLAY
  centerBtn: {
    width: CENTER_BTN,
    height: CENTER_BTN,
    borderRadius: CENTER_BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    // Glow/sombra que irradia en todas direcciones (shadowColor = acento, inline)
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.68,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
})
