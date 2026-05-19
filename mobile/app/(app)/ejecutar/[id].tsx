import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
import { router, useLocalSearchParams } from 'expo-router'
import { COLORS, FASES } from '../../../lib/colors'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'

// ─── Discipline selection ─────────────────────────────────────────────────────

const TIPO_ENTRENO = [
  { id: 'musculacion', label: 'Musculación / Fuerza',      sub: 'Hipertrofia y progresión de carga',  color: '#4f8cff', bg: 'rgba(79,140,255,0.1)',   border: 'rgba(79,140,255,0.40)'  },
  { id: 'cardio',      label: 'Running / Cardio',          sub: 'Trabajo aeróbico y resistencia',      color: '#ff8c42', bg: 'rgba(255,140,66,0.1)',   border: 'rgba(255,140,66,0.40)'  },
  { id: 'movilidad',   label: 'Movilidad / Flexibilidad',  sub: 'Rangos articulares y recuperación',   color: '#32c896', bg: 'rgba(50,200,150,0.1)',   border: 'rgba(50,200,150,0.40)'  },
  { id: 'hiit',        label: 'HIIT / Funcional',          sub: 'Alta intensidad y patrones compuestos', color: '#ffaa32', bg: 'rgba(255,170,50,0.1)', border: 'rgba(255,170,50,0.40)'  },
] as const

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
  const mediaStyles = React.useMemo(() => makeMediaStyles(colors), [colors])

  const hasGif = !!demo?.gif_url
  const hasImage = !!demo?.imagen_url

  const handleYouTube = () => {
    if (demo?.youtube_url) Linking.openURL(demo.youtube_url)
  }

  return (
    <View style={mediaStyles.card}>
      {/* Media area */}
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
          <Text style={mediaStyles.noMediaHint}>Sin demo disponible</Text>
        </View>
      )}

      {/* YouTube link */}
      <TouchableOpacity style={mediaStyles.ytRow} onPress={handleYouTube}>
        <Text style={mediaStyles.ytIcon}>▶</Text>
        <Text style={[mediaStyles.ytText, { color: faseColor }]}>Ver técnica en YouTube →</Text>
      </TouchableOpacity>
    </View>
  )
}

function makeMediaStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.cardBg,
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
  const size = 180
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? seconds / total : 0
  const offset = circumference - progress * circumference

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.borderDefault}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Center text - rotated back so it reads normally */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 36, color: colors.inkPrimary }}>
          {formatTime(seconds)}
        </Text>
        <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: colors.inkMuted, letterSpacing: 2, textTransform: 'uppercase' }}>
          descanso
        </Text>
      </View>
    </View>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EjecutarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [phase, setPhase] = useState<'seleccion' | 'training'>('seleccion')
  const [tipoDisciplina, setTipoDisciplina] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [flatList, setFlatList] = useState<FlatEjercicio[]>([])
  const [completed, setCompleted] = useState(false)

  // Demo media
  const [currentDemo, setCurrentDemo] = useState<DemoMedia | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const demoCacheRef = useRef<Record<string, DemoMedia>>({})

  // Execution state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState<'ejercicio' | 'descanso'>('ejercicio')
  const [timerSegundos, setTimerSegundos] = useState(0)
  const [timerTotal, setTimerTotal] = useState(0)
  const [timerActivo, setTimerActivo] = useState(false)
  // seriesCompletadas: key = globalIndex, value = number of series completed
  const [seriesCompletadas, setSeriesCompletadas] = useState<Record<number, number>>({})

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

    setDemoLoading(true)
    setCurrentDemo(null)
    apiGet(`/api/ejercicio-demo/?nombre=${encodeURIComponent(ej.nombre)}`)
      .then((data: DemoMedia) => {
        demoCacheRef.current[ej.nombre] = data
        setCurrentDemo(data)
      })
      .catch(() => {
        setCurrentDemo({ emoji: '🏋️', gif_url: '', imagen_url: '', youtube_url: '' })
      })
      .finally(() => setDemoLoading(false))
  }, [currentIndex, flatList])

  // ── Timer ───────────────────────────────────────────────────────────────────

  const advanceExercise = useCallback(() => {
    setCurrentIndex(prev => {
      const nextIndex = prev + 1
      if (nextIndex >= flatList.length) {
        setCompleted(true)
        return prev
      }
      return nextIndex
    })
    setMode('ejercicio')
    setTimerActivo(false)
  }, [flatList.length])

  useEffect(() => {
    // Re-creating the interval on every tick caused timer drift; create once
    // per active rest period and let the functional updater drive the count.
    if (!timerActivo) return
    intervalRef.current = setInterval(() => {
      setTimerSegundos(prev => {
        if (prev <= 1) {
          setTimerActivo(false)
          advanceExercise()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timerActivo, advanceExercise])

  // ── Series logic ────────────────────────────────────────────────────────────

  const completarSerie = () => {
    const ej = flatList[currentIndex]
    if (!ej) return

    const done = (seriesCompletadas[ej.globalIndex] ?? 0) + 1
    setSeriesCompletadas(prev => ({ ...prev, [ej.globalIndex]: done }))

    if (done >= ej.series) {
      // All series done → rest
      const descanso = ej.descanso_segundos || 60
      setTimerSegundos(descanso)
      setTimerTotal(descanso)
      setMode('descanso')
      setTimerActivo(true)
    }
  }

  const skipDescanso = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerActivo(false)
    advanceExercise()
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleSalir = () => {
    Alert.alert(
      'Salir del entrenamiento',
      '¿Seguro que quieres salir? El progreso se perderá.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Salir',
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
    setCurrentIndex(prev => prev - 1)
  }

  // ── Derived current exercise ────────────────────────────────────────────────

  const currentEj = flatList[currentIndex]
  const seriesDone = currentEj ? (seriesCompletadas[currentEj.globalIndex] ?? 0) : 0
  const rir = currentEj ? (10 - currentEj.rpe_sugerido).toFixed(0) : '—'
  const faseStyle = currentEj ? getFaseStyle(currentEj.faseNombre) : { color: colors.accent, label: '' }
  const nextEj = flatList[currentIndex + 1]

  // ─────────────────────────────────────────────────────────────────────────────

  // ── Phase 1: Discipline selection ────────────────────────────────────────────
  if (phase === 'seleccion') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginBottom: 28 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: colors.inkMuted, letterSpacing: 0.5 }}>
              ← Volver
            </Text>
          </TouchableOpacity>

          <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: colors.accent, letterSpacing: 2, marginBottom: 12 }}>
            ANTES DE EMPEZAR
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 30, color: colors.inkPrimary, letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 }}>
            ¿Qué vas a{'\n'}entrenar hoy?
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: colors.inkMuted, lineHeight: 21, marginBottom: 32, fontStyle: 'italic' }}>
            Esto permite adaptar métricas y seguimiento
          </Text>

          <View style={{ gap: 10 }}>
            {TIPO_ENTRENO.map(opt => {
              const on = tipoDisciplina === opt.id
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.82}
                  onPress={() => setTipoDisciplina(opt.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: on ? opt.bg : colors.cardBg,
                    borderWidth: on ? 1.5 : 1,
                    borderColor: on ? opt.border : colors.borderDefault,
                    borderRadius: 18, overflow: 'hidden', minHeight: 76,
                  }}
                >
                  <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: on ? opt.color : 'transparent' }} />
                  <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: 18 }}>
                    <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: on ? opt.color : colors.inkPrimary, lineHeight: 22 }}>
                      {opt.label}
                    </Text>
                    <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: on ? opt.color : colors.inkMuted, lineHeight: 17, marginTop: 3, opacity: on ? 0.8 : 1 }}>
                      {opt.sub}
                    </Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                    borderColor: on ? opt.color : colors.borderBright,
                    alignItems: 'center', justifyContent: 'center', marginRight: 20,
                  }}>
                    {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: opt.color }} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={{ marginTop: 32 }}>
            <TouchableOpacity
              activeOpacity={tipoDisciplina ? 0.88 : 1}
              disabled={!tipoDisciplina}
              onPress={() => setPhase('training')}
              style={{ borderRadius: 14, overflow: 'hidden', opacity: tipoDisciplina ? 1 : 0.3 }}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: '#ffffff', letterSpacing: 0.3 }}>
                  Comenzar entrenamiento
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <Text style={styles.loadingText}>Cargando sesión...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
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
        <Text style={styles.completionTitle}>¡Sesión completada!</Text>
        <Text style={styles.completionSubtitle}>
          {sesion?.titulo ?? 'Gran trabajo hoy'}
        </Text>
        <TouchableOpacity
          style={styles.feedbackBtn}
          onPress={() => router.replace(`/(app)/feedback/${id}`)}
        >
          <Text style={styles.feedbackBtnText}>Dar feedback →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!currentEj) return null

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* Progress bar */}
      <ProgressBar current={currentIndex} total={flatList.length} />

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={handleAnterior}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.navBtnText, currentIndex === 0 && { color: colors.inkMuted }]}>
            ← ANT
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
          <Text style={[styles.navBtnText, { color: colors.red }]}>SALIR</Text>
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
            {/* Exercise name */}
            <Text style={styles.ejercicioNombre}>{currentEj.nombre}</Text>

            {/* Demo media */}
            <MediaCard
              demo={currentDemo}
              loading={demoLoading}
              faseColor={faseStyle.color}
            />

            {/* Technical note */}
            {currentEj.notas ? (
              <View style={styles.notaCard}>
                <Text style={styles.notaLabel}>NOTA TÉCNICA</Text>
                <Text style={styles.notaText}>{currentEj.notas}</Text>
              </View>
            ) : null}

            {/* Series info card */}
            <View style={[styles.serieCard, { borderColor: faseStyle.color + '40' }]}>
              <View style={styles.serieHeader}>
                <Text style={styles.serieTitle}>
                  Serie{' '}
                  <Text style={{ color: faseStyle.color }}>
                    {Math.min(seriesDone + 1, currentEj.series)}
                  </Text>
                  /{currentEj.series}
                </Text>
              </View>
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
                <Text style={styles.completarBtnText}>
                  Completar serie {seriesDone + 1}/{currentEj.series}
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.allSeriesDoneCard}>
                  <Text style={styles.allSeriesDoneText}>✓ Todas las series completadas</Text>
                </View>
                <TouchableOpacity
                  style={[styles.completarBtn, { backgroundColor: faseStyle.color, marginTop: 10 }]}
                  onPress={advanceExercise}
                >
                  <Text style={styles.completarBtnText}>
                    {currentIndex + 1 < flatList.length ? 'Siguiente ejercicio →' : 'Finalizar sesión →'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // ── Rest mode ─────────────────────────────────────────────────────
          <View style={styles.descansoContainer}>
            <Text style={styles.descansoLabel}>DESCANSO</Text>

            <CircularTimer
              seconds={timerSegundos}
              total={timerTotal}
              color={faseStyle.color}
            />

            {nextEj ? (
              <View style={styles.nextEjCard}>
                <Text style={styles.nextEjLabel}>SIGUIENTE EJERCICIO</Text>
                <Text style={styles.nextEjNombre}>{nextEj.nombre}</Text>
                <Text style={styles.nextEjDetail}>
                  {nextEj.series} series · {nextEj.repeticiones} reps
                </Text>
              </View>
            ) : (
              <View style={styles.nextEjCard}>
                <Text style={styles.nextEjLabel}>DESPUÉS DEL DESCANSO</Text>
                <Text style={styles.nextEjNombre}>¡Último ejercicio! 💪</Text>
              </View>
            )}

            <TouchableOpacity style={styles.skipBtn} onPress={skipDescanso}>
              <Text style={styles.skipBtnText}>Saltar descanso →</Text>
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
      marginTop: 48, // below status bar
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
      fontSize: 26,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      lineHeight: 32,
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
      gap: 28,
      paddingTop: 20,
    },
    descansoLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkMuted,
      letterSpacing: 3,
      textTransform: 'uppercase',
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
