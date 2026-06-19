import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
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
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
import { router, useLocalSearchParams } from 'expo-router'
import { COLORS, FASES } from '../../../lib/colors'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPost } from '../../../lib/api'
import { captureException } from '../../../lib/sentry'
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

function flattenEjercicios(fases: Fase[] | null | undefined): FlatEjercicio[] {
  const flat: FlatEjercicio[] = []
  let globalIndex = 0
  for (const fase of Array.isArray(fases) ? fases : []) {            // EJE-4: defensivo ante fases malformadas
    const faseStyle = getFaseStyle(fase?.nombre)
    for (const ej of Array.isArray(fase?.ejercicios) ? fase.ejercicios : []) {
      // EJE-6: omitir ejercicios sin nombre — el backend hace lo mismo al
      // persistir, así el índice del frontend (idx+1) coincide con SessionExercise.orden.
      if (!ej || !ej.nombre || !String(ej.nombre).trim()) continue
      flat.push({ ...ej, faseNombre: fase.nombre, faseColor: faseStyle.color, globalIndex })
      globalIndex++
    }
  }
  return flat
}


// ─── Detección de ejercicios de peso corporal ──────────────────────────────────
// Heurística conservadora: solo se considera "peso corporal" cuando el nombre del
// ejercicio coincide con un movimiento que casi nunca lleva carga externa Y no
// menciona ningún implemento con peso. Ante la duda, se deja el campo de peso
// editable (no se bloquea), para no romper el registro de ejercicios cargados.
const EQUIPO_CON_CARGA = [
  'mancuerna', 'barra', 'kettlebell', 'pesa rusa', 'disco', 'polea', 'cable',
  'máquina', 'maquina', 'lastr', 'goblet', 'landmine', 'smith', 'multipower',
  'con peso', 'con carga', 'press', 'remo', 'curl', 'jalón', 'jalon',
  'peso muerto', 'hip thrust',
]

const PESO_CORPORAL_KEYWORDS = [
  'flexion', 'flexión', 'push up', 'push-up', 'plancha', 'plank', 'burpee',
  'mountain climber', 'escalador', 'jumping jack', 'salto de tijera',
  'abdominal', 'crunch', 'encogimiento', 'superman', 'bird dog', 'perro de caza',
  'elevación de piernas', 'elevacion de piernas', 'elevación de rodillas',
  'elevacion de rodillas', 'rodillas al pecho', 'estiramiento', 'movilidad',
  'respiración', 'respiracion', 'gato', 'dominada', 'fondos', 'skipping',
  'talones al glúteo', 'talones al gluteo', 'saltar la cuerda', 'salto de cuerda',
  'comba', 'wall sit', 'sentadilla isométrica', 'sentadilla isometrica',
  'sentadilla al aire', 'sentadilla sin peso', 'air squat',
]

function esEjercicioPesoCorporal(ej: Ejercicio | null | undefined): boolean {
  if (!ej?.nombre) return false
  const n = String(ej.nombre).toLowerCase()
  if (EQUIPO_CON_CARGA.some(k => n.includes(k))) return false
  return PESO_CORPORAL_KEYWORDS.some(k => n.includes(k))
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
  defaultExpanded = false,
}: {
  demo: DemoMedia | null
  loading: boolean
  faseColor: string
  defaultExpanded?: boolean
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const mediaStyles = React.useMemo(() => makeMediaStyles(colors), [colors])
  // Principiantes ven las instrucciones desplegadas por defecto; intermedios y
  // avanzados las ven colapsadas. El usuario puede alternar libremente.
  const [expanded, setExpanded] = useState(defaultExpanded)

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
    <View style={[ratingStyles.wrap, { backgroundColor: colors.glassBg, borderColor: colors.borderDefault }]}>
      <View style={ratingStyles.headerRow}>
        <Text style={[ratingStyles.question, { color: colors.inkMuted }]}>¿CÓMO ESTUVO LA SERIE?</Text>
        <Text style={[ratingStyles.optional, { color: colors.inkFaint }]}>opcional</Text>
      </View>
      <View style={ratingStyles.row}>
        {DIFICULTAD_OPTS.map(opt => {
          const selected = value === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={[
                ratingStyles.btn,
                { borderColor: colors.borderDefault },
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  question: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  optional: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 1,
    fontStyle: 'italic',
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
  const HANDLE = 54, PAD = 4
  const maxX = Math.max(0, trackW - HANDLE - PAD * 2)

  // Sólo reclama el gesto cuando el arrastre es claramente HORIZONTAL — así el
  // ScrollView padre sigue manejando el scroll vertical, pero el slider gana el
  // gesto horizontal (antes el ScrollView lo robaba y se sentía "pegado").
  const wantsHorizontal = (gs: any) =>
    !doneRef.current && Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 3

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !doneRef.current,
    onMoveShouldSetPanResponder:  (_, gs) => wantsHorizontal(gs),
    onMoveShouldSetPanResponderCapture: (_, gs) => wantsHorizontal(gs),
    onPanResponderTerminationRequest: () => false,  // no ceder el gesto al scroll a mitad
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
      // Umbral más bajo (60%) → completar es más natural.
      if (x >= max * 0.6) {
        doneRef.current = true
        // useNativeDriver:false — el valor se mueve por setValue durante el gesto;
        // con driver nativo los setValue del JS se ignoran y el handle se quedaba pegado.
        Animated.timing(pan, { toValue: max, duration: 110, easing: Easing.out(Easing.ease), useNativeDriver: false })
          .start(() => onComplete())
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: false, tension: 140, friction: 9 }).start()
      }
    },
  })).current

  const labelOpacity = pan.interpolate({
    inputRange: [0, Math.max(40, maxX * 0.5)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const TRACK_H = 60
  return (
    <View
      style={{ height: TRACK_H, width: '88%', alignSelf: 'center', borderRadius: TRACK_H / 2, backgroundColor: `${color}18`, borderWidth: 1.5, borderColor: `${color}45`, overflow: 'hidden', justifyContent: 'center' }}
      onLayout={e => { const w = e.nativeEvent.layout.width; trackWRef.current = w; setTrackW(w) }}
    >
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', opacity: labelOpacity }}>
        <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color, letterSpacing: -0.2 }}>{label}</Text>
      </Animated.View>
      {trackW > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: (TRACK_H - HANDLE) / 2,
            left: PAD,
            width: HANDLE,
            height: HANDLE,
            borderRadius: HANDLE / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateX: pan }],
          }}
          {...panResponder.panHandlers}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color }]} />
          <LinearGradient
            colors={['rgba(255,255,255,0.32)', 'rgba(0,0,0,0.14)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: HANDLE / 2 - 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' }} />
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
  // Nivel del usuario — define si la demo de cada ejercicio arranca desplegada.
  const [nivel, setNivel] = useState<string | null>(null)

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
  const [focusedInput, setFocusedInput] = useState<'peso' | 'reps' | null>(null)
  const currentPesoRef = useRef('')
  const currentRepsRef = useRef('')
  const seriesLogRef = useRef<Record<number, Array<{ peso: string; reps: string; dificultad?: number }>>>({})

  // Percepción de dificultad por serie (se resetea al entrar al modo descanso)
  const [serieRating, setSerieRating] = useState<number | null>(null)
  const serieRatingRef = useRef<number | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restEndRef = useRef(0)   // EJE-5: timestamp objetivo del descanso (reloj de pared)
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // ── Fetch session ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await apiGet(`/api/sessions/${id}/`)
        const raw: Sesion = data.sesion ?? data.respuesta_ia ?? data
        const flat = flattenEjercicios(raw?.fases)
        if (flat.length === 0) {
          setError('La sesión no tiene ejercicios válidos. Genera una rutina nueva.')
          return
        }
        setSesion(raw)
        setFlatList(flat)
      } catch (err: any) {
        setError(err.message || 'Error cargando la sesión')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchSession()

    // Recuperar log persistido si la app fue matada a mitad de sesión
    async function recoverLog() {
      if (!id) return
      try {
        const saved = await AsyncStorage.getItem(`@pyfit/series_log_${id}`)
        if (!saved) return
        const recovered: Record<number, Array<{ peso: string; reps: string; dificultad?: number }>> = JSON.parse(saved)
        seriesLogRef.current = recovered
        // Reconstruir el conteo de series desde el log recuperado
        const counts: Record<number, number> = {}
        for (const [key, entries] of Object.entries(recovered)) {
          if (Array.isArray(entries)) counts[Number(key)] = entries.filter(Boolean).length
        }
        seriesCompletadasRef.current = counts
        setSeriesCompletadas(counts)
      } catch {
        // ignorar errores de recuperación — no bloquear la sesión
      }
    }
    recoverLog()
  }, [id])

  // ── Fetch nivel del usuario ──────────────────────────────────────────────────
  // Solo se usa para decidir el estado inicial de la demo (desplegada para
  // principiantes). Si falla, se mantiene el comportamiento colapsado por defecto.
  useEffect(() => {
    let cancelled = false
    apiGet('/api/profile/')
      .then((data: any) => { if (!cancelled) setNivel(data?.nivel ?? null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

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
      // Checkpoint anti-kill: persistir en AsyncStorage para que si iOS mata la app
      // se pueda recuperar el progreso al volver a abrir la sesión.
      AsyncStorage.setItem(
        `@pyfit/series_log_${id}`,
        JSON.stringify(seriesLogRef.current)
      ).catch(() => {})
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
    // EJE-5: reloj de pared — el valor se recalcula desde restEndRef en cada tick,
    // así el conteo sigue correcto aunque iOS suspenda/throttle el intervalo en
    // segundo plano (al volver, el siguiente tick corrige el valor). Sigue en
    // negativo (tiempo extra); el avance ocurre solo al deslizar el slider.
    const tick = () => setTimerSegundos(Math.round((restEndRef.current - Date.now()) / 1000))
    tick()
    intervalRef.current = setInterval(tick, 1000)
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
    restEndRef.current = Date.now() + descanso * 1000   // EJE-5: objetivo de reloj de pared
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

  // ── Save series log (al completar y al salir — EJE-2) ─────────────────────────

  const sendSeriesLog = useCallback(() => {
    if (!id) return
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
      apiPost(`/api/sessions/${id}/series-log/`, { log })
        .then(() => AsyncStorage.removeItem(`@pyfit/series_log_${id}`).catch(() => {}))
        .catch((err) => {
          captureException(err, { tags: { flow: 'series-log' } })
        })
    } else {
      AsyncStorage.removeItem(`@pyfit/series_log_${id}`).catch(() => {})
    }
  }, [flatList, id])

  useEffect(() => {
    if (completed) sendSeriesLog()
  }, [completed, sendSeriesLog])

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleSalir = () => {
    const hayProgreso = Object.values(seriesCompletadasRef.current).some(n => (n ?? 0) > 0)
    const botones: any[] = [{ text: t('ejecutar_exit_continue'), style: 'cancel' }]
    if (hayProgreso) {
      // EJE-3: si ya entrenó algo, ofrecer registrar feedback de la sesión parcial
      botones.push({
        text: 'Salir y dar feedback',
        onPress: () => {
          if (intervalRef.current) clearInterval(intervalRef.current)
          sendSeriesLog()                       // EJE-2: preservar peso/reps/dificultad
          router.replace(`/(app)/feedback/${id}`)
        },
      })
    }
    botones.push({
      text: t('ejecutar_exit_confirm'),
      style: 'destructive',
      onPress: () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (hayProgreso) sendSeriesLog()        // EJE-2: no perder el log al salir
        router.back()
      },
    })
    Alert.alert(t('ejecutar_exit_title'), t('ejecutar_exit_msg'), botones)
  }

  // EJE: interceptar el back de hardware (Android) para que dispare la misma
  // confirmación + guardado de progreso que el botón "SALIR", en vez de salir
  // directo perdiendo el log de series. Ref para no recapturar el listener.
  const handleSalirRef = useRef(handleSalir)
  handleSalirRef.current = handleSalir
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleSalirRef.current()
      return true   // consumir el evento — no navegar hasta confirmar
    })
    return () => sub.remove()
  }, [])

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
  const esPesoCorporal = esEjercicioPesoCorporal(currentEj)
  const seriesDone = currentEj ? (seriesCompletadas[currentEj.globalIndex] ?? 0) : 0
  const rir = currentEj ? (10 - currentEj.rpe_sugerido).toFixed(0) : '—'
  const faseStyle = currentEj ? getFaseStyle(currentEj.faseNombre) : { color: colors.accent, label: '' }
  const nextEj = flatList[currentIndex + 1]

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <ActivityIndicator color={colors.accent} size="large" />
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
              key={nivel ?? 'pending'}
              demo={currentDemo}
              loading={demoLoading}
              faseColor={faseStyle.color}
              defaultExpanded={nivel === 'principiante'}
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

            <TouchableOpacity
              style={styles.salirLinkBtn}
              onPress={handleSalir}
              activeOpacity={0.6}
            >
              <Text style={styles.salirLinkText}>Salir del entrenamiento</Text>
            </TouchableOpacity>
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
                {esPesoCorporal ? (
                  <View style={[styles.descansoInputInner, styles.descansoInputLocked]}>
                    <Text style={styles.descansoInputLockedText} numberOfLines={1}>
                      {t('ejecutar_bodyweight')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.descansoInputInner, focusedInput === 'peso' && { borderColor: faseStyle.color, backgroundColor: `${faseStyle.color}0D` }]}>
                    <TextInput
                      style={styles.descansoInput}
                      value={currentPeso}
                      onChangeText={v => { setCurrentPeso(v); currentPesoRef.current = v }}
                      onFocus={() => setFocusedInput('peso')}
                      onBlur={() => setFocusedInput(null)}
                      placeholder="—"
                      placeholderTextColor={colors.inkMuted}
                      keyboardType="decimal-pad"
                      maxLength={6}
                      returnKeyType="done"
                    />
                    <Text style={styles.descansoInputUnit}>kg</Text>
                  </View>
                )}
              </View>

              <View style={styles.descansoInputSep} />

              <View style={styles.descansoInputWrap}>
                <Text style={styles.descansoInputLabel}>{t('ejecutar_reps')}</Text>
                <View style={[styles.descansoInputInner, focusedInput === 'reps' && { borderColor: faseStyle.color, backgroundColor: `${faseStyle.color}0D` }]}>
                  <TextInput
                    style={styles.descansoInput}
                    value={currentReps}
                    onChangeText={v => { setCurrentReps(v); currentRepsRef.current = v }}
                    onFocus={() => setFocusedInput('reps')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="—"
                    placeholderTextColor={colors.inkMuted}
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

            <TouchableOpacity
              style={styles.salirLinkBtn}
              onPress={handleSalir}
              activeOpacity={0.6}
            >
              <Text style={styles.salirLinkText}>Salir del entrenamiento</Text>
            </TouchableOpacity>
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
      paddingVertical: 10,
      paddingHorizontal: 16,
      minHeight: 44,
      justifyContent: 'center',
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
    descansoInputLocked: {
      justifyContent: 'center',
      backgroundColor: c.cardBg,
      borderColor: c.borderDefault,
    },
    descansoInputLockedText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
      color: c.inkSecondary,
      textAlign: 'center',
      letterSpacing: -0.2,
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
      backgroundColor: c.inkPrimary,   // inverso: oscuro en claro, casi-blanco en dark
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 40,
    },
    feedbackBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: c.bg,
    },
    salirLinkBtn: {
      marginTop: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    salirLinkText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkMuted,
      textDecorationLine: 'underline',
    },
  })
}
