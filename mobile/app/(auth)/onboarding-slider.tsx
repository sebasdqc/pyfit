import React, { useRef, useState, useEffect } from 'react'
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../lib/theme'
import { setSliderSeen } from '../../lib/storage'
import EvidenciaCard from '../../components/EvidenciaCard'

// ─── Navigation helpers ───────────────────────────────────────────────────────

async function goToLogin(params?: { initialTab: string }) {
  await setSliderSeen()
  if (params) {
    router.replace({ pathname: '/(auth)/login' as any, params })
  } else {
    router.replace('/(auth)/login')
  }
}

// ─── Volume bar strip (Screen 1 visual) ──────────────────────────────────────

const BARS_HIGH: number[] = [28, 40, 34, 44, 30, 38, 42, 32]
const BARS_LOW:  number[] = [14, 20, 16, 22, 14, 18, 20, 14]

function VolumeBars({ high, color }: { high: boolean; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 50 }}>
      {(high ? BARS_HIGH : BARS_LOW).map((h, i) => (
        <View
          key={i}
          style={{
            width: 9,
            height: h,
            borderRadius: 5,
            backgroundColor: high ? color : color + '70',
          }}
        />
      ))}
    </View>
  )
}

// ─── Demo Workout Card (Screen 1) ─────────────────────────────────────────────
// Mirrors the visual tokens of CTACard in dashboard/index.tsx

const STATE_A = {
  tagBg:     'rgba(79,140,255,0.15)',
  tagBorder: 'rgba(79,140,255,0.35)',
  tagColor:  '#4f8cff',
  tagIcon:   '⚡',
  tagLabel:  'PLAN DE HOY',
  title:     'Fuerza · Tren inferior',
  meta:      '45 min · Carga 100%',
  high:      true,
  cardBorder:'rgba(79,140,255,0.35)',
  gradientColors: ['rgba(79,140,255,0.13)', 'transparent'] as [string, string],
}

const STATE_B = {
  tagBg:     'rgba(255,170,50,0.15)',
  tagBorder: 'rgba(255,170,50,0.35)',
  tagColor:  '#ffaa32',
  tagIcon:   '🌙',
  tagLabel:  'PLAN AJUSTADO',
  title:     'Movilidad + Fuerza ligera',
  meta:      '25 min · Carga 60%',
  high:      false,
  cardBorder:'rgba(255,170,50,0.35)',
  gradientColors: ['transparent', 'transparent'] as [string, string],
}

function DemoWorkoutCard() {
  const { colors, isDark } = useTheme()
  const [stateIdx, setStateIdx] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
        setStateIdx(i => (i + 1) % 2)
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start()
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const s = stateIdx === 0 ? STATE_A : STATE_B

  return (
    <View style={{
      backgroundColor: isDark ? '#0E1C42' : colors.cardBg,
      borderWidth: 1,
      borderColor: s.cardBorder,
      borderRadius: 22,
      padding: 20,
      overflow: 'hidden',
    }}>
      <LinearGradient
        colors={s.gradientColors}
        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
        pointerEvents="none"
      />
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Pill tag */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: s.tagBg,
          borderWidth: 1, borderColor: s.tagBorder,
          borderRadius: 100, paddingVertical: 5, paddingHorizontal: 12,
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 11 }}>{s.tagIcon}</Text>
          <Text style={{
            fontFamily: 'JetBrainsMono-Regular',
            fontSize: 9,
            color: s.tagColor,
            letterSpacing: 1.5,
          }}>
            {s.tagLabel}
          </Text>
        </View>

        <Text style={{
          fontFamily: 'SpaceGrotesk-Bold',
          fontSize: 20,
          color: colors.inkPrimary,
          letterSpacing: -0.5,
          lineHeight: 24,
          marginBottom: 6,
        }}>
          {s.title}
        </Text>

        <Text style={{
          fontFamily: 'SpaceGrotesk-Regular',
          fontSize: 12.5,
          color: colors.inkSecondary,
          lineHeight: 17,
          marginBottom: 18,
        }}>
          {s.meta}
        </Text>

        <VolumeBars high={s.high} color={stateIdx === 0 ? colors.accent : colors.orange} />
      </Animated.View>
    </View>
  )
}

// ─── Memory Cards (Screen 2) ──────────────────────────────────────────────────

function MemoryCards() {
  const { colors } = useTheme()

  const rowCard = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 16,
    padding: 16,
  }

  const labelStyle = {
    fontFamily: 'JetBrainsMono-Regular' as const,
    fontSize: 9,
    color: colors.inkMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  }

  const iconCircle = (bg: string) => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  })

  return (
    <View>
      {/* Card superior — sesión antigua, opacidad reducida */}
      <View style={[rowCard, { opacity: 0.55 }]}>
        <View style={iconCircle(colors.glassBg)}>
          <Text style={{ fontSize: 16 }}>🗓️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Hace 6 semanas</Text>
          <Text style={{
            fontFamily: 'SpaceGrotesk-Medium',
            fontSize: 14,
            color: colors.inkMuted,
            lineHeight: 19,
          }}>
            Sentadilla · RPE 8.2
          </Text>
        </View>
      </View>

      {/* Flecha de progreso */}
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Text style={{
          fontFamily: 'SpaceGrotesk-Bold',
          fontSize: 18,
          color: colors.accent,
          lineHeight: 22,
        }}>
          ↓
        </Text>
      </View>

      {/* Card inferior — sesión actual, opacidad completa + badge */}
      <View style={{ position: 'relative' }}>
        <View style={rowCard}>
          <View style={iconCircle(colors.accent + '20')}>
            <Text style={{ fontSize: 16 }}>📈</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[labelStyle, { color: colors.accent }]}>Hoy</Text>
            <Text style={{
              fontFamily: 'SpaceGrotesk-SemiBold',
              fontSize: 14,
              color: colors.inkPrimary,
              lineHeight: 19,
            }}>
              Sentadilla · RPE 5.8
            </Text>
          </View>
        </View>

        {/* Badge flotante — "30% más fácil" */}
        <View style={{
          position: 'absolute',
          top: -10,
          right: 12,
          backgroundColor: colors.accent,
          borderRadius: 100,
          paddingVertical: 4,
          paddingHorizontal: 10,
        }}>
          <Text style={{
            fontFamily: 'JetBrainsMono-Medium',
            fontSize: 9,
            color: '#fff',
            letterSpacing: 0.5,
          }}>
            30% más fácil
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Dot page indicator ───────────────────────────────────────────────────────

function PageDots({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === current ? colors.accent : colors.borderDefault,
          }}
        />
      ))}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingSliderScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // One fade+slide anim per text zone
  const op0 = useRef(new Animated.Value(0)).current
  const y0  = useRef(new Animated.Value(20)).current
  const op1 = useRef(new Animated.Value(0)).current
  const y1  = useRef(new Animated.Value(20)).current
  const op2 = useRef(new Animated.Value(0)).current
  const y2  = useRef(new Animated.Value(20)).current
  const textAnims = [
    { op: op0, y: y0 },
    { op: op1, y: y1 },
    { op: op2, y: y2 },
  ]

  // Animate page 0 text on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op0, { toValue: 1, duration: 600, delay: 280, useNativeDriver: true }),
      Animated.timing(y0,  { toValue: 0, duration: 500, delay: 280, useNativeDriver: true }),
    ]).start()
  }, [])

  // Animate text when arriving at pages 1 and 2
  useEffect(() => {
    if (currentPage === 0) return
    const { op, y } = textAnims[currentPage]
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 600, delay: 80, useNativeDriver: true }),
      Animated.timing(y,  { toValue: 0, duration: 500, delay: 80, useNativeDriver: true }),
    ]).start()
  }, [currentPage])

  function scrollToPage(page: number) {
    scrollRef.current?.scrollTo({ x: page * width, animated: true })
  }

  function handleScrollEnd(e: any) {
    const page = Math.round(e.nativeEvent.contentOffset.x / width)
    if (page !== currentPage) setCurrentPage(page)
  }

  const pagePaddingTop    = insets.top + 52
  const bottomZoneHeight  = 140 + insets.bottom

  const eyebrowStyle = {
    fontFamily: 'JetBrainsMono-Medium' as const,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  }

  const headlineStyle = {
    fontFamily: 'SpaceGrotesk-Bold' as const,
    fontSize: 27,
    color: colors.inkPrimary,
    letterSpacing: -0.7 as const,
    lineHeight: 34,
    marginBottom: 14,
  }

  const subtextStyle = {
    fontFamily: 'SpaceGrotesk-Regular' as const,
    fontSize: 14,
    color: colors.inkSecondary,
    lineHeight: 22,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />

      {/* Skip button */}
      <TouchableOpacity
        onPress={() => goToLogin()}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          top: insets.top + 14,
          right: 20,
          zIndex: 10,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
          backgroundColor: colors.cardBg,
          borderWidth: 1,
          borderColor: colors.borderDefault,
        }}
      >
        <Text style={{
          fontFamily: 'JetBrainsMono-Regular',
          fontSize: 11,
          color: colors.inkMuted,
          letterSpacing: 0.8,
        }}>
          Saltar
        </Text>
      </TouchableOpacity>

      {/* Horizontal pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* ── Page 1: Adaptación ── */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: pagePaddingTop, paddingBottom: bottomZoneHeight }}>
          <View style={{ marginBottom: 28 }}>
            <DemoWorkoutCard />
          </View>
          <Animated.View style={{ opacity: op0, transform: [{ translateY: y0 }] }}>
            <Text style={eyebrowStyle}>Adaptación real</Text>
            <Text style={headlineStyle}>
              Tu entrenador sabe que{' '}
              <Text style={{ color: colors.accent }}>hoy dormiste mal.</Text>
            </Text>
            <Text style={subtextStyle}>
              Zyfit ajusta tu rutina según cómo llegas cada día — no según un calendario fijo.
            </Text>
          </Animated.View>
        </View>

        {/* ── Page 2: Memoria ── */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: pagePaddingTop, paddingBottom: bottomZoneHeight }}>
          <View style={{ marginBottom: 28 }}>
            <MemoryCards />
          </View>
          <Animated.View style={{ opacity: op1, transform: [{ translateY: y1 }] }}>
            <Text style={eyebrowStyle}>Memoria real</Text>
            <Text style={headlineStyle}>
              Tu sentadilla se sintió{' '}
              <Text style={{ color: colors.accent }}>30% más fácil</Text>
              {' '}que tu primera vez.
            </Text>
            <Text style={subtextStyle}>
              Cada sesión queda en tu historia. Zyfit aprende de ti, semana a semana.
            </Text>
          </Animated.View>
        </View>

        {/* ── Page 3: Evidencia ── */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: pagePaddingTop, paddingBottom: bottomZoneHeight }}>
          <View style={{ marginBottom: 28 }}>
            <EvidenciaCard
              staticData={{
                text: 'El hip thrust activa el glúteo mayor con mayor eficiencia biomecánica que el peso muerto convencional, reduciendo la carga sobre la columna lumbar.',
                highlightWord: 'mayor eficiencia biomecánica',
                evidenciaText: 'Contreras et al. 2015 — EMG máximo en glúteo mayor con hip thrust supera al peso muerto y a la sentadilla en todos los rangos del movimiento.',
                reference: 'Contreras B et al. J Strength Cond Res. 2015',
              }}
              alwaysExpanded
            />
          </View>
          <Animated.View style={{ opacity: op2, transform: [{ translateY: y2 }] }}>
            <Text style={eyebrowStyle}>Evidencia visible</Text>
            <Text style={headlineStyle}>
              Cada rutina viene con{' '}
              <Text style={{ color: colors.accent }}>la razón detrás.</Text>
            </Text>
            <Text style={subtextStyle}>
              Ejercicios respaldados por evidencia, no por suposiciones genéricas.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Fixed bottom controls */}
      <View style={{
        paddingHorizontal: 28,
        paddingTop: 16,
        paddingBottom: insets.bottom + 24,
      }}>
        <PageDots current={currentPage} total={3} />

        <View style={{ marginTop: 20 }}>
          {currentPage < 2 ? (
            /* Siguiente button — outlined secondary style */
            <TouchableOpacity
              onPress={() => scrollToPage(currentPage + 1)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 15,
                backgroundColor: colors.glassBg,
                borderWidth: 1,
                borderColor: colors.borderBright,
                borderRadius: 14,
              }}
            >
              <Text style={{
                fontFamily: 'SpaceGrotesk-SemiBold',
                fontSize: 15,
                color: colors.inkPrimary,
              }}>
                Siguiente
              </Text>
              <Text style={{
                fontFamily: 'SpaceGrotesk-SemiBold',
                fontSize: 15,
                color: colors.accent,
              }}>
                →
              </Text>
            </TouchableOpacity>
          ) : (
            /* Page 3 CTA — same primary/secondary pattern as login.tsx */
            <View style={{ gap: 12 }}>
              {/* Crear cuenta gratis — primary gradient (same as primaryBtnWrap/primaryBtn) */}
              <TouchableOpacity
                onPress={() => goToLogin({ initialTab: 'register' })}
                activeOpacity={0.85}
                style={{
                  borderRadius: 14,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.55,
                  shadowRadius: 15,
                  elevation: 12,
                }}
              >
                <LinearGradient
                  colors={[colors.accent, colors.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{
                    fontFamily: 'SpaceGrotesk-SemiBold',
                    fontSize: 16,
                    color: '#fff',
                    letterSpacing: 0.2,
                  }}>
                    Crear cuenta gratis
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Iniciar sesión — secondary outlined (same as socialBtn pattern) */}
              <TouchableOpacity
                onPress={() => goToLogin({ initialTab: 'login' })}
                activeOpacity={0.75}
                style={{
                  paddingVertical: 15,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.borderBright,
                  borderRadius: 14,
                  backgroundColor: colors.glassBg,
                }}
              >
                <Text style={{
                  fontFamily: 'SpaceGrotesk-SemiBold',
                  fontSize: 15,
                  color: colors.inkPrimary,
                }}>
                  Iniciar sesión
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
