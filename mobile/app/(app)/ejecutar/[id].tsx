import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
import { router, useLocalSearchParams } from 'expo-router'
import { COLORS, FASES } from '../../../lib/colors'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPost } from '../../../lib/api'
import { useTranslation } from '../../../lib/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ejercicio {
  nombre: string
  series: number
  repeticiones: string
  descanso_segundos: number
  rpe_sugerido: number
  notas?: string
}

interface Fase {
  nombre: string
  duracion_minutos: number
  ejercicios: Ejercicio[]
}

interface FlatEjercicio extends Ejercicio {
  faseNombre: string
  faseColor: string
  globalIndex: number
}

interface Sesion {
  titulo: string
  objetivo_sesion: string
  rpe_target: number
  duracion_total: number
  fases: Fase[]
  nota_del_entrenador: string
}

// ─── Types (continued) ───────────────────────────────────────────────────────

interface DemoMedia {
  emoji: string
  gif_url: string
  imagen_url: string
  youtube_url: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFaseStyle(faseNombre: string) {
  const key = faseNombre as keyof typeof FASES
  return FASES[key] ?? { color: COLORS.accent, bg: 'rgba(79,140,255,0.1)', label: faseNombre.toUpperCase() }
}

function flattenEjercicios(fases: Fase[]): FlatEjercicio[] {
  const flat: FlatEjercicio[] = []
  let globalIndex = 0
  for (const fase of fases) {
    const faseStyle = getFaseStyle(fase.nombre)
    for (const ej of fase.ejercicios) {
      flat.push({ ...ej, faseNombre: fase.nombre, faseColor: faseStyle.color, globalIndex })
      globalIndex++
    }
  }
  return flat
}


function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}

// ─── Media Card ───────────────────────────────────────────────────────────────

function MediaCard({
  demo,
  loading,
  faseColor,
}: {
  demo: DemoMedia | null
  loading: boolean
  faseColor: string
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const mediaStyles = React.useMemo(() => makeMediaStyles(colors), [colors])
  const [expanded, setExpanded] = useState(false)

  const hasGif = !!demo?.gif_url
  const hasImage = !!demo?.imagen_url

  const handleYouTube = () => {
    if (demo?.youtube_url) Linking.openURL(demo.youtube_url)
  }

  return (
    <View style={mediaStyles.card}>
      {/* Toggle row — always visible */}
      <View style={mediaStyles.toggleRow}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }} onPress={() => setExpanded(v => !v)} activeOpacity={0.75}>
          <Text style={mediaStyles.toggleEmoji}>{demo?.emoji ?? '🏋️'}</Text>
          <Text style={[mediaStyles.toggleLabel, { color: faseColor }]}>
            {expanded ? t('ejecutar_demo_hide') : t('ejecutar_demo_show')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleYouTube} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[mediaStyles.ytInline, { color: faseColor }]}>▶ YouTube</Text>
        </TouchableOpacity>
      </View>

      {/* Expandable media area */}
      {expanded && (
        <>
          {loading ? (
            <View style={mediaStyles.placeholder}>
              <ActivityIndicator color={colors.inkMuted} size="small" />
            </View>
          ) : hasGif ? (
            <Image
              source={{ uri: demo!.gif_url }}
              style={mediaStyles.media}
              contentFit="cover"
              autoplay
              transition={200}
            />
          ) : hasImage ? (
            <Image
              source={{ uri: demo!.imagen_url }}
              style={mediaStyles.media}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={mediaStyles.placeholder}>
              <Text style={mediaStyles.emoji}>{demo?.emoji ?? '🏋️'}</Text>
              <Text style={mediaStyles.noMediaHint}>{t('ejecutar_no_demo')}</Text>
            </View>
          )}

          <TouchableOpacity style={mediaStyles.ytRow} onPress={handleYouTube}>
            <Text style={mediaStyles.ytIcon}>▶</Text>
            <Text style={[mediaStyles.ytText, { color: faseColor }]}>{t('ejecutar_youtube')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

// ─── Serie Rating Picker ──────────────────────────────────────────────────────

const DIFICULTAD_OPTS = [
  { value: 1, emoji: '😴', label: 'Muy fácil',   color: '#32c896' },
  { value: 2, emoji: '😊', label: 'Fácil',        color: '#7be07b' },
  { value: 3, emoji: '😤', label: 'Normal',        color: '#ffdd57' },
  { value: 4, emoji: '😓', label: 'Difícil',       color: '#ffaa32' },
  { value: 5, emoji: '🥵', label: 'Muy difícil',  color: '#ff4444' },
]

function SerieRatingPicker({
  value,
  onChange,
  colors,
}: {
  value: number | null
  onChange: (v: number) => void
  colors: Colors
}) {
  return (
    <View style={ratingStyles.wrap}>
      <Text style={[ratingStyles.question, { color: colors.inkMuted }]}>¿CÓMO ESTUVO LA SERIE?</Text>
      <View style={ratingStyles.row}>
        {DIFICULTAD_OPTS.map(opt => {
          const selected = value === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.75}
              style={[
                ratingStyles.btn,
                selected && { backgroundColor: opt.color + '22', borderColor: opt.color },
              ]}
            >
              <Text style={ratingStyles.emoji}>{opt.emoji}</Text>
              <Text style={[
                ratingStyles.label,
                { color: selected ? opt.color : colors.inkFaint },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const ratingStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 12,
  },
  question: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
})

function makeMediaStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.cardBg,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    toggleEmoji: {
      fontSize: 20,
    },
    toggleLabel: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13,
      flex: 1,
    },
    ytInline: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    media: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: c.cardBg,
    },
    placeholder: {
      width: '100%',
      aspectRatio: 4 / 3,
      backgroundColor: c.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emoji: {
      fontSize: 40,
    },
    noMediaHint: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkFaint,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    ytRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    ytIcon: {
      fontSize: 10,
      color: c.inkMuted,
    },
    ytText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13,
    },
  })
}

// ─── Circular Timer ───────────────────────────────────────────────────────────

function CircularTimer({ seconds, total, color }: { seconds: number; total: number; color: string }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const size = 180
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Animated value for smooth progress (SVG props require useNativeDriver:false)
  const animOffset = useRef(new Animated.Value(circumference)).current
  const firstRender = useRef(true)

  useEffect(() => {
    const progress = total > 0 ? Math.max(0, seconds) / total : 0
    const target = circumference - progress * circumference
    if (firstRender.current) {
      animOffset.setValue(target)
      firstRender.current = false
      return
    }
    Animated.timing(animOffset, {
      toValue: target, duration: 1000,
      easing: Easing.linear, useNativeDriver: false,
    }).start()
  }, [seconds])

  const isOvertime = seconds <= 0
  const displayText = isOvertime ? `-${Math.abs(seconds)}` : formatTime(seconds)
  const ringColor  = isOvertime ? colors.red : color
  const textColor  = isOvertime ? colors.red : colors.inkPrimary

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={colors.borderDefault} strokeWidth={strokeWidth} />
        <AnimatedCircle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={ringColor} strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={animOffset} strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 36, color: textColor }}>
          {displayText}
        </Text>
        <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: colors.inkMuted, letterSpacing: 2, textTransform: 'uppercase' }}>
          {isOvertime ? 'TIEMPO EXTRA' : t('ejecutar_rest_label')}
        </Text>
      </View>
    </View>
  )
}

// ─── Slider Button (descanso) ─────────────────────────────────────────────────

function SliderButton({ onComplete, label, color }: { onComplete: () => void; label: string; color: string }) {
  const pan       = useRef(new Animated.Value(0)).current
  const trackWRef = useRef(0)
  const [trackW, setTrackW] = useState(0)
  const doneRef   = useRef(false)
  const HANDLE = 60, PAD = 4

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !doneRef.current,
    onMoveShouldSetPanResponder:  (_, gs) => !doneRef.current && Math.abs(gs.dx) > 4,
    onPanResponderMove: (_, gs) => {
      if (doneRef.current) return
      const max = trackWRef.current - HANDLE - PAD * 2
      if (max <= 0) return
      pan.setValue(Math.max(0, Math.min(gs.dx, max)))
    },
    onPanResponderRelease: (_, gs) => {
      if (doneRef.current) return
      const max = trackWRef.current - HANDLE - PAD * 2
      if (max <= 0) return
      const x = Math.max(0, Math.min(gs.dx, max))
      if (x >= max * 0.72) {
        doneRef.current = true
        Animated.timing(pan, { toValue: max, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true })
          .start(() => onComplete())
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, tension: 150, friction: 10 }).start()
      }
    },
  })).current

  const labelOpacity = pan.interpolate({ inputRange: [0, 140], outputRange: [1, 0], extrapolate: 'clamp' })

  return (
    <View
      style={{ height: 64, borderRadius: 32, backgroundColor: `${color}18`, borderWidth: 1.5, borderColor: `${color}45`, overflow: 'hidden', justifyContent: 'center' }}
      onLayout={e => { const w = e.nativeEvent.layout.width; trackWRef.current = w; setTrackW(w) }}
    >
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', opacity: labelOpacity }}>
        <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color, letterSpacing: -0.2 }}>{label}</Text>
      </Animated.View>
      {trackW > 0 && (
        <Animated.View
          style={{
            position: 'absolute', top: PAD, left: PAD,
            width: HANDLE, height: 64 - PAD * 2, borderRadius: 32 - PAD,
            backgroundColor: color, alignItems: 'center', justifyContent: 'center',
            transform: [{ translateX: pan }],
          }}
          {...panResponder.panHandlers}
        >
          <Text style={{ color: '#000', fontSize: 22, lineHeight: 26 }}>›</Text>
        </Animated.View>
      )}
    </View>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total, topOffset = 0 }: { current: number; total: number; topOffset?: number }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0
  return (
    <View style={[styles.progressTrack, { marginTop: topOffset }]}>
      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EjecutarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [flatList, setFlatList] = useState<FlatEjercicio[]>([])
  const [completed, setCompleted] = useState(false)

  // Demo media
  const [currentDemo, setCurrentDemo] = useState<DemoMedia | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const demoCacheRef = useRef<Record<string, DemoMedia>>({})
  const demoReqIdRef = useRef(0)

  // Execution state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState<'ejercicio' | 'descanso'>('ejercicio')
  const [timerSegundos, setTimerSegundos] = useState(0)
  const [timerTotal, setTimerTotal] = useState(0)
  const [timerActivo, setTimerActivo] = useState(false)
  // seriesCompletadas: key = globalIndex, value = sets completed for that exercise
  const [seriesCompletadas, setSeriesCompletadas] = useState<Record<number, number>>({})
  const seriesCompletadasRef = useRef<Record<number, number>>({})

  // Per-set tracking
  const [currentPeso, setCurrentPeso] = useState('')
  const [currentReps, setCurrentReps] = useState('')
  const currentPesoRef = useRef('')
  const currentRepsRef = useRef('')
  const seriesLogRef = useRef<Record<number, Array<{ peso: string; reps: string; dificultad?: number }>>>({})

  // Percepción de dificultad por serie (se resetea al entrar al modo descanso)
  const [serieRating, setSerieRating] = useState<number | null>(null)
  const serieRatingRef = useRef<number | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // ── Fetch session ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await apiGet(`/api/sessions/${id}/`)
        const raw: Sesion = data.sesion ?? data.respuesta_ia ?? data
        setSesion(raw)
        setFlatList(flattenEjercicios(raw.fases))
      } catch (err: any) {
        setError(err.message || 'Error cargando la sesión')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchSession()
  }, [id])

  // ── Demo media fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    const ej = flatList[currentIndex]
    if (!ej) return

    const cached = demoCacheRef.current[ej.nombre]
    if (cached) {
      setCurrentDemo(cached)
      return
    }

    const reqId = ++demoReqIdRef.current
    setDemoLoading(true)
    setCurrentDemo(null)
    apiGet(`/api/ejercicio-demo/?nombre=${encodeURIComponent(ej.nombre)}`)
      .then((data: DemoMedia) => {
        if (reqId !== demoReqIdRef.current) return
        demoCacheRef.current[ej.nombre] = data
        setCurrentDemo(data)
      })
      .catch(() => {
        if (reqId !== demoReqIdRef.current) return
        setCurrentDemo({ emoji: '🏋️', gif_url: '', imagen_url: '', youtube_url: '' })
      })
      .finally(() => {
        if (reqId !== demoReqIdRef.current) return
        setDemoLoading(false)
      })
  }, [currentIndex, flatList])

  // ── Advance from rest (timer end or skip) ──────────────────────────────────

  const advanceFromRest = useCallback(() => {
    if (!mountedRef.current) return
    const ej = flatList[currentIndex]
    if (!ej) return
    const done = seriesCompletadasRef.current[ej.globalIndex] ?? 0

    // Persist log entry (peso, reps, dificultad) for the set just completed
    const setIdx = done - 1
    if (setIdx >= 0) {
      if (!seriesLogRef.current[ej.globalIndex]) seriesLogRef.current[ej.globalIndex] = []
      seriesLogRef.current[ej.globalIndex][setIdx] = {
        peso: currentPesoRef.current,
        reps: currentRepsRef.current,
        ...(serieRatingRef.current !== null ? { dificultad: serieRatingRef.current } : {}),
      }
    }

    // Reset inputs
    currentPesoRef.current = ''
    currentRepsRef.current = ''
    setCurrentPeso('')
    setCurrentReps('')

    // Reset rating for the next set
    serieRatingRef.current = null
    setSerieRating(null)

    // Clear timer
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setTimerActivo(false)

    if (done < ej.series) {
      // More sets to do in this exercise
      setMode('ejercicio')
    } else {
      // All sets done — move to next exercise
      const nextIndex = currentIndex + 1
      if (nextIndex >= flatList.length) {
        setCompleted(true)
      } else {
        setCurrentIndex(nextIndex)
        setMode('ejercicio')
      }
    }
  }, [flatList, currentIndex])

  // ── Timer ───────────────────────────────────────────────────────────────────
  // Keep a stable ref to advanceFromRest so the timer effect only depends on
  // timerActivo — not on flatList/currentIndex — preventing the interval from
  // restarting (and losing elapsed time) every time the exercise changes.
  const advanceFromRestRef = useRef(advanceFromRest)
  useEffect(() => { advanceFromRestRef.current = advanceFromRest }, [advanceFromRest])

  useEffect(() => {
    if (!timerActivo) return
    intervalRef.current = setInterval(() => {
      // Cuenta hacia atrás y continúa en negativo (tiempo extra).
      // El avance ocurre solo cuando el usuario desliza el slider.
      setTimerSegundos(prev => prev - 1)
    }, 1000)
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [timerActivo])

  // ── Series logic ────────────────────────────────────────────────────────────

  const completarSerie = () => {
    const ej = flatList[currentIndex]
    if (!ej) return

    const done = (seriesCompletadasRef.current[ej.globalIndex] ?? 0) + 1
    const nextMap = { ...seriesCompletadasRef.current, [ej.globalIndex]: done }
    seriesCompletadasRef.current = nextMap
    setSeriesCompletadas(nextMap)

    // Reset input fields and rating for this rest period
    currentPesoRef.current = ''
    currentRepsRef.current = ''
    setCurrentPeso('')
    setCurrentReps('')
    serieRatingRef.current = null
    setSerieRating(null)

    // Always enter rest after each set
    const descanso = ej.descanso_segundos || 60
    setTimerSegundos(descanso)
    setTimerTotal(descanso)
    setMode('descanso')
    setTimerActivo(true)
  }

  const skipDescanso = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setTimerActivo(false)
    advanceFromRest()
  }

  // ── Save series log on completion ────────────────────────────────────────────

  useEffect(() => {
    if (!completed || !id) return
    const log = flatList
      .map((ej, idx) => {
        const entries = seriesLogRef.current[ej.globalIndex] ?? []
        const series = entries
          .map((e, si) => ({
            serie: si + 1,
            peso: parseFloat(e?.peso) || null,
            reps: parseInt(e?.reps) || null,
            dificultad: e?.dificultad ?? null,
          }))
          .filter(s => s.peso !== null || s.reps !== null)
        return { orden: idx + 1, series }
      })
      .filter(e => e.series.length > 0)
    if (log.length > 0) {
      apiPost(`/api/sessions/${id}/series-log/`, { log }).catch((err) => {
        console.warn('[series-log] POST failed — training data not saved remotely:', err?.message)
      })
    }
  }, [completed]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleSalir = () => {
    Alert.alert(
      t('ejecutar_exit_title'),
      t('ejecutar_exit_msg'),
      [
        { text: t('ejecutar_exit_continue'), style: 'cancel' },
        {
          text: t('ejecutar_exit_confirm'),
          style: 'destructive',
          onPress: () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            router.back()
          },
        },
      ]
    )
  }

  const handleAnterior = () => {
    if (currentIndex === 0) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerActivo(false)
    setMode('ejercicio')
    const prevIndex = currentIndex - 1
    const prevEj = flatList[prevIndex]
    if (prevEj) {
      const next = { ...seriesCompletadasRef.current }
      delete next[prevEj.globalIndex]
      seriesCompletadasRef.current = next
      setSeriesCompletadas(next)
    }
    setCurrentIndex(prevIndex)
  }

  // ── Derived current exercise ────────────────────────────────────────────────

  const currentEj = flatList[currentIndex]
  const seriesDone = currentEj ? (seriesCompletadas[currentEj.globalIndex] ?? 0) : 0
  const rir = currentEj ? (10 - currentEj.rpe_sugerido).toFixed(0) : '—'
  const faseStyle = currentEj ? getFaseStyle(currentEj.faseNombre) : { color: colors.accent, label: '' }
  const nextEj = flatList[currentIndex + 1]

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <Text style={styles.loadingText}>{t('ejecutar_loading')}</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <Text style={styles.errorTitle}>{t('ejecutar_error')}</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('ejecutar_back')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Completion screen
  if (completed) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <Text style={styles.completionEmoji}>🎉</Text>
        <Text style={styles.completionTitle}>{t('ejecutar_complete_title')}</Text>
        <Text style={styles.completionSubtitle}>
          {sesion?.titulo ?? 'Gran trabajo hoy'}
        </Text>
        <TouchableOpacity
          style={styles.feedbackBtn}
          onPress={() => router.replace(`/(app)/feedback/${id}`)}
        >
          <Text style={styles.feedbackBtnText}>{t('ejecutar_feedback_btn')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!loading && !error && flatList.length === 0 && sesion) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={styles.errorTitle}>{t('ejecutar_error')}</Text>
          <Text style={styles.errorMsg}>Esta sesión no tiene ejercicios.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (!currentEj) return null

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* Progress bar — topOffset respects safe area (status bar) */}
      <ProgressBar current={currentIndex} total={flatList.length} topOffset={insets.top} />

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={handleAnterior}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.navBtnText, currentIndex === 0 && { color: colors.inkMuted }]}>
            ← {t('ejecutar_nav_prev')}
          </Text>
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Text style={[styles.navFase, { color: faseStyle.color }]} numberOfLines={1}>
            {'label' in faseStyle ? faseStyle.label : currentEj.faseNombre.toUpperCase()}
          </Text>
          <Text style={styles.navProgress}>
            {currentIndex + 1} / {flatList.length}
          </Text>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={handleSalir}>
          <Text style={[styles.navBtnText, { color: colors.red }]}>{t('ejecutar_nav_exit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'ejercicio' ? (
          // ── Exercise mode ─────────────────────────────────────────────────
          <View style={styles.ejercicioContainer}>
            {/* Exercise name — large and centered */}
            <Text style={styles.ejercicioNombre}>{currentEj.nombre}</Text>

            {/* Demo media */}
            <MediaCard
              demo={currentDemo}
              loading={demoLoading}
              faseColor={faseStyle.color}
            />

            {/* Technical note (instrucciones) */}
            {currentEj.notas ? (
              <View style={styles.notaCard}>
                <Text style={styles.notaLabel}>{t('ejecutar_tech_note')}</Text>
                <Text style={styles.notaText}>{currentEj.notas}</Text>
              </View>
            ) : null}

            {/* SERIE X/X — prominente entre las instrucciones y el card */}
            <View style={styles.serieXofXWrap}>
              <Text style={[styles.serieXofXNum, { color: faseStyle.color }]}>
                {Math.min(seriesDone + 1, currentEj.series)}
                <Text style={styles.serieXofXSlash}> / </Text>
                <Text style={styles.serieXofXTotal}>{currentEj.series}</Text>
              </Text>
              <Text style={styles.serieXofXLabel}>SERIE</Text>
            </View>

            {/* Series info card — solo stats, sin encabezado */}
            <View style={[styles.serieCard, { borderColor: faseStyle.color + '40' }]}>
              <View style={styles.serieStats}>
                <View style={styles.serieStat}>
                  <Text style={styles.serieStatValue}>{currentEj.repeticiones}</Text>
                  <Text style={styles.serieStatLabel}>reps</Text>
                </View>
                <View style={styles.serieStatSep} />
                <View style={styles.serieStat}>
                  <Text style={styles.serieStatValue}>RPE {currentEj.rpe_sugerido}</Text>
                  <Text style={styles.serieStatLabel}>esfuerzo</Text>
                </View>
                <View style={styles.serieStatSep} />
                <View style={styles.serieStat}>
                  <Text style={styles.serieStatValue}>RIR {rir}</Text>
                  <Text style={styles.serieStatLabel}>en reserva</Text>
                </View>
                <View style={styles.serieStatSep} />
                <View style={styles.serieStat}>
                  <Text style={styles.serieStatValue}>{currentEj.descanso_segundos}s</Text>
                  <Text style={styles.serieStatLabel}>descanso</Text>
                </View>
              </View>
            </View>

            {/* Series dots */}
            <View style={styles.seriesDots}>
              {Array.from({ length: currentEj.series }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.serieDot,
                    i < seriesDone
                      ? { backgroundColor: faseStyle.color, borderColor: faseStyle.color }
                      : { backgroundColor: 'transparent', borderColor: colors.borderDefault },
                  ]}
                />
              ))}
            </View>

            {/* CTA */}
            {seriesDone < currentEj.series ? (
              <TouchableOpacity
                style={[styles.completarBtn, { backgroundColor: faseStyle.color }]}
                onPress={completarSerie}
              >
                <Text style={styles.completarBtnText}>LISTA LA SERIE</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.allSeriesDoneCard}>
                  <Text style={styles.allSeriesDoneText}>✓ {t('ejecutar_all_done')}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.completarBtn, { backgroundColor: faseStyle.color, marginTop: 10 }]}
                  onPress={advanceFromRest}
                >
                  <Text style={styles.completarBtnText}>
                    {currentIndex + 1 < flatList.length ? t('ejecutar_next_btn') : t('ejecutar_finish_btn')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // ── Rest mode ─────────────────────────────────────────────────────
          <View style={styles.descansoContainer}>
            {/* Serie completed label */}
            <Text style={[styles.descansoSerieLabel, { color: faseStyle.color }]}>
              SERIE {seriesDone} / {currentEj.series} COMPLETADA
            </Text>

            <CircularTimer
              seconds={timerSegundos}
              total={timerTotal}
              color={faseStyle.color}
            />

            {/* Weight & reps inputs */}
            <View style={styles.descansoInputRow}>
              <View style={styles.descansoInputWrap}>
                <Text style={styles.descansoInputLabel}>{t('ejecutar_weight')}</Text>
                <View style={styles.descansoInputInner}>
                  <TextInput
                    style={styles.descansoInput}
                    value={currentPeso}
                    onChangeText={v => { setCurrentPeso(v); currentPesoRef.current = v }}
                    placeholder="—"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    returnKeyType="done"
                  />
                  <Text style={styles.descansoInputUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.descansoInputSep} />

              <View style={styles.descansoInputWrap}>
                <Text style={styles.descansoInputLabel}>{t('ejecutar_reps')}</Text>
                <View style={styles.descansoInputInner}>
                  <TextInput
                    style={styles.descansoInput}
                    value={currentReps}
                    onChangeText={v => { setCurrentReps(v); currentRepsRef.current = v }}
                    placeholder="—"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="number-pad"
                    maxLength={3}
                    returnKeyType="done"
                  />
                  <Text style={styles.descansoInputUnit}>reps</Text>
                </View>
              </View>
            </View>

            {/* ¿Cómo estuvo la serie? — escala de dificultad */}
            <SerieRatingPicker
              value={serieRating}
              onChange={v => { serieRatingRef.current = v; setSerieRating(v) }}
              colors={colors}
            />

            {/* Next up card */}
            {seriesDone < currentEj.series ? (
              <View style={styles.nextEjCard}>
                <Text style={styles.nextEjLabel}>{t('ejecutar_next_label')}</Text>
                <Text style={styles.nextEjNombre}>{currentEj.nombre}</Text>
                <Text style={styles.nextEjDetail}>
                  Serie {seriesDone + 1} · {currentEj.repeticiones} reps · RPE {currentEj.rpe_sugerido}
                </Text>
              </View>
            ) : nextEj ? (
              <View style={styles.nextEjCard}>
                <Text style={styles.nextEjLabel}>{t('ejecutar_next_exercise')}</Text>
                <Text style={styles.nextEjNombre}>{nextEj.nombre}</Text>
                <Text style={styles.nextEjDetail}>
                  {nextEj.series} series · {nextEj.repeticiones} reps
                </Text>
              </View>
            ) : (
              <View style={styles.nextEjCard}>
                <Text style={styles.nextEjLabel}>{t('ejecutar_after_rest')}</Text>
                <Text style={styles.nextEjNombre}>{t('ejecutar_last_exercise')}</Text>
              </View>
            )}

            <View style={{ width: '100%' }}>
              <SliderButton
                onComplete={skipDescanso}
                label="Listo, sigamos"
                color={faseStyle.color}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
      top: 0,
      left: 0,
      right: 0,
      height: 400,
    },
    loadingText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 16,
      color: c.inkSecondary,
    },
    errorTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      color: c.inkPrimary,
      marginBottom: 8,
    },
    errorMsg: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    backButton: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 28,
    },
    backButtonText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      color: c.inkPrimary,
    },

    // Progress bar
    progressTrack: {
      height: 3,
      backgroundColor: c.borderDefault,
      marginTop: 0,
    },
    progressFill: {
      height: 3,
      backgroundColor: c.accent,
      borderRadius: 2,
    },

    // Nav
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
    },
    navBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    navBtnDisabled: {
      opacity: 0.3,
    },
    navBtnText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkSecondary,
      letterSpacing: 1,
    },
    navCenter: {
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: 8,
    },
    navFase: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    navProgress: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      color: c.inkMuted,
      marginTop: 1,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 48,
    },

    // Exercise mode
    ejercicioContainer: {
      gap: 16,
    },
    ejercicioNombre: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 32,
      color: c.inkPrimary,
      letterSpacing: -0.8,
      lineHeight: 38,
      textAlign: 'center',
    },
    serieXofXWrap: {
      alignItems: 'center',
      paddingVertical: 6,
    },
    serieXofXNum: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 52,
      letterSpacing: -2,
      lineHeight: 56,
    },
    serieXofXSlash: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 36,
      letterSpacing: -1,
    },
    serieXofXTotal: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 36,
      letterSpacing: -1,
    },
    serieXofXLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    notaCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 14,
      gap: 6,
    },
    notaLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    notaText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 20,
    },
    serieCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 18,
      backgroundColor: c.cardBg,
    },
    serieHeader: {
      marginBottom: 14,
    },
    serieTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.inkPrimary,
      letterSpacing: -0.3,
    },
    serieStats: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    serieStat: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    serieStatValue: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 14,
      color: c.inkPrimary,
    },
    serieStatLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    serieStatSep: {
      width: 1,
      height: 28,
      backgroundColor: c.borderDefault,
    },
    seriesDots: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    serieDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1.5,
    },
    completarBtn: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    completarBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: '#000',
      letterSpacing: -0.2,
    },
    allSeriesDoneCard: {
      backgroundColor: 'rgba(50,200,150,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(50,200,150,0.3)',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    allSeriesDoneText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      color: c.green,
    },

    // Rest mode
    descansoContainer: {
      alignItems: 'center',
      gap: 24,
      paddingTop: 20,
    },
    descansoSerieLabel: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    descansoInputRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 16,
    },
    descansoInputWrap: {
      flex: 1,
      gap: 8,
      alignItems: 'center',
    },
    descansoInputLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    descansoInputInner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
      width: '100%',
    },
    descansoInput: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      color: c.inkPrimary,
      flex: 1,
      textAlign: 'center',
      letterSpacing: -0.5,
      padding: 0,
    },
    descansoInputUnit: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 0.5,
    },
    descansoInputSep: {
      width: 1,
      backgroundColor: c.borderDefault,
      alignSelf: 'stretch',
    },
    nextEjCard: {
      width: '100%',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 16,
      padding: 16,
      gap: 4,
    },
    nextEjLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    nextEjNombre: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      color: c.inkPrimary,
      marginTop: 2,
    },
    nextEjDetail: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkMuted,
    },
    skipBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      color: c.inkSecondary,
    },

    // Completion
    completionEmoji: {
      fontSize: 64,
      marginBottom: 16,
    },
    completionTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      textAlign: 'center',
      marginBottom: 8,
    },
    completionSubtitle: {
      fontFamily: 'InstrumentSerif-Italic',
      fontSize: 16,
      color: c.inkSecondary,
      textAlign: 'center',
      marginBottom: 36,
    },
    feedbackBtn: {
      backgroundColor: c.white,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 40,
    },
    feedbackBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: c.bg,
    },
  })
}
