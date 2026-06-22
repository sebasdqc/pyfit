import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPost } from '../../../lib/api'
import { fetchMiCoach } from '../../../lib/coachApi'
import { useTranslation } from '../../../lib/i18n'
import WorkoutShareCard from '../../../components/WorkoutShareCard'
import SessionPhotos from '../../../components/SessionPhotos'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Decision     { icon: string; text: string }
interface Evidence     { text: string; reference: string }
interface Resumen      { decisiones: Decision[]; evidencia: Evidence | null }
interface Logro        { icon: string; titulo: string; descripcion: string }
interface ProximaSesion { tipo: string; dia: string }

// ─── Option data ──────────────────────────────────────────────────────────────

const RPE_OPTIONS = [
  { labelKey: 'feedback_rpe_1' as const, rpe: 4,  icon: '🌱', color: '#32c896' },
  { labelKey: 'feedback_rpe_2' as const, rpe: 6,  icon: '💧', color: '#4f8cff' },
  { labelKey: 'feedback_rpe_3' as const, rpe: 8,  icon: '🔥', color: '#ffaa32' },
  { labelKey: 'feedback_rpe_4' as const, rpe: 10, icon: '⚡', color: '#ff4444' },
] as const

const SENSACION_OPTIONS = [
  { id: 'activado', labelKey: 'feedback_feel_1' as const, icon: '✨', color: '#32c896' },
  { id: 'cansado',  labelKey: 'feedback_feel_2' as const, icon: '💤', color: '#4f8cff' },
  { id: 'cargado',  labelKey: 'feedback_feel_3' as const, icon: '🏋️', color: '#ffaa32' },
  { id: 'molestia', labelKey: 'feedback_feel_4' as const, icon: '🤕', color: '#ff4444' },
] as const

const ZONAS_KEYS = [
  { id: 'Cuello',        key: 'feedback_zone_neck' as const },
  { id: 'Hombros',       key: 'feedback_zone_shoulders' as const },
  { id: 'Espalda alta',  key: 'feedback_zone_upper_back' as const },
  { id: 'Espalda baja',  key: 'feedback_zone_lower_back' as const },
  { id: 'Cadera',        key: 'feedback_zone_hip' as const },
  { id: 'Rodilla',       key: 'feedback_zone_knee' as const },
  { id: 'Tobillo',       key: 'feedback_zone_ankle' as const },
  { id: 'Muñeca',        key: 'feedback_zone_wrist' as const },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sensacionToMetrics(s: string | null): { rating: number; cumplimiento: number } {
  switch (s) {
    case 'activado': return { rating: 5, cumplimiento: 95 }
    case 'cansado':  return { rating: 4, cumplimiento: 80 }
    case 'cargado':  return { rating: 3, cumplimiento: 70 }
    case 'molestia': return { rating: 2, cumplimiento: 65 }
    default:         return { rating: 3, cumplimiento: 80 }
  }
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
              isActive    && { flex: 1.25, height: 6, borderRadius: 3, backgroundColor: colors.accent },
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
  segment: { flex: 1, height: 4, borderRadius: 2 },
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

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onPress()
  }

  return (
    <TouchableOpacity
      style={[
        styles.optRow,
        selected && { backgroundColor: color + '18', borderColor: color, borderWidth: 1.5 },
      ]}
      onPress={handlePress}
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

// Pulso de opacidad compartido para los skeletons — el estado de carga "respira"
// en vez de quedarse congelado. Corre en el hilo nativo (opacity).
function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [pulse])
  return pulse
}

function SkeletonLine({ width, height = 12, styles }: { width: string | number; height?: number; styles: ReturnType<typeof makeStyles> }) {
  const pulse = useSkeletonPulse()
  return <Animated.View style={[styles.skeletonLine, { width: width as any, height, opacity: pulse }]} />
}

function SkeletonCircle({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  const pulse = useSkeletonPulse()
  return <Animated.View style={[styles.skeletonCircle, { opacity: pulse }]} />
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
  const { t } = useTranslation()

  if (loading) {
    return (
      <>
        <Text style={styles.loadingLabel}>{t('feedback_analyzing')}</Text>
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
      </>
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
        <Text style={styles.summaryHeaderLabel}>{t('feedback_decisions_label')}</Text>
        <View style={styles.summaryDivider} />
        {resumen.decisiones.map((d, i) => (
          <View key={i} style={styles.decisionRow}>
            <View style={styles.decisionIconBox}>
              <Text style={styles.decisionIcon}>{d.icon}</Text>
            </View>
            <Text style={styles.decisionText}>{d.text}</Text>
          </View>
        ))}
        {resumen.evidencia && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.evidenceBlock}>
              <Text style={styles.evidenceLabel}>{t('feedback_evidence_label')}</Text>
              <Text style={styles.evidenceText}>"{resumen.evidencia.text}"</Text>
              <Text style={styles.evidenceRef}>— {resumen.evidencia.reference}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

// ─── Step 3 — Achievement Card (animated) ─────────────────────────────────────

function AchievementCard({
  logro, styles,
}: {
  logro: Logro
  styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()

  // Entrance animation values
  const cardOpacity = useRef(new Animated.Value(0)).current
  const cardSlide   = useRef(new Animated.Value(24)).current
  const iconScale   = useRef(new Animated.Value(0.4)).current
  const iconPulse   = useRef(new Animated.Value(1)).current
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    // Haptic on achievement reveal
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})

    // Card slides up and fades in
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start()

    // Icon bounces in with spring
    Animated.spring(iconScale, {
      toValue: 1, tension: 55, friction: 5, delay: 160, useNativeDriver: true,
    }).start()

    // Gentle continuous pulse after entrance
    const pulseTimer = setTimeout(() => {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, { toValue: 1.07, duration: 1400, useNativeDriver: true }),
          Animated.timing(iconPulse, { toValue: 1.0,  duration: 1400, useNativeDriver: true }),
        ])
      )
      pulseLoopRef.current.start()
    }, 900)

    return () => {
      clearTimeout(pulseTimer)
      pulseLoopRef.current?.stop()
    }
  }, [])

  return (
    <Animated.View
      style={[
        styles.achievementCard,
        { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
      ]}
    >
      <Animated.View
        style={[
          styles.achievementIconCircle,
          { backgroundColor: colors.accent + '1a', transform: [{ scale: iconScale }] },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
          <Text style={styles.achievementIconEmoji}>{logro.icon}</Text>
        </Animated.View>
      </Animated.View>
      <Text style={styles.achievementTitulo}>{logro.titulo}</Text>
      <Text style={styles.achievementDesc}>{logro.descripcion}</Text>
    </Animated.View>
  )
}

// ─── Step 3 — Next Session Card (animated) ────────────────────────────────────

function NextSessionCard({
  proximaSesion, styles,
}: {
  proximaSesion: ProximaSesion
  styles: ReturnType<typeof makeStyles>
}) {
  const { t } = useTranslation()
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 360, delay: 280, useNativeDriver: true,
    }).start()
  }, [])

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.nextSessionCard}>
        <View style={styles.nextSessionLeft}>
          <Text style={styles.nextSessionLabel}>{t('feedback_next_session')}</Text>
          <Text style={styles.nextSessionTipo}>{proximaSesion.tipo}</Text>
          <Text style={styles.nextSessionDia}>{proximaSesion.dia}</Text>
        </View>
        {/* Etiqueta informativa, no un botón: agendar aún no existe, así que no
            mostramos una affordance pulsable que solo abría un Alert. */}
        <View style={styles.agendarTag}>
          <Text style={styles.agendarTagText}>📅  {t('feedback_coming_soon')}</Text>
        </View>
      </View>
    </Animated.View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FeedbackScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()

  if (!id) {
    router.replace('/(app)/dashboard')
    return null
  }
  const { t }      = useTranslation()
  const styles     = useMemo(() => makeStyles(colors), [colors])
  const insets     = useSafeAreaInsets()
  const scrollRef  = useRef<ScrollView>(null)
  const submittingRef = useRef(false)   // guard doble-tap en "Listo"
  const navTsRef      = useRef(0)        // debounce de goNext (evita saltarse un paso)

  // ── Step 1 state ───────────────────────────────────────────────────────────
  const [rpeChoice,     setRpeChoice]     = useState<number | null>(null)
  const [sensacion,     setSensacion]     = useState<string | null>(null)
  const [zonasMolestia, setZonasMolestia] = useState<string[]>([])
  const [notas,         setNotas]         = useState('')

  // ── Step 2 state ───────────────────────────────────────────────────────────
  const [resumen,        setResumen]        = useState<Resumen | null>(null)
  const [resumenLoading, setResumenLoading] = useState(false)

  // ── Step 3 state ───────────────────────────────────────────────────────────
  const [logro,         setLogro]         = useState<Logro | null>(null)
  const [logroLoading,  setLogroLoading]  = useState(false)
  const [proximaSesion, setProximaSesion] = useState<ProximaSesion | null>(null)

  // ── Step nav ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ── Gating por config del coach ──────────────────────────────────────────────
  // null = aún sin resolver (no renderizamos el flujo para no mostrar un flash
  // del formulario). Si el coach desactivó el feedback post-sesión, saltamos
  // directo al dashboard. Failure-safe: sin coach/sin red → se muestra normal.
  const [feedbackOff, setFeedbackOff] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchMiCoach()
      .then(r => {
        if (cancelled) return
        if (r.config?.feedback === false) {
          setFeedbackOff(true)
          router.replace('/(app)/dashboard')
        } else {
          setFeedbackOff(false)
        }
      })
      .catch(() => { if (!cancelled) setFeedbackOff(false) })
    return () => { cancelled = true }
  }, [])

  // ── Share card data ───────────────────────────────────────────────────────────
  const [sessionForShare, setSessionForShare] = useState<any>(null)

  useEffect(() => {
    apiGet(`/api/sessions/${id}/`)
      .then(data => setSessionForShare(data))
      .catch(() => {})
  }, [id])

  const shareCardProps = useMemo(() => {
    const ia = sessionForShare?.respuesta_ia
    if (!ia) return {}
    const fases = (ia.fases || []) as any[]
    const flat = fases.flatMap((f: any) =>
      (f.ejercicios || []).map((e: any) => ({ ...e, _main: String(f.nombre || '').toLowerCase().includes('principal') })),
    )
    const totalSeries = flat.reduce((sum: number, e: any) => sum + (parseInt(String(e.series)) || 0), 0)
    // La tarjeta muestra hasta 6 ejercicios: prioriza el bloque principal (los
    // lifts reales) sobre calentamiento/vuelta a la calma.
    const ordered = [...flat].sort((a: any, b: any) => (b._main ? 1 : 0) - (a._main ? 1 : 0))
    const fecha: string = sessionForShare?.fecha || ''
    const parts = fecha.split('-')
    const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
    const dateLabel = parts.length === 3
      ? `${parseInt(parts[2])} ${MONTHS[parseInt(parts[1]) - 1] ?? ''} ${parts[0]}`
      : undefined
    return {
      title: (ia.titulo || ia.objetivo_sesion || undefined) as string | undefined,
      metrics: [
        { label: 'EJERCICIOS', value: String(flat.length) },
        { label: 'SERIES',     value: String(totalSeries) },
        { label: 'DURACIÓN',   value: `${ia.duracion_total || sessionForShare?.duracion_planificada || '--'} min` },
      ],
      exercises: ordered.map((e: any) => ({
        nombre: String(e.nombre || ''),
        series: parseInt(String(e.series)) || 0,
        repeticiones: String(e.repeticiones || ''),
      })),
      dateLabel,
    }
  }, [sessionForShare])

  // ── Share card modal ─────────────────────────────────────────────────────────
  const [shareOpen, setShareOpen] = useState(false)
  const step1Complete   = rpeChoice !== null && sensacion !== null
  const canAdvance      = step === 1 ? step1Complete : true

  // ── Step config (derived from translations) ────────────────────────────────
  const STEP_CONFIG = [
    { title: t('feedback_step1_title'), subtitle: t('feedback_step1_sub') },
    { title: t('feedback_step2_title'), subtitle: t('feedback_step2_sub') },
    { title: t('feedback_step3_title'), subtitle: t('feedback_step3_sub') },
  ]

  // ── Step transition animation ──────────────────────────────────────────────
  const contentFade  = useRef(new Animated.Value(0)).current
  const contentSlide = useRef(new Animated.Value(18)).current

  useEffect(() => {
    contentFade.setValue(0)
    contentSlide.setValue(18)
    Animated.parallel([
      Animated.timing(contentFade,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(contentSlide, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
    ]).start()
  }, [step])

  // ── Fetch resumen on step 2 ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || resumen !== null || resumenLoading) return
    setResumenLoading(true)
    apiGet(`/api/sessions/${id}/resumen/`)
      .then((data: Resumen) => setResumen(data))
      .catch(() => setResumen({ decisiones: [], evidencia: null }))
      .finally(() => setResumenLoading(false))
  }, [step, id])

  // ── Fetch logro on step 3 ──────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 3 || logro !== null || logroLoading) return
    setLogroLoading(true)
    apiGet(`/api/sessions/${id}/logro/`)
      .then((data: { logro: Logro; proxima_sesion: ProximaSesion }) => {
        setLogro(data.logro)
        setProximaSesion(data.proxima_sesion)
      })
      .catch(() => {
        setLogro({ icon: '🎯', titulo: 'Sesión completada.', descripcion: 'Cerramos esta sesión en tu historial.' })
        setProximaSesion(null)
      })
      .finally(() => setLogroLoading(false))
  }, [step, id])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function selectSensacion(sid: string) {
    setSensacion(sid)
    // No limpiar zonasMolestia al cambiar de sensación — si el usuario vuelve a
    // "molestia" recupera las zonas que ya había marcado sin tener que re-seleccionar.
  }

  function toggleZona(zona: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    setZonasMolestia(prev =>
      prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona]
    )
  }

  function goNext() {
    // Debounce: dos taps muy seguidos saltarían el paso 2 (dos setStep en lote).
    const now = Date.now()
    if (now - navTsRef.current < 600) return
    navTsRef.current = now
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    setStep(s => Math.min(s + 1, 3))
  }

  async function handleListo() {
    if (submittingRef.current) return   // guard doble-tap → no duplicar feedback/navegación
    submittingRef.current = true
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    const { rating, cumplimiento } = sensacionToMetrics(sensacion)
    try {
      await apiPost(`/api/sessions/${id}/feedback/`, {
        rpe_real: rpeChoice ?? 7, cumplimiento, rating,
        notas: notas.trim() || null,
        molestias: sensacion === 'molestia' ? zonasMolestia : [],
      })
      router.replace('/(app)/dashboard')
    } catch {
      submittingRef.current = false
      Alert.alert(
        t('feedback_save_error_title') || 'No pudimos guardar tu feedback',
        t('feedback_save_error_msg') || 'Hubo un problema al conectar con el servidor.',
        [
          { text: t('feedback_retry') || 'Reintentar', onPress: handleListo },
          {
            text: t('feedback_skip_anyway') || 'Saltar de todos modos',
            style: 'destructive',
            onPress: () => router.replace('/(app)/dashboard'),
          },
        ]
      )
    }
  }

  function handleCompartir() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    setShareOpen(true)
  }

  function handleSkip() {
    Alert.alert(
      t('feedback_skip_title'),
      t('feedback_skip_msg'),
      [
        { text: t('feedback_skip_cancel'), style: 'cancel' },
        { text: t('feedback_skip_confirm'), style: 'destructive', onPress: () => router.replace('/(app)/dashboard') },
      ]
    )
  }

  const currentStepCfg = STEP_CONFIG[step - 1]

  // ─────────────────────────────────────────────────────────────────────────────

  // Mientras no sepamos la config del coach (o si vamos a saltar el feedback),
  // mostramos solo el fondo: evita el flash del formulario antes de redirigir.
  if (feedbackOff !== false) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Close / skip row ── */}
        <View style={styles.closeRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.6}
            disabled={step >= 3}
            style={{ opacity: step < 3 ? 1 : 0 }}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 0 }}
          >
            <Text style={styles.closeBtnText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress bar ── */}
        <ProgressBar step={step} />

        {/* ── Animated content block ── */}
        <Animated.View
          style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}
        >
          {/* Step label */}
          <Text style={styles.stepLabel}>{t('feedback_step_label')} {step} {t('feedback_step_of')}</Text>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>{currentStepCfg.title}</Text>
            <Text style={styles.pageSubtitle}>{currentStepCfg.subtitle}</Text>
          </View>

          {/* ════════════ PASO 1 ════════════ */}
          {step === 1 && (
            <View style={styles.stepContent}>

              <Text style={styles.questionLabel}>{t('feedback_effort_q')}</Text>
              <View style={styles.optList}>
                {RPE_OPTIONS.map(opt => (
                  <OptionRow
                    key={opt.rpe}
                    icon={opt.icon}
                    label={t(opt.labelKey)}
                    color={opt.color}
                    selected={rpeChoice === opt.rpe}
                    onPress={() => setRpeChoice(opt.rpe)}
                    styles={styles}
                  />
                ))}
              </View>

              <Text style={[styles.questionLabel, { marginTop: 8 }]}>{t('feedback_body_q')}</Text>
              <View style={styles.optList}>
                {SENSACION_OPTIONS.map(opt => (
                  <OptionRow
                    key={opt.id}
                    icon={opt.icon}
                    label={t(opt.labelKey)}
                    color={opt.color}
                    selected={sensacion === opt.id}
                    onPress={() => selectSensacion(opt.id)}
                    styles={styles}
                  />
                ))}
              </View>

              {sensacion === 'molestia' && (
                <View style={styles.zonasCard}>
                  <Text style={styles.zonasTitle}>{t('feedback_pain_zones')}</Text>
                  <View style={styles.zonasGrid}>
                    {ZONAS_KEYS.map(({ id: zonaId, key }) => {
                      const on = zonasMolestia.includes(zonaId)
                      return (
                        <TouchableOpacity
                          key={zonaId}
                          style={[styles.zonaChip, on && styles.zonaChipOn]}
                          onPress={() => toggleZona(zonaId)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.zonaChipText, on && styles.zonaChipTextOn]}>
                            {t(key)}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )}

              <Text style={[styles.questionLabel, { marginTop: 8 }]}>{t('feedback_notes_q')}</Text>
              <View style={styles.notaCard}>
                <TextInput
                  style={[styles.notaInput, { color: colors.inkPrimary }]}
                  placeholder={t('feedback_notes_placeholder')}
                  placeholderTextColor={colors.inkMuted}
                  value={notas}
                  onChangeText={txt => setNotas(txt.slice(0, 140))}
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

          {/* ════════════ PASO 3 — Achievement + próxima sesión ════════════ */}
          {step === 3 && (
            <View style={styles.stepContent}>
              {logroLoading ? (
                <>
                  <Text style={styles.loadingLabel}>{t('feedback_generating_logro')}</Text>
                  <View style={styles.achievementCard}>
                    <SkeletonCircle styles={styles} />
                    <SkeletonLine width="55%" height={22} styles={styles} />
                    <SkeletonLine width="85%" height={12} styles={styles} />
                    <SkeletonLine width="70%" height={12} styles={styles} />
                  </View>
                </>
              ) : logro ? (
                <AchievementCard logro={logro} styles={styles} />
              ) : null}

              {proximaSesion && !logroLoading && (
                <NextSessionCard proximaSesion={proximaSesion} styles={styles} />
              )}

              {/* Fotos de la sesión (se guardan y aparecen en el historial) */}
              <SessionPhotos kind="gym" sessionId={Number(id)} editable />
            </View>
          )}

          {/* ── Buttons ── */}
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.primaryBtn, !canAdvance && styles.primaryBtnDisabled]}
              onPress={goNext}
              disabled={!canAdvance}
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
              <Text style={[styles.primaryBtnText, !canAdvance && { color: colors.inkMuted }]}>
                {t('feedback_btn_continue')}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.listoBtn}
                onPress={handleListo}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.accent, colors.accentLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.listoBtnText}>{t('feedback_done_btn')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.compartirBtn}
                onPress={handleCompartir}
                activeOpacity={0.75}
              >
                <Text style={styles.compartirBtnText}>{t('feedback_share_btn')}</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* ── Modal: tarjeta para compartir ── */}
      <Modal
        visible={shareOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShareOpen(false)}
      >
        <View style={styles.shareModalRoot}>
          <View style={[styles.shareModalClose, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => setShareOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
            >
              <Text style={styles.shareModalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.shareModalContent}
            showsVerticalScrollIndicator={false}
          >
            <WorkoutShareCard sessionType="gym" {...shareCardProps} />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
    scroll:  { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    // Close / skip row
    closeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      minHeight: 28,
    },
    closeBtnText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 28,
      color: c.inkMuted,
      lineHeight: 32,
    },

    // Step chrome
    stepLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.0, textTransform: 'uppercase',
      color: c.inkMuted, marginBottom: 18,
    },
    titleBlock: { marginBottom: 28, gap: 8 },
    pageTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 32,
      color: c.inkPrimary, letterSpacing: -0.8, lineHeight: 38,
    },
    pageSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkSecondary, lineHeight: 21,
    },
    stepContent: { gap: 12, marginBottom: 32 },

    // Question label
    questionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.0, textTransform: 'uppercase',
      color: c.inkMuted, marginBottom: 2,
    },

    // Loading label (step 2 + 3 skeletons)
    loadingLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
      color: c.inkMuted, textAlign: 'center', marginBottom: 16,
    },

    // Option rows
    optList: { gap: 8 },
    optRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 14,
    },
    optIconBox: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    optIcon: { fontSize: 20, lineHeight: 24 },
    optLabel: {
      flex: 1, fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14, lineHeight: 20, letterSpacing: -0.1,
    },
    optRadio: {
      width: 20, height: 20, borderRadius: 10,
      borderWidth: 1.5, borderColor: c.borderBright,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    optRadioDot: { width: 10, height: 10, borderRadius: 5 },

    // Zonas
    zonasCard: {
      backgroundColor: 'rgba(255,68,68,0.06)',
      borderWidth: 1, borderColor: 'rgba(255,68,68,0.25)',
      borderRadius: 16, padding: 16, gap: 12,
    },
    zonasTitle: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.0, textTransform: 'uppercase', color: c.red,
    },
    zonasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    zonaChip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1, borderColor: c.borderBright, backgroundColor: c.cardBg,
    },
    zonaChipOn: { backgroundColor: 'rgba(255,68,68,0.15)', borderColor: 'rgba(255,68,68,0.5)' },
    zonaChipText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },
    zonaChipTextOn: { color: c.red, fontFamily: 'SpaceGrotesk-Medium' },

    // Nota
    notaCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 14, gap: 8,
    },
    notaInput: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 22, minHeight: 60,
    },
    notaCounter: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.4,
      color: c.inkMuted, textAlign: 'right',
    },

    // ── Step 2 — Trainer summary ──────────────────────────────────────────────
    summaryCard: {
      flexDirection: 'row',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, overflow: 'hidden', minHeight: 180,
    },
    summaryAccentBorder: {
      width: 3, backgroundColor: c.accent, borderRadius: 3,
      margin: 12, marginRight: 0, alignSelf: 'stretch',
    },
    summaryInner: { flex: 1, padding: 16, gap: 12 },
    summaryHeaderLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      letterSpacing: 1.0, textTransform: 'uppercase', color: c.accent,
    },
    summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.borderDefault },
    decisionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    decisionIconBox: {
      width: 32, height: 32, borderRadius: 8, backgroundColor: c.glassBg,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
    },
    decisionIcon: { fontSize: 16, lineHeight: 20 },
    decisionText: {
      flex: 1, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, color: c.inkSecondary, lineHeight: 20, letterSpacing: -0.1,
    },
    evidenceBlock: {
      backgroundColor: 'rgba(79,140,255,0.06)', borderRadius: 12, padding: 14, gap: 6,
    },
    evidenceLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 8,
      letterSpacing: 1.0, textTransform: 'uppercase', color: c.accentLight,
    },
    evidenceText: {
      fontFamily: 'InstrumentSerif-Italic', fontSize: 13, color: c.inkSecondary, lineHeight: 20,
    },
    evidenceRef: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.2,
    },
    summaryEmptyText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, lineHeight: 20 },

    // ── Step 3 — Achievement card ─────────────────────────────────────────────
    achievementCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 24, padding: 32, alignItems: 'center', gap: 16,
    },
    achievementIconCircle: {
      width: 80, height: 80, borderRadius: 40,
      alignItems: 'center', justifyContent: 'center',
    },
    achievementIconEmoji: { fontSize: 40, lineHeight: 48 },
    achievementTitulo: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color: c.inkPrimary,
      letterSpacing: -0.5, textAlign: 'center', lineHeight: 28,
    },
    achievementDesc: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: c.inkSecondary,
      textAlign: 'center', lineHeight: 22, letterSpacing: -0.1,
    },

    // ── Step 3 — Next session card ────────────────────────────────────────────
    nextSessionCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    },
    nextSessionLeft: { flex: 1, gap: 4 },
    nextSessionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      letterSpacing: 1.0, textTransform: 'uppercase', color: c.inkMuted,
    },
    nextSessionTipo: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15,
      color: c.inkPrimary, letterSpacing: -0.2, lineHeight: 20,
    },
    nextSessionDia: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkSecondary },
    agendarTag: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    agendarTagText: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 10,
      color: c.inkMuted, letterSpacing: 0.5, textTransform: 'uppercase',
    },

    // ── Skeleton ──────────────────────────────────────────────────────────────
    skeletonLine: { backgroundColor: c.borderBright, borderRadius: 4 },
    skeletonCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.borderBright },

    // ── Buttons ───────────────────────────────────────────────────────────────
    primaryBtn: {
      borderRadius: 16, paddingVertical: 16,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', minHeight: 54,
    },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#fff', letterSpacing: -0.2,
    },
    listoBtn: {
      borderRadius: 16, paddingVertical: 16,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', minHeight: 54,
    },
    listoBtnText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#fff', letterSpacing: -0.2,
    },
    compartirBtn: {
      borderRadius: 16, paddingVertical: 14,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: c.borderBright,
      backgroundColor: 'transparent', minHeight: 50,
      marginTop: 8,
    },
    compartirBtnText: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: c.inkMuted, letterSpacing: -0.1,
    },

    // ── Share card modal ──────────────────────────────────────────────────────
    shareModalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
    shareModalClose: {
      flexDirection: 'row', justifyContent: 'flex-end',
      paddingHorizontal: 20, paddingBottom: 4,
    },
    shareModalCloseText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 32, color: '#ffffff', lineHeight: 36,
    },
    shareModalContent: {
      flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24,
    },
  })
}
