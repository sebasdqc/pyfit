import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
import { router } from 'expo-router'
import { COLORS, FASES, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPost } from '../../../lib/api'

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

interface Sesion {
  titulo: string
  objetivo_sesion: string
  rpe_target: number
  duracion_total: number
  fases: Fase[]
  nota_del_entrenador: string
}

interface SesionResponse {
  sesion_id: string | number
  sesion: Sesion
}

interface CheckinData {
  id: number
  estado_fisico:       number | null
  estado_animo:        number
  duracion_disponible: number
  foco_entrenamiento:  string[]
}

// ─── Checkin chip helpers ─────────────────────────────────────────────────────

type Chip = { icon: string; label: string; color: string }

function fisicoChip(v: number | null): Chip | null {
  const map: Record<number, Chip> = {
    4: { icon: '⚡', label: 'Fresco',    color: '#32c896' },
    3: { icon: '👍', label: 'Bien',      color: '#4f8cff' },
    2: { icon: '😮‍💨', label: 'Pesado',    color: '#ffaa32' },
    1: { icon: '⚠️', label: 'Molestia',  color: '#ff6b6b' },
  }
  return v != null ? (map[v] ?? null) : null
}

function animoChip(v: number): Chip | null {
  const map: Record<number, Chip> = {
    5: { icon: '🎯', label: 'Enfocado',  color: '#32c896' },
    3: { icon: '😐', label: 'Normal',    color: '#4f8cff' },
    2: { icon: '💭', label: 'Distraído', color: '#ffaa32' },
    1: { icon: '😴', label: 'Agotado',   color: '#ff6b6b' },
  }
  return map[v] ?? null
}

function tiempoChip(v: number): Chip {
  return { icon: '⏱', label: `${v} min`, color: 'rgba(255,255,255,0.55)' }
}

function intencionChip(foco: string[]): Chip | null {
  const map: Record<string, Chip> = {
    descargar: { icon: '💥', label: 'Descargar',   color: '#ffaa32' },
    moverme:   { icon: '🚶', label: 'Moverme',     color: '#32c896' },
    serio:     { icon: '💪', label: 'En serio',    color: '#4f8cff' },
    recuperar: { icon: '🌊', label: 'Recuperarme', color: '#6ce5ff' },
  }
  return foco?.[0] ? (map[foco[0]] ?? null) : null
}

function buildCheckinChips(c: CheckinData): Chip[] {
  return [
    fisicoChip(c.estado_fisico),
    animoChip(c.estado_animo),
    tiempoChip(c.duracion_disponible),
    intencionChip(c.foco_entrenamiento),
  ].filter(Boolean) as Chip[]
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function formatDateES(): string {
  const d = new Date()
  const DAYS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

// ─── Ring constants ───────────────────────────────────────────────────────────

const RING_R    = 62
const RING_SIZE = 144
const RING_SW   = 6
const RING_CIRC = 2 * Math.PI * RING_R   // ≈ 389.6

const LOAD_STEPS = [
  { title: 'Construyendo tu rutina...', subtitle: 'Analizando tu checkin de hoy' },
  { title: 'Revisando tu historial...', subtitle: 'Últimas semanas de entrenamiento' },
  { title: 'Calculando carga óptima...', subtitle: 'Basado en tu progresión reciente' },
  { title: 'Listo.',                    subtitle: 'Tu entrenador preparó algo para ti' },
]

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen({ apiDone, onReady }: { apiDone: boolean; onReady: () => void }) {
  const [step, setStep] = useState(0)
  const stepRef    = useRef(-1)
  const apiDoneRef = useRef(apiDone)
  const onReadyRef = useRef(onReady)

  const progress      = useRef(new Animated.Value(0)).current
  const textOpacity   = useRef(new Animated.Value(0)).current
  const screenOpacity = useRef(new Animated.Value(1)).current

  const dashoffset = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [RING_CIRC, 0],
  })

  useEffect(() => { apiDoneRef.current = apiDone }, [apiDone])
  useEffect(() => { onReadyRef.current = onReady  }, [onReady])

  const goToStep = useCallback((next: number) => {
    if (next <= stepRef.current) return
    stepRef.current = next

    if (next === 0) {
      setStep(0)
      Animated.parallel([
        Animated.timing(progress, {
          toValue:        0.25,
          duration:       700,
          easing:         Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(textOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start()
      return
    }

    Animated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(next)
      Animated.parallel([
        Animated.timing(progress, {
          toValue:        (next + 1) / 4,
          duration:       650,
          easing:         Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(220),
          Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (next === 2 && apiDoneRef.current) goToStep(3)
        if (next === 3) {
          setTimeout(() => {
            Animated.timing(screenOpacity, {
              toValue:        0,
              duration:       380,
              useNativeDriver: true,
            }).start(() => onReadyRef.current())
          }, 600)
        }
      })
    })
  }, []) // all deps are stable refs or Animated.Values

  // Timed progression: step 0 on mount, 1 at 2 s, 2 at 4.2 s
  useEffect(() => {
    goToStep(0)
    const t1 = setTimeout(() => goToStep(1), 2000)
    const t2 = setTimeout(() => goToStep(2), 4200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [goToStep])

  // API done → advance to step 3 as soon as we're past step 1
  useEffect(() => {
    if (apiDone && stepRef.current >= 2) goToStep(3)
  }, [apiDone, goToStep])

  return (
    <Animated.View style={[loadStyles.root, { opacity: screenOpacity }]}>
      {/* Progress ring */}
      <View style={loadStyles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={RING_SW}
          />
          <AnimatedCircle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none"
            stroke="#4f8cff"
            strokeWidth={RING_SW}
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
            strokeDashoffset={dashoffset}
          />
        </Svg>
      </View>

      {/* Step text */}
      <Animated.View style={[loadStyles.textWrap, { opacity: textOpacity }]}>
        <Text style={loadStyles.title}>{LOAD_STEPS[step].title}</Text>
        <Text style={loadStyles.subtitle}>{LOAD_STEPS[step].subtitle}</Text>
      </Animated.View>

      {/* Step indicator dots */}
      <View style={loadStyles.dots}>
        {LOAD_STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              loadStyles.dot,
              i === step ? loadStyles.dotActive
              : i < step  ? loadStyles.dotDone
              :               loadStyles.dotFuture,
            ]}
          />
        ))}
      </View>
    </Animated.View>
  )
}

const loadStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems:     'center',
  },
  ringWrap: {
    transform:    [{ rotate: '-90deg' }],
    marginBottom: 44,
  },
  textWrap: {
    alignItems:       'center',
    paddingHorizontal: 40,
  },
  title: {
    fontFamily:   'SpaceGrotesk-Bold',
    fontSize:     20,
    color:        '#e8efff',
    letterSpacing: -0.3,
    marginBottom:  8,
    textAlign:    'center',
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize:   14,
    color:      'rgba(255,255,255,0.45)',
    textAlign:  'center',
    lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    gap:           6,
    marginTop:     36,
    alignItems:    'center',
  },
  dot: {
    height:       6,
    borderRadius: 3,
  },
  dotActive: {
    width:           20,
    backgroundColor: '#4f8cff',
  },
  dotDone: {
    width:           6,
    backgroundColor: 'rgba(79,140,255,0.45)',
  },
  dotFuture: {
    width:           6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
})

// ─── Stats Chip ───────────────────────────────────────────────────────────────

function StatChip({ label }: { label: string }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipText}>{label}</Text>
    </View>
  )
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function EjercicioRow({
  ejercicio,
  faseColor,
  onRegenerar,
}: {
  ejercicio: Ejercicio
  faseColor: string
  onRegenerar: (nombre: string) => void
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const rir = ejercicio.rpe_sugerido ? (10 - ejercicio.rpe_sugerido).toFixed(0) : '—'

  return (
    <View style={styles.ejercicioRow}>
      <View style={styles.ejercicioMain}>
        <View style={styles.ejercicioHeader}>
          <Text style={styles.ejercicioNombre} numberOfLines={2}>
            {ejercicio.nombre}
          </Text>
          <TouchableOpacity
            style={styles.regenerarBtn}
            onPress={() => onRegenerar(ejercicio.nombre)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.regenerarIcon, { color: faseColor }]}>↻</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ejercicioBadges}>
          <View style={[styles.badge, { borderColor: faseColor + '60' }]}>
            <Text style={[styles.badgeText, { color: faseColor }]}>
              {ejercicio.series} series
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{ejercicio.repeticiones} reps</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{ejercicio.descanso_segundos}s descanso</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>RPE {ejercicio.rpe_sugerido}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>RIR {rir}</Text>
          </View>
        </View>

        {ejercicio.notas ? (
          <Text style={styles.ejercicioNotas}>{ejercicio.notas}</Text>
        ) : null}
      </View>
    </View>
  )
}

// ─── Phase Card ───────────────────────────────────────────────────────────────

function FaseCard({
  fase,
  onRegenerar,
}: {
  fase: Fase
  onRegenerar: (nombre: string, faseNombre: string) => void
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const [collapsed, setCollapsed] = useState(false)

  const faseKey = fase.nombre as keyof typeof FASES
  const faseStyle = FASES[faseKey] ?? {
    color: colors.accent,
    bg:    'rgba(79,140,255,0.1)',
    label: fase.nombre.toUpperCase(),
  }

  return (
    <View style={[styles.faseCard, { borderColor: faseStyle.color + '30' }]}>
      <TouchableOpacity
        style={[styles.faseHeader, { backgroundColor: faseStyle.bg }]}
        onPress={() => setCollapsed(prev => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.faseHeaderLeft}>
          <Text style={[styles.faseLabel, { color: faseStyle.color }]}>{faseStyle.label}</Text>
          <Text style={styles.faseDuracion}>{fase.duracion_minutos} min</Text>
        </View>
        <Text style={[styles.chevron, { color: faseStyle.color }]}>
          {collapsed ? '▶' : '▼'}
        </Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.fasEjercicios}>
          {fase.ejercicios.map((ej, idx) => (
            <React.Fragment key={idx}>
              <EjercicioRow
                ejercicio={ej}
                faseColor={faseStyle.color}
                onRegenerar={nombre => onRegenerar(nombre, fase.nombre)}
              />
              {idx < fase.ejercicios.length - 1 && (
                <View style={styles.ejercicioSeparator} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GenerateScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [apiDone,      setApiDone]      = useState(false)
  const [contentReady, setContentReady] = useState(false)
  const [retryKey,     setRetryKey]     = useState(0)
  const contentFade = useRef(new Animated.Value(0)).current

  const [error,        setError]        = useState<string | null>(null)
  const [sesionId,     setSesionId]     = useState<string | null>(null)
  const [sesion,       setSesion]       = useState<Sesion | null>(null)
  const [checkin,      setCheckin]      = useState<CheckinData | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setApiDone(false)
    setContentReady(false)
    setRetryKey(k => k + 1)
    contentFade.setValue(0)
    setError(null)
    try {
      const [sessionRes, checkinRes] = await Promise.allSettled([
        apiPost('/api/sessions/generate/', {}),
        apiGet('/api/checkins/today/'),
      ])
      if (sessionRes.status === 'rejected') throw sessionRes.reason
      const data: SesionResponse = sessionRes.value
      setSesionId(String(data.sesion_id))
      setSesion(data.sesion)
      if (checkinRes.status === 'fulfilled' && checkinRes.value?.id) {
        setCheckin(checkinRes.value)
      }
    } catch (err: any) {
      setError(err.message || 'Error generando la sesión')
    } finally {
      setApiDone(true)
    }
  }, [contentFade])

  useEffect(() => { generate() }, [generate])

  const handleReady = useCallback(() => {
    setContentReady(true)
    Animated.timing(contentFade, { toValue: 1, duration: 480, useNativeDriver: true }).start()
  }, [contentFade])

  const handleRegenerar = useCallback(async (nombre: string, faseNombre: string) => {
    if (regenerating) return
    setRegenerating(nombre)
    try {
      const data = await apiPost('/api/ejercicios/regenerar/', {
        nombre,
        fase:       faseNombre,
        session_id: sesionId,
      })
      setSesion(prev => {
        if (!prev) return prev
        return {
          ...prev,
          fases: prev.fases.map(fase =>
            fase.nombre === faseNombre
              ? {
                  ...fase,
                  ejercicios: fase.ejercicios.map(ej =>
                    ej.nombre === nombre ? { ...ej, ...data.ejercicio } : ej
                  ),
                }
              : fase
          ),
        }
      })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo regenerar el ejercicio')
    } finally {
      setRegenerating(null)
    }
  }, [regenerating, sesionId])

  const handleEjecutar = () => {
    if (!sesionId) return
    router.push(`/(app)/ejecutar/${sesionId}`)
  }

  const handleMarcarCompletada = () => {
    if (!sesionId) return
    router.push(`/(app)/feedback/${sesionId}`)
  }

  const rir          = sesion ? (10 - sesion.rpe_target).toFixed(0) : '—'
  const checkinChips = useMemo(() => checkin ? buildCheckinChips(checkin) : [], [checkin])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      {/* Loading overlay — fades itself out, then calls handleReady */}
      <LoadingScreen key={retryKey} apiDone={apiDone} onReady={handleReady} />

      {/* Content layer — fades in after loading completes */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: contentFade }]}
        pointerEvents={contentReady ? 'auto' : 'none'}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Algo salió mal</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={generate}>
              <Text style={styles.retryBtnText}>Intentar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(app)/dashboard')}
            >
              <Text style={styles.backBtnText}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
        ) : sesion ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.sessionHeader}>
              <Text style={styles.headerEyebrow}>TU ENTRENAMIENTO DE HOY</Text>
              <Text style={styles.sessionTitle}>{sesion.titulo}</Text>
              <Text style={styles.sessionObjetivo}>{sesion.objetivo_sesion}</Text>
              <Text style={styles.sessionMeta}>{formatDateES()} · {sesion.duracion_total} min</Text>
            </View>

            {/* Checkin context chips */}
            {checkinChips.length > 0 && (
              <>
                <View style={styles.chipsDivider} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsScroll}
                  contentContainerStyle={styles.chipsContent}
                >
                  {checkinChips.map((chip, i) => (
                    <View key={i} style={[styles.chip, { borderColor: chip.color + '40' }]}>
                      <Text style={styles.chipIcon}>{chip.icon}</Text>
                      <Text style={[styles.chipLabel, { color: chip.color }]}>{chip.label}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.chipsDivider} />
              </>
            )}

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatChip label={`⏱ ${sesion.duracion_total} min`} />
              <StatChip label={`RPE ${sesion.rpe_target}/10`} />
              <StatChip label={`RIR ${rir}`} />
            </View>

            {/* Trainer note */}
            {sesion.nota_del_entrenador ? (
              <View style={styles.trainerCard}>
                <View style={styles.trainerCardHeader}>
                  <Text style={styles.trainerIcon}>🧠</Text>
                  <Text style={styles.trainerLabel}>NOTA DEL ENTRENADOR</Text>
                </View>
                <Text style={styles.trainerNote}>{sesion.nota_del_entrenador}</Text>
              </View>
            ) : null}

            {/* Phases */}
            <View style={styles.fasesSection}>
              <Text style={styles.sectionLabel}>PLAN DE ENTRENAMIENTO</Text>
              {sesion.fases.map((fase, idx) => (
                <FaseCard key={idx} fase={fase} onRegenerar={handleRegenerar} />
              ))}
            </View>

            {regenerating ? (
              <View style={styles.regeneratingBanner}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.regeneratingText}>
                  Regenerando {regenerating}...
                </Text>
              </View>
            ) : null}

            {/* CTA */}
            <View style={styles.ctaSection}>
              <TouchableOpacity style={styles.ctaPrimary} onPress={handleEjecutar}>
                <Text style={styles.ctaPrimaryText}>⚡ Ejecutar sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaSecondary} onPress={handleMarcarCompletada}>
                <Text style={styles.ctaSecondaryText}>✓ Marcar completada</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : null}
      </Animated.View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex:            1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top:      0,
      left:     0,
      right:    0,
      height:   400,
    },

    // Error
    errorContainer: {
      flex:              1,
      alignItems:        'center',
      justifyContent:    'center',
      paddingHorizontal: 32,
    },
    errorIcon: {
      fontSize:     48,
      marginBottom: 16,
    },
    errorTitle: {
      fontFamily:   'SpaceGrotesk-Bold',
      fontSize:     22,
      color:        c.inkPrimary,
      marginBottom:  8,
    },
    errorMessage: {
      fontFamily:        'SpaceGrotesk-Regular',
      fontSize:          14,
      color:             c.inkSecondary,
      textAlign:         'center',
      marginBottom:      32,
      lineHeight:        22,
    },
    retryBtn: {
      backgroundColor: c.accent,
      paddingVertical:   14,
      paddingHorizontal: 32,
      borderRadius:      14,
      marginBottom:      12,
      width:             '100%',
      alignItems:        'center',
    },
    retryBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize:   15,
      color:      c.white,
    },
    backBtn: {
      paddingVertical: 12,
      alignItems:      'center',
    },
    backBtnText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkMuted,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop:        60,
      paddingBottom:     48,
      paddingHorizontal: 20,
    },

    // Session header
    sessionHeader: {
      marginBottom: 16,
    },
    headerEyebrow: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      10,
      color:         c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom:  12,
    },
    sessionTitle: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      28,
      color:         c.inkPrimary,
      letterSpacing: -0.7,
      lineHeight:    34,
      marginBottom:   6,
    },
    sessionObjetivo: {
      fontFamily:   'InstrumentSerif-Italic',
      fontSize:     15,
      color:        c.inkSecondary,
      lineHeight:   22,
      marginBottom:  8,
    },
    sessionMeta: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   13,
      color:      c.inkMuted,
      letterSpacing: 0.1,
    },

    // Checkin chips
    chipsDivider: {
      height:          1,
      backgroundColor: c.borderDefault,
      marginVertical:  16,
    },
    chipsScroll: {
      marginHorizontal: -20,
    },
    chipsContent: {
      paddingHorizontal: 20,
      gap:               8,
      flexDirection:     'row',
      alignItems:        'center',
    },
    chip: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               6,
      backgroundColor:   c.cardBg,
      borderWidth:       1,
      borderRadius:      20,
      paddingVertical:    7,
      paddingHorizontal: 12,
    },
    chipIcon: {
      fontSize: 13,
    },
    chipLabel: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize:   13,
      lineHeight: 18,
    },

    // Stats
    statsRow: {
      flexDirection: 'row',
      gap:           8,
      marginBottom:  20,
      flexWrap:      'wrap',
    },
    statChip: {
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    20,
      paddingVertical:   6,
      paddingHorizontal: 14,
    },
    statChipText: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      12,
      color:         c.inkSecondary,
      letterSpacing: 0.5,
    },

    // Trainer card
    trainerCard: {
      backgroundColor: 'rgba(79,140,255,0.07)',
      borderWidth:     1,
      borderColor:     'rgba(79,140,255,0.2)',
      borderRadius:    16,
      padding:         16,
      marginBottom:    24,
    },
    trainerCardHeader: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           8,
      marginBottom:  10,
    },
    trainerIcon: {
      fontSize: 16,
    },
    trainerLabel: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      10,
      color:         c.accentLight,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    trainerNote: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkSecondary,
      lineHeight: 22,
    },

    // Phases section
    fasesSection: {
      gap:          12,
      marginBottom: 24,
    },
    sectionLabel: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      10,
      color:         c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom:  4,
    },
    faseCard: {
      borderWidth:     1,
      borderRadius:    20,
      overflow:        'hidden',
      backgroundColor: c.cardBg,
    },
    faseHeader: {
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'space-between',
      paddingHorizontal: 16,
      paddingVertical:   14,
    },
    faseHeaderLeft: {
      gap: 2,
    },
    faseLabel: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontWeight:    '500',
    },
    faseDuracion: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   12,
      color:      c.inkMuted,
    },
    chevron: {
      fontSize:   10,
      fontFamily: 'SpaceGrotesk-Regular',
    },
    fasEjercicios: {
      paddingHorizontal: 16,
      paddingBottom:     12,
    },
    ejercicioSeparator: {
      height:          1,
      backgroundColor: c.borderDefault,
      marginVertical:  12,
    },

    // Exercise
    ejercicioRow: {
      paddingTop: 12,
    },
    ejercicioMain: {
      flex: 1,
    },
    ejercicioHeader: {
      flexDirection:  'row',
      alignItems:     'flex-start',
      justifyContent: 'space-between',
      marginBottom:   10,
      gap:            8,
    },
    ejercicioNombre: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize:   15,
      color:      c.inkPrimary,
      flex:       1,
      lineHeight: 22,
    },
    regenerarBtn: {
      padding: 4,
    },
    regenerarIcon: {
      fontSize:   18,
      fontFamily: 'SpaceGrotesk-Bold',
    },
    ejercicioBadges: {
      flexDirection: 'row',
      flexWrap:      'wrap',
      gap:           6,
      marginBottom:  6,
    },
    badge: {
      backgroundColor: c.glassBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    8,
      paddingVertical:   3,
      paddingHorizontal: 8,
    },
    badgeText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize:   11,
      color:      c.inkSecondary,
    },
    ejercicioNotas: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   12,
      color:      c.inkMuted,
      lineHeight: 18,
      marginTop:  4,
    },

    // Regenerating
    regeneratingBanner: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            10,
      paddingVertical: 10,
      marginBottom:   8,
    },
    regeneratingText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   13,
      color:      c.accentLight,
    },

    // CTA
    ctaSection: {
      gap: 12,
    },
    ctaPrimary: {
      backgroundColor: c.white,
      borderRadius:    16,
      paddingVertical: 16,
      alignItems:      'center',
    },
    ctaPrimaryText: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      16,
      color:         c.bg,
      letterSpacing: -0.2,
    },
    ctaSecondary: {
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    16,
      paddingVertical: 16,
      alignItems:      'center',
    },
    ctaSecondaryText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize:   15,
      color:      c.inkSecondary,
    },
  })
}
