import { Tabs } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../../lib/colors'
import { useTheme } from '../../lib/theme'
import { useTranslation } from '../../lib/i18n'
import Svg, { Path, Circle } from 'react-native-svg'

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

function IconProfile({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

// Map route names → translation keys for tab labels
const ROUTE_LABEL_KEY: Record<string, string> = {
  'dashboard/index':    'nav_home',
  'estadisticas/index': 'nav_stats',
  'checkin/index':      'nav_train',
  'historial/index':    'nav_history',
  'perfil/index':       'nav_profile',
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { colors, isDark, palette } = useTheme()
  const { t } = useTranslation()

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
        backgroundColor: palette === 'light' ? 'rgba(245,242,236,0.97)' : palette === 'rosado' ? 'rgba(13,0,9,0.97)' : 'rgba(13,13,13,0.97)',
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
          if (!focused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true })
          }
        }

        if (isCenter) {
          // En light mode el bg es casi blanco, así que un botón blanco se pierde.
          // Invertimos: bg oscuro con texto claro en light; bg claro con texto
          // oscuro en dark/rosado para mantener máxima visibilidad.
          const centerBg   = palette === 'light' ? colors.inkPrimary : COLORS.white
          const centerText = palette === 'light' ? colors.bg          : '#000'
          return (
            <View key={route.key} style={styles.tabItem}>
              <TouchableOpacity
                onPress={onPress}
                style={[styles.centerBtn, { backgroundColor: centerBg }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.centerBtnText, { color: centerText }]}>{t('nav_train')}</Text>
              </TouchableOpacity>
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
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
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
      <Tabs.Screen
        name="historial/index"
        options={{
          tabBarLabel: 'Historial',
          tabBarIcon: ({ color }) => <IconHistory color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil/index"
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
      {/* Perfil sub-screens */}
      <Tabs.Screen name="perfil/datos-personales" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/entrenamiento" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/objetivos" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/ubicaciones" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/lesiones" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/ciclo" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/preferencias" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/ciencia" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/bibliografia" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/glosario" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/referidos" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/suscripcion" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/historial-pagos" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/cancelar" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/dispositivos" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/buscar-dispositivo" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="perfil/cambiar-plan" options={{ href: null, tabBarLabel: '' }} />
      {/* Free Run */}
      <Tabs.Screen name="run/index" options={{ href: null, tabBarLabel: '' }} />
      <Tabs.Screen name="run/resumen/[id]" options={{ href: null, tabBarLabel: '' }} />
      {/* Admin (modo staff) */}
      <Tabs.Screen name="admin/index" options={{ href: null, tabBarLabel: '' }} />
      </Tabs>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Botón central ENTRENAR
  centerBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    // Sube el botón para que sobresalga sobre el borde superior
    marginTop: Platform.OS === 'ios' ? -14 : -10,
    // Sombra para destacar el botón
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  centerBtnText: {
    color: '#000',
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 0.5,
  },
})
