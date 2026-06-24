import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Animated,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle, Polygon } from 'react-native-svg'
import { useTheme } from '../../../lib/theme'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Recomendaciones placeholder ─────────────────────────────────────────────

const RECOMENDACIONES = [
  {
    id: '1',
    categoria: 'RECUPERACIÓN',
    color: '#32c896',
    titulo: 'Hoy es día de movilidad',
    cuerpo: 'Tus últimas 4 sesiones tuvieron RPE promedio de 8.1. Tu sistema nervioso necesita un respiro. Una sesión suave hoy mejorará tu rendimiento el próximo entreno.',
    icono: '🧘',
  },
  {
    id: '2',
    categoria: 'PROGRESIÓN',
    color: '#4f8cff',
    titulo: 'Estás cerca del nivel Élite',
    cuerpo: 'A 15 sesiones de alcanzar Élite. Con tu cadencia actual de 3 por semana, lo conseguirás en aproximadamente 5 semanas. No frenes ahora.',
    icono: '⚡',
  },
  {
    id: '3',
    categoria: 'PATRÓN',
    color: '#ffaa32',
    titulo: 'Tu ventana de mayor rendimiento',
    cuerpo: 'Los datos muestran un 23% más de cumplimiento los martes y jueves por la mañana. Considera bloquear esos horarios como tus entrenamientos fijos.',
    icono: '📈',
  },
  {
    id: '4',
    categoria: 'ALERTA',
    color: '#ff6b6b',
    titulo: 'Señales de fatiga acumulada',
    cuerpo: 'Tu HRV promedio cayó a 52ms esta semana. Duerme mínimo 8h los próximos 3 días y baja la intensidad. No es rendirse, es entrenar con inteligencia.',
    icono: '🛡️',
  },
  {
    id: '5',
    categoria: 'OBJETIVO',
    color: '#c084fc',
    titulo: 'Construye tu base aeróbica',
    cuerpo: 'Tu perfil prioriza resistencia pero tus check-ins recientes apuntan a fuerza. Añade una sesión de cardio continuo de 30–40 min esta semana para equilibrar.',
    icono: '🎯',
  },
]

// ─── Icono de Coach ───────────────────────────────────────────────────────────

function CoachIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={7} r={3.5} stroke={color} strokeWidth={1.7} />
      <Path
        d="M5 21c0-3.87 3.13-7 7-7s7 3.13 7 7"
        stroke={color} strokeWidth={1.7} strokeLinecap="round"
      />
      <Path
        d="M19.5 3l-1.8 2.4h1.3l-1.8 2.4"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Card de recomendación ────────────────────────────────────────────────────

function RecCard({
  rec, anim, colors,
}: {
  rec: typeof RECOMENDACIONES[0]
  anim: Animated.Value
  colors: any
}) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] })

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          borderColor: rec.color + '28',
          backgroundColor: colors.cardBg,
          opacity: anim,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Barra superior de color */}
      <View style={[styles.cardTopBar, { backgroundColor: rec.color }]} />

      {/* Gradiente de fondo sutil */}
      <LinearGradient
        colors={[rec.color + '18', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.cardContent}>
        {/* Fila superior: categoría chip + emoji */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.categChip, { borderColor: rec.color + '50', backgroundColor: rec.color + '18' }]}>
            <Text style={[styles.categTxt, { color: rec.color }]}>{rec.categoria}</Text>
          </View>
          <Text style={styles.cardEmoji}>{rec.icono}</Text>
        </View>

        {/* Título */}
        <Text style={[styles.cardTitle, { color: colors.inkPrimary }]}>{rec.titulo}</Text>

        {/* Línea divisor */}
        <View style={[styles.cardDivider, { backgroundColor: rec.color + '30' }]} />

        {/* Cuerpo */}
        <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>{rec.cuerpo}</Text>

        {/* Pie: indicador de tipo */}
        <View style={styles.cardFooter}>
          <View style={[styles.cardFooterDot, { backgroundColor: rec.color }]} />
          <Text style={[styles.cardFooterTxt, { color: rec.color }]}>
            Basado en tu historial
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function CoachScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [activeIdx, setActiveIdx] = useState(0)

  // Animaciones de entrada
  const headerAnim = useRef(new Animated.Value(0)).current
  const cardAnims = useRef(RECOMENDACIONES.map(() => new Animated.Value(0))).current

  useEffect(() => {
    // Header primero, luego cards en cascada
    Animated.timing(headerAnim, { toValue: 1, duration: 520, useNativeDriver: true }).start(() => {
      Animated.stagger(
        90,
        cardAnims.map(a =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 })
        )
      ).start()
    })
  }, [])

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
    setActiveIdx(Math.max(0, Math.min(idx, RECOMENDACIONES.length - 1)))
  }

  const headerOpacity = headerAnim
  const headerSlide = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] })

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HEADER ── */}
        <Animated.View style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
        ]}>
          <View style={styles.headerTop}>
            <View style={[styles.iconWrap, { borderColor: colors.accent + '40', backgroundColor: colors.accent + '14' }]}>
              <CoachIcon color={colors.accent} size={28} />
            </View>
            <View style={[styles.aiChip, { borderColor: colors.cyan + '40', backgroundColor: colors.cyan + '10' }]}>
              <Text style={[styles.aiChipTxt, { color: colors.cyan }]}>IA · COACH PERSONAL</Text>
            </View>
          </View>

          <Text style={[styles.headline, { color: colors.inkPrimary }]}>
            El coach que{'\n'}
            <Text style={[styles.headlineAccent, { color: colors.accent }]}>te conoce,</Text>
            {' '}sabe lo que necesitas y hacia donde vas.
          </Text>
        </Animated.View>

        {/* ── RECOMENDACIONES — Slider ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>RECOMENDACIONES</Text>
            <View style={[styles.countBadge, { borderColor: colors.borderBright, backgroundColor: colors.cardBg }]}>
              <Text style={[styles.countTxt, { color: colors.inkMuted }]}>{RECOMENDACIONES.length}</Text>
            </View>
          </View>

          {/* Slider horizontal con paginado */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={styles.slider}
          >
            {RECOMENDACIONES.map((rec, idx) => (
              <View key={rec.id} style={styles.cardPage}>
                <RecCard rec={rec} anim={cardAnims[idx]} colors={colors} />
              </View>
            ))}
          </ScrollView>

          {/* Dots paginador */}
          <View style={styles.dotsRow}>
            {RECOMENDACIONES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIdx
                    ? { width: 22, backgroundColor: colors.accent }
                    : { width: 6, backgroundColor: colors.inkFaint },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── PRÓXIMAMENTE ── */}
        <Animated.View style={[
          styles.comingSoon,
          {
            borderColor: colors.borderDefault,
            backgroundColor: colors.cardBg,
            opacity: headerAnim,
          },
        ]}>
          <Text style={[styles.comingSoonTitle, { color: colors.inkSecondary }]}>
            Chat con tu Coach IA
          </Text>
          <Text style={[styles.comingSoonSub, { color: colors.inkMuted }]}>PRÓXIMAMENTE</Text>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { marginBottom: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  aiChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  aiChipTxt: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.8,
  },
  headline: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 26,
    letterSpacing: -0.8, lineHeight: 34,
  },
  headlineAccent: {
    fontFamily: 'SpaceGrotesk-Bold',
  },

  // Sección
  sectionWrap: { marginBottom: 28 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  countBadge: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  countTxt: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9 },

  // Slider
  slider: { marginHorizontal: -20 },
  cardPage: {
    width: SCREEN_W,
    paddingHorizontal: 20,
  },

  // Card
  cardOuter: {
    borderRadius: 24, borderWidth: 1, overflow: 'hidden',
    minHeight: 200,
  },
  cardTopBar: { height: 3 },
  cardContent: { padding: 22, paddingTop: 18, gap: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  categTxt: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 8,
    letterSpacing: 1.8, textTransform: 'uppercase',
  },
  cardEmoji: { fontSize: 32 },
  cardTitle: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
    letterSpacing: -0.6, lineHeight: 28,
  },
  cardDivider: { height: 1 },
  cardBody: {
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    lineHeight: 22, letterSpacing: -0.1,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  cardFooterDot: { width: 5, height: 5, borderRadius: 3 },
  cardFooterTxt: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 8, letterSpacing: 0.8,
  },

  // Dots paginador
  dotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginTop: 16,
  },
  dot: {
    height: 6, borderRadius: 3,
    // width se inyecta dinámicamente (6 o 22)
  },

  // Coming soon
  comingSoon: {
    borderRadius: 20, borderWidth: 1,
    paddingVertical: 28, paddingHorizontal: 24,
    alignItems: 'center', gap: 8,
  },
  comingSoonTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, letterSpacing: -0.4,
  },
  comingSoonSub: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 2.5,
  },
})
