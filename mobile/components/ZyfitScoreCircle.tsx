import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Animated, Easing, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native'
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
  const [modalVisible, setModalVisible] = useState(false)

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

        <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.7} style={styles.howBtn}>
          <Text style={styles.howBtnText}>¿Cómo se calcula el Score? →</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>¿Cómo se calcula el Zyfit Score?</Text>
            <Text style={styles.modalBody}>
              El <Text style={styles.modalBold}>Zyfit Score</Text> es una puntuación del 0 al 100 que combina tu nivel actual con tu tendencia (Momentum) de las últimas 4 semanas vs. las 4 anteriores.{'\n\n'}
              <Text style={styles.modalBold}>📅 Consistencia (30%)</Text>{'\n'}
              Sesiones entrenadas vs. las esperadas según tu objetivo semanal.{'\n\n'}
              <Text style={styles.modalBold}>📈 Rendimiento (25%)</Text>{'\n'}
              Progreso o mantenimiento de tu capacidad, adaptado a tu objetivo.{'\n\n'}
              <Text style={styles.modalBold}>💪 Adherencia (20%)</Text>{'\n'}
              Cumplimiento reportado en el feedback de tus sesiones.{'\n\n'}
              <Text style={styles.modalBold}>🌙 Recuperación (15%)</Text>{'\n'}
              Ánimo, sueño y estado físico de tus check-ins diarios.{'\n\n'}
              <Text style={styles.modalBold}>⏱️ Recencia (10%)</Text>{'\n'}
              Qué tan reciente fue tu última sesión.{'\n\n'}
              Si te falta historial en algún factor, su peso se redistribuye entre los demás — por eso solo ves los factores activos. Se actualiza después de cada sesión con feedback.
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
      // Look glass consistente con Inicio (glassBg + borde brillante + radio 22).
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 22,
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
      justifyContent: 'center', // fila de arriba (3) casi llena; los 2 de abajo quedan centrados
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
    howBtn: {
      alignSelf: 'center',
      paddingVertical: 2,
      marginTop: 14,
    },
    howBtnText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      color: c.accent,
      letterSpacing: 0.1,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: c.sheetBg,
      borderWidth: 1,
      borderColor: 'rgba(79,140,255,0.30)',
      borderRadius: 24,
      padding: 24,
      width: '100%',
      gap: 14,
    },
    modalTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      color: c.inkPrimary,
      letterSpacing: -0.4,
      lineHeight: 24,
    },
    modalBody: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 21,
    },
    modalBold: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    modalCloseBtn: {
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 4,
    },
    modalCloseText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      color: '#ffffff',
      letterSpacing: 0.2,
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
