import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPost } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Decision {
  icon: string
  text: string
}

interface Evidence {
  text: string
  reference: string
}

interface Resumen {
  decisiones: Decision[]
  evidencia: Evidence | null
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEP_CONFIG = [
  { title: 'Carga y esfuerzo',    subtitle: 'Cuéntanos cómo estuvo el trabajo de hoy.' },
  { title: 'Lo que dice el coach', subtitle: 'Por qué se diseñó así tu sesión de hoy.' },
  { title: 'Cierre de sesión',     subtitle: 'Último dato antes de guardar.' },
] as const

// ─── Option data ──────────────────────────────────────────────────────────────

const RPE_OPTIONS = [
  { label: 'Muy por debajo de mi límite',        rpe: 4,  icon: '🌱', color: '#32c896' },
  { label: 'Trabajé bien, podría haber dado más', rpe: 6,  icon: '💧', color: '#4f8cff' },
  { label: 'Di bastante, me queda poco',          rpe: 8,  icon: '🔥', color: '#ffaa32' },
  { label: 'Lo di todo',                          rpe: 10, icon: '⚡', color: '#ff4444' },
] as const

const SENSACION_OPTIONS = [
  { id: 'activado', label: 'Activado y bien',   icon: '✨', color: '#32c896' },
  { id: 'cansado',  label: 'Cansado pero bien', icon: '💤', color: '#4f8cff' },
  { id: 'cargado',  label: 'Muy cargado',       icon: '🏋️', color: '#ffaa32' },
  { id: 'molestia', label: 'Algo me molesta',   icon: '🤕', color: '#ff4444' },
] as const

const ZONAS_MOLESTIA = [
  'Cuello', 'Hombros', 'Espalda alta', 'Espalda baja',
  'Cadera', 'Rodilla', 'Tobillo', 'Muñeca',
]

const RATING_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCumplimientoColor(value: number, c: Colors): string {
  if (value >= 90) return c.green
  if (value >= 70) return c.accentLight
  if (value >= 50) return c.orange
  return c.red
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const { colors } = useTheme()
  return (
    <View style={pbStyles.row}>
      {[1, 2, 3].map(seg => {
        const isActive    = step === seg
        const isCompleted = step > seg
        return (
          <View
            key={seg}
            style={[
              pbStyles.segment,
              isActive    && { flex: 1.25, height: 5, backgroundColor: colors.accent },
              isCompleted && { backgroundColor: colors.accentLight, opacity: 0.7 },
              !isActive && !isCompleted && { backgroundColor: colors.borderBright },
            ]}
          />
        )
      })}
    </View>
  )
}

const pbStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  segment: { flex: 1, height: 3, borderRadius: 4 },
})

// ─── Option Row ───────────────────────────────────────────────────────────────

function OptionRow({
  icon, label, color, selected, onPress, styles,
}: {
  icon: string
  label: string
  color: string
  selected: boolean
  onPress: () => void
  styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity
      style={[
        styles.optRow,
        selected && { backgroundColor: color + '18', borderColor: color, borderWidth: 1.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.optIconBox, { backgroundColor: selected ? color + '30' : colors.cardBg }]}>
        <Text style={styles.optIcon}>{icon}</Text>
      </View>
      <Text style={[styles.optLabel, { color: selected ? colors.inkPrimary : colors.inkSecondary }]}>
        {label}
      </Text>
      <View style={[styles.optRadio, selected && { borderColor: color }]}>
        {selected && <View style={[styles.optRadioDot, { backgroundColor: color }]} />}
      </View>
    </TouchableOpacity>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  onIncrement, onDecrement, displayValue, color, styles,
}: {
  onIncrement: () => void
  onDecrement: () => void
  displayValue: string
  color: string
  styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: colors.borderDefault }]}
        onPress={onDecrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <View style={[styles.stepperValueContainer, { borderColor: color + '55' }]}>
        <Text style={[styles.stepperValue, { color }]}>{displayValue}</Text>
      </View>
      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: colors.borderDefault }]}
        onPress={onIncrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ children, styles }: { children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.sectionCard}>{children}</View>
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonLine({ width, height = 12, styles }: { width: string | number; height?: number; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.skeletonLine, { width: width as any, height }]} />
  )
}

// ─── Step 2 — Trainer Summary ─────────────────────────────────────────────────

function TrainerSummary({
  resumen, loading, styles,
}: {
  resumen: Resumen | null
  loading: boolean
  styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()

  if (loading) {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryAccentBorder} />
        <View style={styles.summaryInner}>
          <SkeletonLine width="70%" height={11} styles={styles} />
          <SkeletonLine width="50%" height={9} styles={styles} />
          <View style={styles.summaryDivider} />
          <SkeletonLine width="90%" styles={styles} />
          <SkeletonLine width="80%" styles={styles} />
          <View style={styles.summaryDivider} />
          <SkeletonLine width="95%" styles={styles} />
          <SkeletonLine width="40%" styles={styles} />
        </View>
      </View>
    )
  }

  if (!resumen || (resumen.decisiones.length === 0 && !resumen.evidencia)) {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryAccentBorder} />
        <View style={styles.summaryInner}>
          <Text style={[styles.summaryEmptyText, { color: colors.inkMuted }]}>
            El análisis del coach no está disponible para esta sesión.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryAccentBorder} />
      <View style={styles.summaryInner}>

        {/* Header */}
        <Text style={styles.summaryHeaderLabel}>DECISIONES DEL ENTRENADOR</Text>

        <View style={styles.summaryDivider} />

        {/* Decision items */}
        {resumen.decisiones.map((d, i) => (
          <View key={i} style={styles.decisionRow}>
            <View style={styles.decisionIconBox}>
              <Text style={styles.decisionIcon}>{d.icon}</Text>
            </View>
            <Text style={styles.decisionText}>{d.text}</Text>
          </View>
        ))}

        {/* Evidence */}
        {resumen.evidencia && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.evidenceBlock}>
              <Text style={styles.evidenceLabel}>EVIDENCIA</Text>
              <Text style={styles.evidenceText}>"{resumen.evidencia.text}"</Text>
              <Text style={styles.evidenceRef}>— {resumen.evidencia.reference}</Text>
            </View>
          </>
        )}

      </View>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FeedbackScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>()
  const { colors }  = useTheme()
  const styles      = useMemo(() => makeStyles(colors), [colors])
  const insets      = useSafeAreaInsets()
  const scrollRef   = useRef<ScrollView>(null)

  // ── Step 1 state ───────────────────────────────────────────────────────────
  const [rpeChoice,     setRpeChoice]     = useState<number | null>(null)
  const [sensacion,     setSensacion]     = useState<string | null>(null)
  const [zonasMolestia, setZonasMolestia] = useState<string[]>([])
  const [notas,         setNotas]         = useState('')

  // ── Step 2 state ───────────────────────────────────────────────────────────
  const [resumen,        setResumen]        = useState<Resumen | null>(null)
  const [resumenLoading, setResumenLoading] = useState(false)

  // ── Step 3 state ───────────────────────────────────────────────────────────
  const [rating,        setRating]        = useState<number | null>(null)
  const [cumplimiento,  setCumplimiento]  = useState(80)
  const [cumplModified, setCumplModified] = useState(false)

  // ── Submit state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [step,       setStep]       = useState(1)

  const step1Complete = rpeChoice !== null && sensacion !== null
  const canAdvance    = step === 1 ? step1Complete : true

  // ── Fetch resumen when entering step 2 ────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || resumen !== null || resumenLoading) return
    setResumenLoading(true)
    apiGet(`/api/sessions/${id}/resumen/`)
      .then((data: Resumen) => setResumen(data))
      .catch(() => setResumen({ decisiones: [], evidencia: null }))
      .finally(() => setResumenLoading(false))
  }, [step])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function selectSensacion(sid: string) {
    setSensacion(sid)
    if (sid !== 'molestia') setZonasMolestia([])
  }

  function toggleZona(zona: string) {
    setZonasMolestia(prev =>
      prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona]
    )
  }

  function incrementCumpl() { setCumplimiento(v => Math.min(v + 5, 100)); setCumplModified(true) }
  function decrementCumpl() { setCumplimiento(v => Math.max(v - 5, 0)); setCumplModified(true) }

  function goNext() {
    if (step < 3) {
      setStep(s => s + 1)
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 60)
    } else {
      handleFinalizar()
    }
  }

  async function handleFinalizar() {
    setSubmitting(true)
    try {
      await apiPost(`/api/sessions/${id}/feedback/`, {
        rpe_real:    rpeChoice ?? 7,
        cumplimiento,
        rating:      rating ?? 3,
        notas:       notas.trim() || null,
      })
      router.replace('/(app)/dashboard')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar el feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const currentStepCfg = STEP_CONFIG[step - 1]
  const primaryLabel   = step === 3 ? 'Cerrar sesión' : 'Continuar'

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Progress bar ── */}
        <ProgressBar step={step} />

        {/* ── Step label ── */}
        <Text style={styles.stepLabel}>CIERRE DE SESIÓN · PASO {step} DE 3</Text>

        {/* ── Title block ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>{currentStepCfg.title}</Text>
          <Text style={styles.pageSubtitle}>{currentStepCfg.subtitle}</Text>
        </View>

        {/* ════════════ PASO 1 ════════════ */}
        {step === 1 && (
          <View style={styles.stepContent}>

            <Text style={styles.questionLabel}>¿CÓMO FUE EL ESFUERZO DE HOY?</Text>
            <View style={styles.optList}>
              {RPE_OPTIONS.map(opt => (
                <OptionRow
                  key={opt.rpe}
                  icon={opt.icon}
                  label={opt.label}
                  color={opt.color}
                  selected={rpeChoice === opt.rpe}
                  onPress={() => setRpeChoice(opt.rpe)}
                  styles={styles}
                />
              ))}
            </View>

            <Text style={[styles.questionLabel, { marginTop: 8 }]}>¿CÓMO ESTÁ TU CUERPO AHORA?</Text>
            <View style={styles.optList}>
              {SENSACION_OPTIONS.map(opt => (
                <OptionRow
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  color={opt.color}
                  selected={sensacion === opt.id}
                  onPress={() => selectSensacion(opt.id)}
                  styles={styles}
                />
              ))}
            </View>

            {sensacion === 'molestia' && (
              <View style={styles.zonasCard}>
                <Text style={styles.zonasTitle}>ZONAS DE MOLESTIA</Text>
                <View style={styles.zonasGrid}>
                  {ZONAS_MOLESTIA.map(zona => {
                    const on = zonasMolestia.includes(zona)
                    return (
                      <TouchableOpacity
                        key={zona}
                        style={[styles.zonaChip, on && styles.zonaChipOn]}
                        onPress={() => toggleZona(zona)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.zonaChipText, on && styles.zonaChipTextOn]}>
                          {zona}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            <Text style={[styles.questionLabel, { marginTop: 8 }]}>NOTA DE SESIÓN (OPCIONAL)</Text>
            <View style={styles.notaCard}>
              <TextInput
                style={[styles.notaInput, { color: colors.inkPrimary }]}
                placeholder="¿Algo que quieras recordar de esta sesión?"
                placeholderTextColor={colors.inkMuted}
                value={notas}
                onChangeText={t => setNotas(t.slice(0, 140))}
                multiline
                textAlignVertical="top"
                maxLength={140}
              />
              <Text style={styles.notaCounter}>{notas.length} / 140</Text>
            </View>

          </View>
        )}

        {/* ════════════ PASO 2 — Coach summary ════════════ */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <TrainerSummary resumen={resumen} loading={resumenLoading} styles={styles} />
          </View>
        )}

        {/* ════════════ PASO 3 ════════════ */}
        {step === 3 && (
          <View style={styles.stepContent}>

            {/* Rating */}
            <SectionCard styles={styles}>
              <Text style={styles.sectionTitle}>Rating general</Text>
              <Text style={styles.sectionSubtitle}>¿Cómo valorarías esta sesión en general?</Text>
              <View style={styles.emojiRow}>
                {RATING_EMOJIS.map((emoji, idx) => {
                  const value      = idx + 1
                  const isSelected = rating === value
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.emojiBtn, isSelected && styles.emojiBtnSelected]}
                      onPress={() => setRating(value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.emojiChar, isSelected && styles.emojiCharSelected]}>
                        {emoji}
                      </Text>
                      {isSelected && <Text style={styles.emojiValueLabel}>{value}</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </SectionCard>

            {/* Cumplimiento */}
            <SectionCard styles={styles}>
              <Text style={styles.sectionTitle}>¿Cuánto completaste?</Text>
              <Text style={styles.sectionSubtitle}>Porcentaje de ejercicios y series realizados</Text>
              <Stepper
                onIncrement={incrementCumpl}
                onDecrement={decrementCumpl}
                displayValue={`${cumplimiento}%`}
                color={getCumplimientoColor(cumplimiento, colors)}
                styles={styles}
              />
              <View style={styles.cumplimientoBar}>
                <View
                  style={[
                    styles.cumplimientoFill,
                    {
                      width: `${cumplimiento}%` as any,
                      backgroundColor: getCumplimientoColor(cumplimiento, colors),
                    },
                  ]}
                />
              </View>
            </SectionCard>

          </View>
        )}

        {/* ── Primary button ── */}
        <TouchableOpacity
          style={[styles.primaryBtn, !canAdvance && styles.primaryBtnDisabled]}
          onPress={goNext}
          disabled={!canAdvance || submitting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canAdvance
              ? [colors.accent, colors.accentLight]
              : [colors.borderDefault, colors.borderDefault]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {submitting && step === 3 ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={[styles.primaryBtnText, !canAdvance && { color: colors.inkMuted }]}>
              {primaryLabel}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 400,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    // Step chrome
    stepLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      color: c.inkMuted,
      marginBottom: 18,
    },
    titleBlock: {
      marginBottom: 28,
      gap: 8,
    },
    pageTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 32,
      color: c.inkPrimary,
      letterSpacing: -0.8,
      lineHeight: 38,
    },
    pageSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      lineHeight: 21,
    },
    stepContent: {
      gap: 12,
      marginBottom: 32,
    },

    // Question label
    questionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      color: c.inkMuted,
      marginBottom: 2,
    },

    // Option rows
    optList: { gap: 8 },
    optRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 16,
      padding: 14,
    },
    optIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    optIcon: { fontSize: 20, lineHeight: 24 },
    optLabel: {
      flex: 1,
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: -0.1,
    },
    optRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.borderBright,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    optRadioDot: { width: 10, height: 10, borderRadius: 5 },

    // Zonas de molestia
    zonasCard: {
      backgroundColor: 'rgba(255,68,68,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.25)',
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    zonasTitle: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      color: c.red,
    },
    zonasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    zonaChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.borderBright,
      backgroundColor: c.cardBg,
    },
    zonaChipOn: {
      backgroundColor: 'rgba(255,68,68,0.15)',
      borderColor: 'rgba(255,68,68,0.5)',
    },
    zonaChipText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },
    zonaChipTextOn: { color: c.red, fontFamily: 'SpaceGrotesk-Medium' },

    // Nota section C
    notaCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    notaInput: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      lineHeight: 22,
      minHeight: 60,
    },
    notaCounter: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.4,
      color: c.inkMuted,
      textAlign: 'right',
    },

    // ── Step 2 — Trainer summary card ─────────────────────────────────────────
    summaryCard: {
      flexDirection: 'row',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      overflow: 'hidden',
      minHeight: 180,
    },
    summaryAccentBorder: {
      width: 3,
      backgroundColor: c.accent,
      borderRadius: 3,
      margin: 12,
      marginRight: 0,
      alignSelf: 'stretch',
    },
    summaryInner: {
      flex: 1,
      padding: 16,
      gap: 12,
    },
    summaryHeaderLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      color: c.accent,
    },
    summaryDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderDefault,
    },
    decisionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    decisionIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: c.glassBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
    },
    decisionIcon: { fontSize: 16, lineHeight: 20 },
    decisionText: {
      flex: 1,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 20,
      letterSpacing: -0.1,
    },
    evidenceBlock: {
      backgroundColor: 'rgba(79,140,255,0.06)',
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    evidenceLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      color: c.accentLight,
    },
    evidenceText: {
      fontFamily: 'InstrumentSerif-Italic',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 20,
    },
    evidenceRef: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 0.2,
    },
    summaryEmptyText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      lineHeight: 20,
    },

    // Skeleton
    skeletonLine: {
      backgroundColor: c.borderBright,
      borderRadius: 4,
    },

    // Section card (step 3)
    sectionCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 20,
      gap: 12,
    },
    sectionTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      color: c.inkPrimary,
      letterSpacing: -0.2,
    },
    sectionSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 18,
      marginTop: -6,
    },

    // Stepper
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      justifyContent: 'center',
      marginTop: 4,
    },
    stepperBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardBg,
    },
    stepperBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.inkPrimary,
      lineHeight: 24,
    },
    stepperValueContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
      backgroundColor: c.glassBg,
    },
    stepperValue: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      letterSpacing: -0.5,
    },

    // Cumplimiento bar
    cumplimientoBar: {
      height: 4,
      backgroundColor: c.borderDefault,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 4,
    },
    cumplimientoFill: { height: 4, borderRadius: 2 },

    // Emoji rating
    emojiRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    emojiBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      marginHorizontal: 2,
      gap: 4,
    },
    emojiBtnSelected: {
      backgroundColor: 'rgba(79,140,255,0.12)',
      borderColor: 'rgba(79,140,255,0.35)',
    },
    emojiChar: { fontSize: 26, opacity: 0.5 },
    emojiCharSelected: { opacity: 1 },
    emojiValueLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.accentLight,
      letterSpacing: 0.5,
    },

    // Primary button
    primaryBtn: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      minHeight: 54,
    },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: '#fff',
      letterSpacing: -0.2,
    },
  })
}
