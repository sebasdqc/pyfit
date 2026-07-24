import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { Colors, readableTextOn } from '../lib/colors'
import { useTheme } from '../lib/theme'
import { useReduceMotion } from '../lib/useReduceMotion'

const CONFETTI_EMOJIS = ['🎉', '✨', '⭐️', '🔥', '💥']

/** Una partícula de confeti que estalla desde el centro en una dirección aleatoria y se desvanece. */
function ConfettiPiece({ delay }: { delay: number }) {
  const reduceMotion = useReduceMotion()
  const progress = useRef(new Animated.Value(0)).current
  const angle    = useMemo(() => Math.random() * Math.PI * 2, [])
  const distance = useMemo(() => 60 + Math.random() * 90, [])
  const emoji    = useMemo(() => CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)], [])
  const rotate   = useMemo(() => `${Math.round(Math.random() * 360)}deg`, [])

  useEffect(() => {
    // Reduce-motion (WCAG 2.3.3): sin la explosión de confeti, es puramente
    // decorativa — se queda en opacity 0 (progress en el tramo final del fade-out).
    if (reduceMotion) { progress.setValue(1); return }
    progress.setValue(0)
    Animated.timing(progress, {
      toValue: 1,
      duration: 900 + Math.random() * 400,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [reduceMotion])

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] })
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] })
  const opacity    = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] })
  const scale      = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.6] })

  return (
    <Animated.Text
      style={[
        styles.confettiPiece,
        { opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }] },
      ]}
    >
      {emoji}
    </Animated.Text>
  )
}

export default function StreakMilestoneModal({
  visible, racha, siguiente, onClose,
}: {
  visible: boolean
  /** Días de la racha recién alcanzada, p. ej. 7 */
  racha: number
  /** Próximo hito a perseguir, p. ej. 15 */
  siguiente: number
  onClose: () => void
}) {
  const { colors } = useTheme()
  const reduceMotion = useReduceMotion()
  const themedStyles = useMemo(() => makeThemedStyles(colors), [colors])

  const backdropOpacity = useRef(new Animated.Value(0)).current
  const cardOpacity      = useRef(new Animated.Value(0)).current
  const cardScale        = useRef(new Animated.Value(0.85)).current
  const iconScale        = useRef(new Animated.Value(0.3)).current
  const iconPulse        = useRef(new Animated.Value(1)).current
  const [confettiBatch, setConfettiBatch] = useState(0)

  useEffect(() => {
    if (!visible) return
    setConfettiBatch(b => b + 1)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})

    backdropOpacity.setValue(0)
    cardOpacity.setValue(0)
    cardScale.setValue(0.85)
    iconScale.setValue(0.3)

    // Reduce-motion (WCAG 2.3.3): la card aparece directo en su posición final,
    // sin entrada animada ni el pulso continuo del ícono.
    if (reduceMotion) {
      backdropOpacity.setValue(1); cardOpacity.setValue(1); cardScale.setValue(1); iconScale.setValue(1)
      return
    }

    Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start()
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 320, delay: 80, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 70, friction: 9, delay: 80, useNativeDriver: true }),
    ]).start()
    Animated.spring(iconScale, {
      toValue: 1, tension: 60, friction: 5, delay: 220, useNativeDriver: true,
    }).start()

    const pulseTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(iconPulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
      ).start()
    }, 700)
    return () => clearTimeout(pulseTimer)
  }, [visible, reduceMotion])

  if (!visible) return null

  const confettiPieces = reduceMotion ? [] : Array.from({ length: 14 })

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.center}>
          <Animated.View style={[themedStyles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
            <View style={styles.confettiWrap} pointerEvents="none">
              {confettiPieces.map((_, i) => (
                <ConfettiPiece key={`${confettiBatch}-${i}`} delay={i * 35} />
              ))}
            </View>

            <View style={styles.glowWrap} pointerEvents="none">
              <Svg width={160} height={160}>
                <Defs>
                  <RadialGradient id="streakGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={colors.orange} stopOpacity={0.45} />
                    <Stop offset="100%" stopColor={colors.orange} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={80} cy={80} r={80} fill="url(#streakGlow)" />
              </Svg>
            </View>

            <Animated.View style={[themedStyles.iconCircle, { transform: [{ scale: iconScale }] }]}>
              <Animated.Text style={[styles.iconEmoji, { transform: [{ scale: iconPulse }] }]}>🔥</Animated.Text>
            </Animated.View>

            <Text style={themedStyles.title}>¡Felicidades!</Text>
            <Text style={themedStyles.desc}>
              Alcanzaste una racha de <Text style={themedStyles.descAccent}>{racha} días</Text>
            </Text>

            <View style={themedStyles.nextPill}>
              <Text style={themedStyles.nextLabel}>¿PRÓXIMO RETO?</Text>
              <Text style={themedStyles.nextValue}>Vamos por los {siguiente}</Text>
            </View>

            <TouchableOpacity style={styles.cta} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.accent, colors.accentLight]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.ctaText, { color: readableTextOn(colors.accent) }]}>¡Seguimos!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  // Ancla de tamaño cero, centrada horizontalmente por alignSelf (no depende de
  // que el padre propague alignItems a hijos absolutos): cada partícula sale
  // desde este punto exacto y el transform la empuja hacia afuera.
  confettiWrap: {
    position: 'absolute', top: '32%', alignSelf: 'center', width: 1, height: 1,
  },
  confettiPiece: { position: 'absolute', top: 0, left: 0, fontSize: 20 },
  glowWrap: { position: 'absolute', top: 8, alignSelf: 'center' },
  iconEmoji: { fontSize: 44, lineHeight: 52 },
  cta: {
    width: '100%', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 4,
  },
  ctaText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#fff', letterSpacing: -0.2 },
})

function makeThemedStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      width: '100%', maxWidth: 360,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 28, paddingVertical: 36, paddingHorizontal: 28,
      alignItems: 'center', gap: 14,
      shadowColor: c.accent, shadowOpacity: 0.25, shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 }, elevation: 12,
    },
    iconCircle: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: 'rgba(255,170,50,0.14)',
      borderWidth: 1, borderColor: 'rgba(255,170,50,0.3)',
      alignItems: 'center', justifyContent: 'center',
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 26, color: c.inkPrimary,
      letterSpacing: -0.6, textAlign: 'center',
    },
    desc: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: c.inkSecondary,
      textAlign: 'center', lineHeight: 22,
    },
    descAccent: {
      fontFamily: 'InstrumentSerif-Italic', fontSize: 17, color: c.orange,
    },
    nextPill: {
      marginTop: 6, width: '100%',
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16,
      alignItems: 'center', gap: 4,
    },
    nextLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted,
      letterSpacing: 1.5,
    },
    nextValue: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: c.accent,
      letterSpacing: -0.2,
    },
  })
}
