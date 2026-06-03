import { Tabs } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { P } from '../../lib/coachTheme'

// ─── Iconos del bottom nav ──────────────────────────────────────────────────────

function IconHome({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 21V12h6v9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function IconAnalytics({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function IconAtletas({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={10} cy={8} r={3.4} stroke={color} strokeWidth={1.8} />
      <Path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.38" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M15.5 5.2a3.4 3.4 0 0 1 0 6.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function IconAjustes({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// ─── Tab bar morado ─────────────────────────────────────────────────────────────

const TABS: Record<string, { label: string; icon: (c: string) => React.ReactNode }> = {
  inicio:    { label: 'Inicio',    icon: (c) => <IconHome color={c} /> },
  analytics: { label: 'Analytics', icon: (c) => <IconAnalytics color={c} /> },
  atletas:   { label: 'Atletas',   icon: (c) => <IconAtletas color={c} /> },
  ajustes:   { label: 'Ajustes',   icon: (c) => <IconAjustes color={c} /> },
}

function CoachTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets()
  const bottomPad = insets.bottom > 0 ? insets.bottom + 4 : 12

  const visibleRoutes = state.routes.filter((r: any) => TABS[r.name])
  const activeRouteName = state.routes[state.index]?.name

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPad }]}>
      {visibleRoutes.map((route: any) => {
        // El detalle de atleta (atleta/[id]) vive fuera del tab bar pero se llega
        // desde Atletas → mantenemos ese tab resaltado mientras se navega.
        const focused =
          activeRouteName === route.name ||
          (route.name === 'atletas' && activeRouteName === 'atleta/[id]')
        const meta = TABS[route.name]
        const color = focused ? P.purpleMid : P.purpleFaint

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true })
          }
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
            <View style={styles.iconWrapper}>{meta.icon(color)}</View>
            <Text style={[styles.tabLabel, { color }]}>{meta.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function CoachLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <Tabs
        tabBar={(props) => <CoachTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: P.bg } }}
        backBehavior="history"
      >
        <Tabs.Screen name="inicio" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="atletas" />
        <Tabs.Screen name="ajustes" />
        {/* Detalle de atleta — fuera del tab bar */}
        <Tabs.Screen name="atleta/[id]" options={{ href: null }} />
      </Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    backgroundColor: P.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.divider,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 0,
  },
  iconWrapper: { marginBottom: 4 },
  tabLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
})
