import React, { useEffect, useRef } from 'react'
import { View, Text, Animated, Easing, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../lib/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ZyfitScoreComponente = { valor: number | null; activo: boolean }

export type ZyfitScoreDetalle = {
  valor: number | null
  descripcion: string | null
  has_data: boolean
  momentum: number | null
  componentes: Record<string, ZyfitScoreComponente> | null
}

const COMPONENTE_LABELS: Record<string, string> = {
  consistencia: 'Consistencia',
  rendimiento: 'Rendimiento',
  adherencia: 'Adherencia',
  recuperacion: 'Recuperación',
  recencia: 'Recencia',
}
const COMPONENTE_ORDEN = ['consistencia', 'rendimiento', 'adherencia', 'recuperacion', 'recencia']

function getZyfitRango(score: number): string {
  if (score >= 91) return 'Élite adaptativo'
  if (score >= 76) return 'Alto rendimiento'
  if (score >= 56) return 'Entrenando bien'
  if (score >= 31) return 'En ritmo'
  return 'Construyendo base'
}

// ─── Anillo ───────────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const RING_SIZE = 160
const RING_R = 68
const RING_STROKE = 11
const RING_CIRC = 2 * Math.PI * RING_R
const RING_CX = RING_SIZE / 2
const RING_CY = RING_SIZE / 2

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ZyfitScoreCircle({ data }: { data: ZyfitScoreDetalle | null }) {
  const { colors } = useTheme()
  const styles = makeStyles(colors)

  const valor = data?.valor ?? null
  const hasData = data?.has_data ?? false
  const desc = data?.descripcion ?? null
  const momentum = data?.momentum ?? null

  const animOffset = useRef(new Animated.Value(RING_CIRC)).current
  const prevValorRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevValorRef.current === valor) return
    prevValorRef.current = valor
    const target = hasData && valor != null ? RING_CIRC * (1 - valor / 100) : RING_CIRC
    Animated.timing(animOffset, {
      toValue: target,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
  }, [valor, hasData])

  const componentesOrdenados = COMPONENTE_ORDEN
    .map(key => ({ key, label: COMPONENTE_LABELS[key], c: data?.componentes?.[key] }))
    .filter((x): x is { key: string; label: string; c: ZyfitScoreComponente } => !!x.c)

  return (
    <View>
      <Text style={styles.blockLabel}>TU ZYFIT SCORE</Text>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Nivel + tendencia</Text>
          <Text style={styles.subtitle}>Últimas 4 semanas vs. las 4 anteriores</Text>
        </View>

        <View style={styles.ringWrap}>
          {hasData && <View style={[styles.ringGlow, { shadowColor: colors.accent }]} />}
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_CX} cy={RING_CY} r={RING_R}
              fill="none" stroke={colors.borderDefault} strokeWidth={RING_STROKE}
            />
            <AnimatedCircle
              cx={RING_CX} cy={RING_CY} r={RING_R}
              fill="none"
              stroke={hasData ? colors.accent : `${colors.accent}33`}
              strokeWidth={RING_STROKE} strokeLinecap="round"
              strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
              strokeDashoffset={animOffset}
              transform={`rotate(-90, ${RING_CX}, ${RING_CY})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            {hasData && valor != null ? (
              <>
                <Text style={styles.score}>{valor}</Text>
                <Text style={styles.scoreSub}>/ 100</Text>
              </>
            ) : (
              <Text style={styles.scorePlaceholder}>—</Text>
            )}
          </View>
        </View>

        <Text style={styles.rango}>
          {hasData && valor != null ? getZyfitRango(valor) : 'Construyendo tu score'}
        </Text>

        {!!desc && <Text style={styles.desc}>{desc}</Text>}

        {hasData && momentum != null && Math.abs(momentum) > 1 && (
          <Text style={[styles.momentum, { color: momentum > 0 ? colors.green : colors.orange }]}>
            {momentum > 0 ? '↑' : '↓'} {momentum > 0 ? '+' : ''}{Math.round(momentum)} vs. el bloque anterior
          </Text>
        )}

        {componentesOrdenados.length > 0 && (
          <View style={styles.grid}>
            {componentesOrdenados.map(({ key, label, c }) => (
              <View key={key} style={styles.metricCard}>
                <Text style={styles.metricCardLabel}>{label.toUpperCase()}</Text>
                <View style={styles.metricCardBottom}>
                  <Text style={styles.metricCardValue}>{c.valor != null ? Math.round(c.valor) : '—'}</Text>
                  {c.valor != null && <Text style={styles.metricCardUnit}> / 100</Text>}
                </View>
                <View style={styles.progressBg}>
                  {c.valor != null && (
                    <View style={[styles.progressFill, { width: `${c.valor}%`, backgroundColor: colors.accent }]} />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Estado vacío (sin snapshot todavía) ─────────────────────────────────────

export function ZyfitScoreCircleEmpty() {
  const { colors } = useTheme()
  const styles = makeStyles(colors)
  return (
    <View>
      <Text style={styles.blockLabel}>TU ZYFIT SCORE</Text>
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>
          Registra tu primera sesión con feedback para empezar a construir tu Zyfit Score.
        </Text>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    blockLabel: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.inkPrimary,
      letterSpacing: -0.4,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    card: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 16,
      marginBottom: 20,
      alignItems: 'center',
    },
    header: {
      alignSelf: 'stretch',
      marginBottom: 12,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      color: c.inkPrimary,
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    subtitle: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringGlow: {
      position: 'absolute',
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: RING_SIZE / 2,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    score: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 40,
      color: c.inkPrimary,
      letterSpacing: -1,
    },
    scoreSub: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkMuted,
      marginTop: -4,
    },
    scorePlaceholder: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 40,
      color: c.inkFaint,
    },
    rango: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      color: c.inkPrimary,
      marginTop: 12,
      textAlign: 'center',
    },
    desc: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 17,
      paddingHorizontal: 8,
    },
    momentum: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 10,
      letterSpacing: 0.4,
      marginTop: 8,
    },
    grid: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    metricCard: {
      width: '31%',
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 12,
      padding: 8,
      gap: 4,
    },
    metricCardLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 7,
      color: c.inkMuted,
      letterSpacing: 0.5,
    },
    metricCardBottom: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    metricCardValue: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      color: c.inkPrimary,
      letterSpacing: -0.4,
    },
    metricCardUnit: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      color: c.inkMuted,
      marginLeft: 2,
    },
    progressBg: {
      height: 3,
      backgroundColor: c.borderDefault,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 16,
    },
  })
}
