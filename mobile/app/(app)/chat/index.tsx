import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../lib/theme'

// ─── Chat (placeholder) ───────────────────────────────────────────────────────
// Ocupa el lugar donde estaba el tab "Historial" en la barra inferior. Es un
// marcador de posición SIN función: no tiene estado, ni llamadas al backend, ni
// navegación interna. Solo muestra "Próximamente".

export default function ChatScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={[styles.iconWrap, { borderColor: colors.borderBright, backgroundColor: colors.cardBg }]}>
          <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4V5.5z"
              stroke={colors.accent}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Text style={[styles.title, { color: colors.inkPrimary }]}>Chat</Text>
        <Text style={[styles.subtitle, { color: colors.inkMuted }]}>PRÓXIMAMENTE</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 2.5,
  },
})
