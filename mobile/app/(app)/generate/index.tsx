import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Pressable,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
import { useVideoPlayer, VideoView } from 'expo-video'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, FASES, Colors, RADII, cardShadow } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPost } from '../../../lib/api'
import { fetchMiCoach, type CoachConfig } from '../../../lib/coachApi'
import EvidenciaCard, { type ResumenData, type ResumenDecision, type ResumenEvidencia } from '../../../components/EvidenciaCard'

// Video de fondo de la pantalla de generación (baja opacidad). Vive solo mientras
// la pantalla de carga está montada, así que dura lo que dura la generación.
const GEN_VIDEO = require('../../../assets/video_pantalla_generacion.mp4')

// La generación con IA corre en un task de Celery en el backend (puede tardar
// hasta ~60s en el peor caso): el POST solo valida y encola, y la rutina se
// recupera con polling de /api/sessions/today/ hasta que quede 'ready' (o
// 'error', si Groq falló del lado del servidor).
const TODAY_POLL_MAX_MS = 70000
const TODAY_POLL_INTERVAL_MS = 3000

async function pollForNewSession(
  baselineId: number | null,
  shouldContinue: () => boolean = () => true,
): Promise<SesionResponse> {
  const start = Date.now()
  while (Date.now() - start < TODAY_POLL_MAX_MS) {
    await new Promise(r => setTimeout(r, TODAY_POLL_INTERVAL_MS))
    if (!shouldContinue()) throw new Error('cancelled')  // detener al desmontar
    let res: any
    try {
      res = await apiGet('/api/sessions/today/')
    } catch {
      continue // red intermitente — seguimos intentando dentro de la ventana
    }
    if (res?.status === 'error') {
      // Falló la generación en el backend (Groq caído, respuesta inválida, etc.):
      // no tiene sentido seguir esperando, se propaga de inmediato.
      throw new Error(res.error || 'La IA no pudo generar tu rutina. Intenta de nuevo.')
    }
    if (res?.status === 'ready' && res.sesion && res.sesion_id !== baselineId) {
      return { sesion_id: res.sesion_id, sesion: res.sesion }
    }
  }
  throw new Error('La generación está tardando demasiado. Revisa tu conexión e intenta de nuevo.')
}

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

// ─── Resumen type aliases (defined in EvidenciaCard, re-used here) ───────────

type Decision = ResumenDecision
type Evidencia = ResumenEvidencia
type Resumen = ResumenData

interface AlternativaEjercicio {
  nombre:            string
  series:            number
  repeticiones:      string
  descanso_segundos?: number
  rpe_sugerido?:     number
  notas?:            string
  por_que:           string
}

interface SubTarget {
  ejercicio:   Ejercicio
  faseNombre:  string
  idx:         number
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function formatDateES(lang: string): string {
  const d = new Date()
  const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const DAYS_EN   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
  if (lang === 'en') {
    return `${DAYS_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`
  }
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`
}

// ─── Ring constants ───────────────────────────────────────────────────────────

const RING_R    = 62
const RING_SIZE = 144
const RING_SW   = 6
const RING_CIRC = 2 * Math.PI * RING_R   // ≈ 389.6

// LOAD_STEPS is now built inside LoadingScreen using translated strings

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen({ apiDone, onReady }: { apiDone: boolean; onReady: () => void }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const LOAD_STEPS = [
    { title: t('generate_loading_1'), subtitle: t('generate_loading_1_sub') },
    { title: t('generate_loading_2'), subtitle: t('generate_loading_2_sub') },
    { title: t('generate_loading_3'), subtitle: t('generate_loading_3_sub') },
    { title: t('generate_loading_5'), subtitle: t('generate_loading_5_sub') },
  ]
  const [step, setStep] = useState(0)
  const stepRef    = useRef(-1)
  const apiDoneRef = useRef(apiDone)
  const onReadyRef = useRef(onReady)

  // Video de fondo en bucle, silenciado. Se pausa al terminar la generación.
  const videoPlayer = useVideoPlayer(GEN_VIDEO, p => {
    p.loop = true
    p.muted = true
    p.play()
  })

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
            }).start(() => {
              try { videoPlayer.pause() } catch {}
              onReadyRef.current()
            })
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
    <Animated.View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }, { opacity: screenOpacity }]}>
      {/* Video de fondo — baja opacidad para coherencia con la estética oscura */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.22 }]}>
        <VideoView
          player={videoPlayer}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </View>

      {/* Progress ring */}
      <View style={{ transform: [{ rotate: '-90deg' }], marginBottom: 44 }}>
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
      <Animated.View style={[{ alignItems: 'center', paddingHorizontal: 40 }, { opacity: textOpacity }]}>
        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: colors.inkPrimary, letterSpacing: -0.3, marginBottom: 8, textAlign: 'center' }}>
          {LOAD_STEPS[step].title}
        </Text>
        <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: colors.inkMuted, textAlign: 'center', lineHeight: 20 }}>
          {LOAD_STEPS[step].subtitle}
        </Text>
      </Animated.View>

      {/* Step indicator dots */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 36, alignItems: 'center' }}>
        {LOAD_STEPS.map((_, i) => (
          <View
            key={i}
            style={{
              height: 6,
              borderRadius: 3,
              width:           i === step ? 20 : 6,
              backgroundColor: i === step ? colors.accent
                             : i < step  ? colors.accent + '70'
                             :               colors.borderDefault,
            }}
          />
        ))}
      </View>
    </Animated.View>
  )
}

// JustificacionCard lives in components/EvidenciaCard.tsx — imported above.

// ─── Param Card ───────────────────────────────────────────────────────────────

function ParamCard({ value, unit }: { value: string; unit: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 26, color: colors.inkPrimary, letterSpacing: -0.5, lineHeight: 30 }}>{value}</Text>
        <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: colors.inkMuted, lineHeight: 18 }}>{unit}</Text>
      </View>
    </View>
  )
}

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

// ─── Phase + exercise constants ───────────────────────────────────────────────

const FASE_META: Record<string, { icon: string; desc: string }> = {
  calentamiento: { icon: '🔥', desc: 'Preparación articular y activación' },
  principal:     { icon: '⚡', desc: 'Trabajo de fuerza y potencia' },
  enfriamiento:  { icon: '❄️', desc: 'Recuperación y vuelta a la calma' },
}

// Oscurece un color hex (#rrggbb) hacia negro por un factor (0..1). Se usa para
// teñir el fondo de cada card de fase con su propio color (naranja/azul/verde)
// pero en un tono oscuro que da contraste correcto al texto blanco encima.
function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor)
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor)
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor)
  return `rgb(${r}, ${g}, ${b})`
}

const MOTIVOS = [
  { id: 'equipamiento', label: 'No tengo el equipamiento' },
  { id: 'molestia',     label: 'Tengo una molestia' },
  { id: 'variante',     label: 'Prefiero otra variante' },
  { id: '',             label: 'Sin motivo específico' },
]

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function EjercicioRow({
  ejercicio,
  isPrincipal,
  isModified,
  canRegen,
  onSustituir,
}: {
  ejercicio:   Ejercicio
  isPrincipal: boolean
  isModified:  boolean
  canRegen:    boolean
  onSustituir?: () => void
}) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }}>
      {/* Left: name + modified badge */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: '#fff', lineHeight: 20 }} numberOfLines={2}>{ejercicio.nombre}</Text>
        {isModified && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(79,140,255,0.15)', borderWidth: 1, borderColor: 'rgba(79,140,255,0.35)', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: colors.accentLight, letterSpacing: 0.5, textTransform: 'uppercase' }}>Modificado</Text>
          </View>
        )}
      </View>

      {/* Center: parameter pills */}
      <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}>
          <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: 'rgba(255,255,255,0.92)' }}>{ejercicio.series}×{ejercicio.repeticiones}</Text>
        </View>
        {isPrincipal && ejercicio.rpe_sugerido ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#fff' }}>RPE {ejercicio.rpe_sugerido}</Text>
          </View>
        ) : null}
      </View>

      {/* Right: reload button (principal only, disabled after 2 regen) */}
      {isPrincipal ? (
        <TouchableOpacity
          style={{
            width: 36, height: 36, borderRadius: 18, flexShrink: 0,
            backgroundColor: canRegen ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: canRegen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
            alignItems: 'center', justifyContent: 'center',
          }}
          onPress={canRegen ? onSustituir : undefined}
          disabled={!canRegen}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, lineHeight: 20, color: canRegen ? '#fff' : 'rgba(255,255,255,0.2)' }}>↻</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </View>
  )
}

// ─── Substitution Modal ───────────────────────────────────────────────────────

function SubstitutionModal({
  visible,
  ejercicio,
  faseNombre,
  sesionId,
  onSelect,
  onClose,
}: {
  visible:    boolean
  ejercicio:  Ejercicio | null
  faseNombre: string
  sesionId:   string | null
  onSelect:   (alt: AlternativaEjercicio, motivo: string) => void
  onClose:    () => void
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const mSt = useMemo(() => makeMStyles(colors), [colors])
  const [motivo,       setMotivo]       = useState('')
  const [loading,      setLoading]      = useState(false)
  const [alternativas, setAlternativas] = useState<AlternativaEjercicio[] | null>(null)
  const [fetchError,   setFetchError]   = useState<string | null>(null)
  const sheetY = useRef(new Animated.Value(700)).current
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  useEffect(() => {
    if (visible) {
      setMotivo(''); setAlternativas(null); setFetchError(null); setLoading(false)
      sheetY.setValue(700)
      Animated.spring(sheetY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start()
    }
  }, [visible])

  function dismiss() {
    Animated.timing(sheetY, { toValue: 700, duration: 240, useNativeDriver: true }).start(onClose)
  }

  function selectAndClose(alt: AlternativaEjercicio) {
    Animated.timing(sheetY, { toValue: 700, duration: 240, useNativeDriver: true }).start(() => {
      onClose()
      onSelect(alt, motivo)
    })
  }

  async function buscarAlternativas() {
    if (!ejercicio || loading) return   // guard: evita dos búsquedas concurrentes
    setLoading(true); setFetchError(null); setAlternativas(null)
    try {
      const data = await apiPost('/api/ejercicios/regenerar/', {
        nombre:     ejercicio.nombre,
        fase:       faseNombre,
        session_id: sesionId,
        motivo,
      })
      if (mountedRef.current) setAlternativas(data.alternativas ?? [])
    } catch (e: any) {
      if (mountedRef.current) setFetchError(e.message || 'No se pudieron cargar alternativas')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  if (!visible || !ejercicio) return null

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <View style={{ flex: 1 }}>
        <Pressable style={mSt.backdrop} onPress={dismiss} />

        <Animated.View style={[mSt.sheet, { transform: [{ translateY: sheetY }] }]}>
          {/* Drag handle */}
          <View style={mSt.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={mSt.sheetContent}
          >
            {/* Title */}
            <Text style={mSt.sheetTitle}>{t('generate_sub_title')}</Text>
            <Text style={mSt.sheetEjercicio}>{ejercicio.nombre}</Text>

            {/* Reason selector (shown before alternatives load) */}
            {!alternativas && !loading && (
              <>
                <Text style={mSt.sectionLabel}>{t('generate_sub_why')}</Text>
                {MOTIVOS.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[mSt.motivoRow, motivo === m.id && mSt.motivoRowSel]}
                    onPress={() => setMotivo(m.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[mSt.radio, motivo === m.id && mSt.radioSel]}>
                      {motivo === m.id && <View style={mSt.radioDot} />}
                    </View>
                    <Text style={[mSt.motivoLabel, motivo === m.id && { color: '#e8efff' }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity style={mSt.buscarBtn} onPress={buscarAlternativas}>
                  <Text style={mSt.buscarBtnText}>{t('generate_sub_find')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Loading */}
            {loading && (
              <View style={mSt.loadingWrap}>
                <ActivityIndicator color="#4f8cff" />
                <Text style={mSt.loadingText}>{t('generate_sub_loading')}</Text>
              </View>
            )}

            {/* Error */}
            {fetchError && !loading && (
              <View style={mSt.errorWrap}>
                <Text style={mSt.errorTxt}>{fetchError}</Text>
                <TouchableOpacity onPress={buscarAlternativas} style={{ marginTop: 10 }}>
                  <Text style={mSt.retryLink}>{t('common_retry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Alternatives */}
            {alternativas && !loading && (
              <>
                <Text style={mSt.altTitle}>{t('generate_sub_use')}</Text>
                {alternativas.map((alt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={mSt.altCard}
                    onPress={() => selectAndClose(alt)}
                    activeOpacity={0.75}
                  >
                    <Text style={mSt.altNombre}>{alt.nombre}</Text>
                    <Text style={mSt.altParams}>
                      {alt.series} × {alt.repeticiones}
                      {alt.rpe_sugerido ? ` · RPE ${alt.rpe_sugerido}` : ''}
                    </Text>
                    <View style={mSt.altDivider} />
                    <Text style={mSt.altPorQue}>{alt.por_que}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

function makeMStyles(c: Colors) {
  return StyleSheet.create({
    backdrop: {
      flex:            1,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    sheet: {
      backgroundColor:      c.sheetBg,
      borderTopLeftRadius:  28,
      borderTopRightRadius: 28,
      maxHeight:            '82%',
      borderTopWidth:       1,
      borderColor:          c.borderDefault,
    },
    handle: {
      width:           40,
      height:           4,
      borderRadius:     2,
      backgroundColor: c.borderBright,
      alignSelf:       'center',
      marginTop:       12,
      marginBottom:     4,
    },
    sheetContent: {
      paddingHorizontal: 24,
      paddingBottom:     40,
      paddingTop:        16,
    },
    sheetTitle: {
      fontFamily:   'JetBrainsMono-Regular',
      fontSize:      10,
      color:        c.inkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom:  6,
    },
    sheetEjercicio: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      20,
      color:         c.inkPrimary,
      letterSpacing: -0.4,
      lineHeight:    26,
      marginBottom:  24,
    },
    sectionLabel: {
      fontFamily:   'SpaceGrotesk-SemiBold',
      fontSize:      13,
      color:        c.inkSecondary,
      marginBottom:  12,
    },
    motivoRow: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               12,
      paddingVertical:   12,
      paddingHorizontal: 14,
      borderRadius:      RADII.md,
      marginBottom:       6,
      borderWidth:        1,
      borderColor:       c.borderDefault,
      backgroundColor:   c.cardBg,
    },
    motivoRowSel: {
      borderColor:     'rgba(79,140,255,0.4)',
      backgroundColor: 'rgba(79,140,255,0.08)',
    },
    radio: {
      width:          20,
      height:         20,
      borderRadius:   10,
      borderWidth:     2,
      borderColor:    c.borderBright,
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
    },
    radioSel: {
      borderColor: '#4f8cff',
    },
    radioDot: {
      width:           10,
      height:          10,
      borderRadius:     5,
      backgroundColor: '#4f8cff',
    },
    motivoLabel: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkSecondary,
      flex:        1,
    },
    buscarBtn: {
      backgroundColor: c.accent,
      borderRadius:    16,
      paddingVertical: 15,
      alignItems:      'center',
      marginTop:       20,
    },
    buscarBtnText: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      15,
      color:         '#fff',
      letterSpacing: -0.2,
    },
    loadingWrap: {
      alignItems:     'center',
      gap:            12,
      paddingVertical: 32,
    },
    loadingText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkMuted,
    },
    errorWrap: {
      alignItems:     'center',
      paddingVertical: 24,
    },
    errorTxt: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      '#ff6b6b',
      textAlign:  'center',
    },
    retryLink: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize:   14,
      color:      c.accent,
    },
    altTitle: {
      fontFamily:   'JetBrainsMono-Regular',
      fontSize:      10,
      color:        c.inkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom:  12,
    },
    altCard: {
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    16,
      padding:         16,
      marginBottom:    10,
    },
    altNombre: {
      fontFamily:    'SpaceGrotesk-SemiBold',
      fontSize:      15,
      color:         c.inkPrimary,
      marginBottom:   4,
      letterSpacing: -0.2,
    },
    altParams: {
      fontFamily:   'JetBrainsMono-Regular',
      fontSize:     12,
      color:        c.inkMuted,
      marginBottom: 10,
    },
    altDivider: {
      height:          1,
      backgroundColor: c.borderDefault,
      marginBottom:    10,
    },
    altPorQue: {
      fontFamily: 'InstrumentSerif-Italic',
      fontSize:   13,
      color:      c.inkSecondary,
      lineHeight: 19,
    },
  })
}

// ─── Ajuste Modal ─────────────────────────────────────────────────────────────

function AjusteModal({
  visible,
  sesion,
  sesionId,
  onResult,
  onClose,
}: {
  visible:  boolean
  sesion:   Sesion | null
  sesionId: string | null
  onResult: (sesion: Sesion) => void
  onClose:  () => void
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const ajSt = useMemo(() => makeAjStyles(colors), [colors])
  const [duracionDelta, setDuracionDelta] = useState<-15 | 0 | 15>(0)
  const [rpeDelta,      setRpeDelta]      = useState<-1 | 0 | 1>(0)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const sheetY = useRef(new Animated.Value(700)).current

  useEffect(() => {
    if (visible) {
      setDuracionDelta(0); setRpeDelta(0); setError(null); setLoading(false)
      sheetY.setValue(700)
      Animated.spring(sheetY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start()
    }
  }, [visible])

  function dismiss() {
    if (loading) return
    Animated.timing(sheetY, { toValue: 700, duration: 240, useNativeDriver: true }).start(onClose)
  }

  async function aplicar() {
    if (duracionDelta === 0 && rpeDelta === 0) return
    setLoading(true); setError(null)
    try {
      const data = await apiPost(`/api/sessions/${sesionId}/ajustar/`, {
        duracion_delta: duracionDelta,
        rpe_delta:      rpeDelta,
      })
      Animated.timing(sheetY, { toValue: 700, duration: 240, useNativeDriver: true }).start(() => {
        onClose()
        onResult(data.sesion)
      })
    } catch (e: any) {
      setError(e.message || 'No se pudo regenerar la rutina')
      setLoading(false)
    }
  }

  if (!visible) return null

  const noChanges = duracionDelta === 0 && rpeDelta === 0
  const currentDuracion = sesion?.duracion_total ?? 0
  const currentRpe      = sesion?.rpe_target ?? 0

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <View style={{ flex: 1 }}>
        <Pressable style={ajSt.backdrop} onPress={dismiss} />
        <Animated.View style={[ajSt.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={ajSt.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={ajSt.content}
          >
            <Text style={ajSt.eyebrow}>{t('generate_adj_title')}</Text>
            <Text style={ajSt.current}>
              {currentDuracion} min · RPE {currentRpe}
            </Text>

            {loading ? (
              <View style={ajSt.loadingWrap}>
                <ActivityIndicator color="#4f8cff" size="large" />
                <Text style={ajSt.loadingText}>Regenerando con los nuevos parámetros...</Text>
              </View>
            ) : (
              <>
                {/* Intensity row: [−] INTENSIDAD [+] */}
                <View style={ajSt.paramRow}>
                  <TouchableOpacity
                    style={[ajSt.deltaBtn, rpeDelta === -1 && ajSt.deltaBtnActive]}
                    onPress={() => setRpeDelta(r => r === -1 ? 0 : -1)}
                    activeOpacity={0.7}
                  >
                    <Text style={[ajSt.deltaBtnText, rpeDelta === -1 && ajSt.deltaBtnTextActive]}>−</Text>
                  </TouchableOpacity>
                  <Text style={ajSt.paramLabel}>{t('generate_adj_intensity')}</Text>
                  <TouchableOpacity
                    style={[ajSt.deltaBtn, rpeDelta === 1 && ajSt.deltaBtnActive]}
                    onPress={() => setRpeDelta(r => r === 1 ? 0 : 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={[ajSt.deltaBtnText, rpeDelta === 1 && ajSt.deltaBtnTextActive]}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Time row: [−] TIEMPO [+] */}
                <View style={ajSt.paramRow}>
                  <TouchableOpacity
                    style={[ajSt.deltaBtn, duracionDelta === -15 && ajSt.deltaBtnActive]}
                    onPress={() => setDuracionDelta(d => d === -15 ? 0 : -15)}
                    activeOpacity={0.7}
                  >
                    <Text style={[ajSt.deltaBtnText, duracionDelta === -15 && ajSt.deltaBtnTextActive]}>−</Text>
                  </TouchableOpacity>
                  <Text style={ajSt.paramLabel}>{t('generate_adj_duration')}</Text>
                  <TouchableOpacity
                    style={[ajSt.deltaBtn, duracionDelta === 15 && ajSt.deltaBtnActive]}
                    onPress={() => setDuracionDelta(d => d === 15 ? 0 : 15)}
                    activeOpacity={0.7}
                  >
                    <Text style={[ajSt.deltaBtnText, duracionDelta === 15 && ajSt.deltaBtnTextActive]}>+</Text>
                  </TouchableOpacity>
                </View>

                {error ? (
                  <Text style={ajSt.errorText}>{error}</Text>
                ) : null}

                <TouchableOpacity
                  style={[ajSt.aplicarBtn, noChanges && ajSt.aplicarBtnDisabled]}
                  onPress={aplicar}
                  disabled={noChanges}
                  activeOpacity={noChanges ? 1 : 0.75}
                >
                  <Text style={[ajSt.aplicarBtnText, noChanges && ajSt.aplicarBtnTextDisabled]}>
                    {t('generate_adj_apply')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

function makeAjStyles(c: Colors) {
  return StyleSheet.create({
    backdrop: {
      flex:            1,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    handle: {
      width:           40,
      height:           4,
      borderRadius:     2,
      backgroundColor: c.borderBright,
      alignSelf:       'center',
      marginTop:       12,
      marginBottom:     4,
    },
    sheet: {
      backgroundColor:      c.sheetBg,
      borderTopLeftRadius:  28,
      borderTopRightRadius: 28,
      maxHeight:            '72%',
      borderTopWidth:       1,
      borderColor:          c.borderDefault,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom:     40,
      paddingTop:        16,
    },
    eyebrow: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      10,
      color:         c.inkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom:  4,
    },
    current: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      22,
      color:         c.inkPrimary,
      letterSpacing: -0.4,
      marginBottom:  28,
    },
    paramRow: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      marginBottom:   24,
    },
    paramLabel: {
      fontFamily:    'JetBrainsMono-Medium',
      fontSize:      13,
      color:         c.inkSecondary,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      flex:          1,
      textAlign:     'center',
    },
    deltaBtn: {
      width:           52,
      height:          52,
      borderRadius:    26,
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      alignItems:      'center',
      justifyContent:  'center',
    },
    deltaBtnActive: {
      backgroundColor: 'rgba(79,140,255,0.15)',
      borderColor:     'rgba(79,140,255,0.5)',
    },
    deltaBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize:   24,
      color:      c.inkMuted,
      lineHeight: 28,
    },
    deltaBtnTextActive: {
      color: c.accent,
    },
    loadingWrap: {
      alignItems:     'center',
      justifyContent: 'center',
      gap:            16,
      paddingVertical: 52,
    },
    loadingText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkMuted,
      textAlign:  'center',
      lineHeight: 21,
    },
    errorText: {
      fontFamily:   'SpaceGrotesk-Regular',
      fontSize:      13,
      color:        '#ff6b6b',
      textAlign:    'center',
      marginBottom:  12,
    },
    aplicarBtn: {
      backgroundColor: c.accent,
      borderRadius:    16,
      paddingVertical: 15,
      alignItems:      'center',
      marginTop:       4,
    },
    aplicarBtnDisabled: {
      backgroundColor: c.accent + '20',
    },
    aplicarBtnText: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      15,
      color:         '#fff',
      letterSpacing: -0.2,
    },
    aplicarBtnTextDisabled: {
      color: c.inkFaint,
    },
  })
}

// ─── Phase Block ──────────────────────────────────────────────────────────────

function FaseBlock({
  fase,
  defaultExpanded,
  expandedRef,
  modifiedKeys,
  regenCount,
  onSustituir,
}: {
  fase:            Fase
  defaultExpanded: boolean
  expandedRef:     React.MutableRefObject<Record<string, boolean>>
  modifiedKeys:    Set<string>
  regenCount:      Record<string, number>
  onSustituir:     (ejercicio: Ejercicio, faseNombre: string, idx: number) => void
}) {
  const { colors } = useTheme()
  const blkSt = useMemo(() => makeBlkStyles(colors), [colors])
  // Inicializa desde el ref si existe (restaura estado tras desmontaje), si no usa defaultExpanded
  const initExpanded = fase.nombre in expandedRef.current
    ? expandedRef.current[fase.nombre]
    : defaultExpanded
  const [expanded, setExpanded] = useState(initExpanded)
  const chevronAnim = useRef(new Animated.Value(initExpanded ? 1 : 0)).current

  const faseKey   = fase.nombre as keyof typeof FASES
  const faseStyle = FASES[faseKey] ?? { color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', label: fase.nombre.toUpperCase() }
  const meta      = FASE_META[fase.nombre] ?? { icon: '●', desc: '' }
  const isPrincipal = fase.nombre === 'principal'

  function toggle() {
    const next = !expanded
    setExpanded(next)
    expandedRef.current[fase.nombre] = next
    Animated.spring(chevronAnim, { toValue: next ? 1 : 0, tension: 120, friction: 10, useNativeDriver: true }).start()
  }

  const chevronRotate = chevronAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '90deg'],
  })

  return (
    <View style={[blkSt.card, { backgroundColor: darkenHex(faseStyle.color, 0.35), borderColor: faseStyle.color + '66' }]}>
      <TouchableOpacity style={blkSt.header} onPress={toggle} activeOpacity={0.75}>
        {/* Icon square */}
        <View style={[blkSt.iconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={blkSt.iconEmoji}>{meta.icon}</Text>
        </View>

        {/* Name + description */}
        <View style={blkSt.nameWrap}>
          <Text style={[blkSt.name, { color: '#fff' }]}>{faseStyle.label}</Text>
          <Text style={blkSt.desc}>{fase.duracion_minutos} min · {meta.desc}</Text>
        </View>

        {/* Chevron */}
        <View style={blkSt.right}>
          <Animated.Text style={[blkSt.chevron, { color: 'rgba(255,255,255,0.85)', transform: [{ rotate: chevronRotate }] }]}>
            ›
          </Animated.Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={blkSt.body}>
          {fase.ejercicios.map((ej, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={blkSt.sep} />}
              <EjercicioRow
                ejercicio={ej}
                isPrincipal={isPrincipal}
                isModified={modifiedKeys.has(`${fase.nombre}:${ej.nombre}`)}
                canRegen={(regenCount[`${fase.nombre}:${i}`] ?? 0) < 2}
                onSustituir={() => onSustituir(ej, fase.nombre, i)}
              />
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  )
}

function makeBlkStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      borderWidth:  1,
      borderRadius: 20,
      overflow:     'hidden',
      // backgroundColor se asigna inline: tono oscuro del color de cada fase.
    },
    header: {
      flexDirection: 'row',
      alignItems:    'center',
      padding:       16,
      gap:           12,
    },
    iconWrap: {
      width:          40,
      height:         40,
      borderRadius:   12,
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
    },
    iconEmoji: {
      fontSize: 18,
      color:    '#fff',
    },
    nameWrap: {
      flex: 1,
      gap:   3,
    },
    name: {
      fontFamily:    'JetBrainsMono-Medium',
      fontSize:      15,
      letterSpacing:  0.5,
      textTransform: 'uppercase',
    },
    desc: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   12,
      color:      'rgba(255,255,255,0.7)',
      lineHeight: 16,
    },
    right: {
      alignItems:  'flex-end',
      gap:          4,
      flexShrink:   0,
    },
    chevron: {
      fontSize:   22,
      lineHeight: 26,
      fontFamily: 'SpaceGrotesk-Regular',
    },
    body: {
      paddingHorizontal: 16,
      paddingBottom:     8,
    },
    sep: {
      height:          1,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
  })
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GenerateScreen() {
  const { colors } = useTheme()
  const { t, lang } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const { t: checkinTs } = useLocalSearchParams<{ t?: string }>()
  const lastTsRef = useRef<string>('__init__')
  const navTsRef  = useRef(0)   // debounce para no apilar pantallas al doble-tap
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const [apiDone,      setApiDone]      = useState(false)
  const [contentReady, setContentReady] = useState(false)
  const [retryKey,     setRetryKey]     = useState(0)
  const contentFade = useRef(new Animated.Value(0)).current

  const [error,          setError]          = useState<string | null>(null)
  const [sesionId,       setSesionId]       = useState<string | null>(null)
  const [sesion,         setSesion]         = useState<Sesion | null>(null)
  const [resumen,        setResumen]        = useState<Resumen | null>(null)
  const [resumenLoading, setResumenLoading] = useState(false)
  const [subTarget,      setSubTarget]      = useState<SubTarget | null>(null)
  const [modifiedKeys,   setModifiedKeys]   = useState<Set<string>>(new Set())
  const [regenCount,     setRegenCount]     = useState<Record<string, number>>({})
  const [ajusteVisible,  setAjusteVisible]  = useState(false)
  const [coachNombre,    setCoachNombre]    = useState<string | null>(null)
  // Persiste el estado expand/collapse de cada fase entre desmontajes (ej. rotación, vuelta atrás)
  const faseExpandedRef = useRef<Record<string, boolean>>({})
  // Config del coach (controla el gating de IA). null = aún sin resolver. Failure-safe:
  // si falla la red asumimos IA permitida para no bloquear el camino crítico.
  const [coachConfig,    setCoachConfig]    = useState<CoachConfig | null>(null)
  const coachPausaIa = coachConfig?.ia === false

  // Coach vinculado (si existe) → badge "Guiado por" + config. Failure-safe.
  useEffect(() => {
    let cancelled = false
    fetchMiCoach()
      .then(r => {
        if (cancelled) return
        setCoachNombre(r.coach?.nombre ?? null)
        setCoachConfig(r.config)
      })
      .catch(() => { if (!cancelled) setCoachConfig({ checkin: true, feedback: true, ia: true }) })
    return () => { cancelled = true }
  }, [])

  const generate = useCallback(async () => {
    setApiDone(false)
    setContentReady(false)
    setRetryKey(k => k + 1)
    contentFade.setValue(0)
    setError(null)

    // Snapshot de la sesión de hoy ANTES de generar. El baseline distingue la
    // sesión NUEVA de una previa del día durante el polling.
    const baselineId = await apiGet('/api/sessions/today/')
      .then((r: any) => (r?.status === 'ready' ? r.sesion_id : null))
      .catch(() => null)

    try {
      // El POST solo valida y encola la generación (corre en Celery en
      // background); si algo es inválido (perfil/check-in/límite diario/coach
      // pausado) responde de inmediato con un error, si no, 202 aceptado. La
      // rutina se recupera siempre por polling de /api/sessions/today/.
      await apiPost('/api/sessions/generate/', {})
      const data = await pollForNewSession(baselineId, () => mountedRef.current)
      if (!mountedRef.current) return   // se salió de la pantalla mientras generaba
      setSesionId(String(data.sesion_id))
      setSesion(data.sesion)
    } catch (err: any) {
      if (!mountedRef.current) return
      if (err?.code === 'daily_limit' || err?.status === 429) {
        router.replace('/(app)/dashboard')
        Alert.alert('Alcanzaste tu límite diario', 'Generaste 5 sesiones hoy. Vuelve mañana para crear nuevas.')
        return
      }
      setError(err.message || 'Error generando la sesión')
    } finally {
      if (mountedRef.current) setApiDone(true)
    }
  }, [contentFade])

  useEffect(() => {
    // Espera a conocer la config del coach antes de generar (es rápida). Si el
    // coach pausó la IA, no generamos: limpiamos el overlay de carga y mostramos
    // el estado pausado. El backend además lo bloquea (403) como respaldo.
    if (coachConfig === null) return
    if (coachConfig.ia === false) { setApiDone(true); return }
    const key = checkinTs ?? ''
    if (key === lastTsRef.current) return
    lastTsRef.current = key
    generate()
  }, [checkinTs, generate, coachConfig])

  // Fetch justification lazily once session ID is known
  useEffect(() => {
    if (!sesionId) return
    let cancelled = false
    setResumen(null)
    setResumenLoading(true)
    apiGet(`/api/sessions/${sesionId}/resumen/`)
      .then(r => { if (!cancelled) setResumen(r) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setResumenLoading(false) })
    return () => { cancelled = true }
  }, [sesionId])

  const handleReady = useCallback(() => {
    setContentReady(true)
    Animated.timing(contentFade, { toValue: 1, duration: 480, useNativeDriver: true }).start()
  }, [contentFade])

  const handleSelectAlternativa = useCallback((alt: AlternativaEjercicio, motivo: string) => {
    if (!subTarget) return
    const { ejercicio, faseNombre, idx } = subTarget
    setSesion(prev => {
      if (!prev) return prev
      return {
        ...prev,
        fases: prev.fases.map(fase =>
          fase.nombre === faseNombre
            ? {
                ...fase,
                ejercicios: fase.ejercicios.map((ej, i) =>
                  i === idx ? { ...ej, ...alt } : ej
                ),
              }
            : fase
        ),
      }
    })
    const slotKey = `${faseNombre}:${idx}`
    setRegenCount(prev => ({ ...prev, [slotKey]: (prev[slotKey] ?? 0) + 1 }))
    setModifiedKeys(prev => {
      const next = new Set(prev)
      next.add(`${faseNombre}:${ejercicio.nombre}`)
      return next
    })
    if (sesionId) {
      apiPost(`/api/sessions/${sesionId}/sustituir/`, {
        original: ejercicio.nombre,
        elegido:  alt.nombre,
        motivo,
        fase:     faseNombre,
        nuevo:    alt,
      }).catch(() => {})
    }
    setSubTarget(null)
  }, [subTarget, sesionId])

  const handleEjecutar = useCallback(() => {
    if (!sesionId) return
    // Debounce: el doble tap apilaría 2 pantallas de ejecución en el stack.
    const now = Date.now()
    if (now - navTsRef.current < 700) return
    navTsRef.current = now
    // Fire-and-forget: marks session as started for analytics.
    // Navigation does not depend on this completing.
    apiPost(`/api/sessions/${sesionId}/iniciar/`, {}).catch(() => {})
    router.replace(`/(app)/ejecutar/${sesionId}`)
  }, [sesionId])

  const handleMarcarCompletada = useCallback(() => {
    if (!sesionId) return
    const now = Date.now()
    if (now - navTsRef.current < 700) return
    navTsRef.current = now
    router.replace(`/(app)/feedback/${sesionId}`)
  }, [sesionId])

  const handleCancelar = useCallback(() => {
    if (!sesion) {
      router.replace('/(app)/dashboard')
      return
    }
    Alert.alert(
      'Descartar rutina',
      'Puedes volver a generarla en cualquier momento desde el check-in.',
      [
        { text: 'Quedarse aquí', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => router.replace('/(app)/dashboard') },
      ]
    )
  }, [sesion])

  const handleAjusteResult = useCallback((nuevaSesion: Sesion) => {
    setSesion(nuevaSesion)
    setModifiedKeys(new Set())
    setRegenCount({})
    if (!sesionId) return
    setResumen(null)
    setResumenLoading(true)
    apiGet(`/api/sessions/${sesionId}/resumen/`)
      .then(setResumen)
      .catch(() => {})
      .finally(() => setResumenLoading(false))
  }, [sesionId])

  const rir          = sesion ? (10 - sesion.rpe_target).toFixed(0) : '—'

  const totalEjercicios = useMemo(
    () => sesion?.fases.flatMap(f => f.ejercicios).length ?? 0,
    [sesion],
  )
  const totalSeries = useMemo(() => {
    // El LLM nombra la fase principal de formas distintas ("principal",
    // "Bloque principal", etc.), así que filtrar por nombre exacto daba 0.
    // Contamos las series de trabajo (fases que NO son calentamiento/enfriamiento)
    // y, si eso diera 0, caemos a todas las fases. Number() protege valores no numéricos.
    const fases = sesion?.fases ?? []
    const isAux = (n: string) => /calent|enfri|vuelta|movil|estir/i.test(n || '')
    const sum = (arr: { series: number }[]) =>
      arr.reduce((s, ej) => s + (Number(ej.series) || 0), 0)
    const work = sum(fases.filter(f => !isAux(f.nombre)).flatMap(f => f.ejercicios))
    return work > 0 ? work : sum(fases.flatMap(f => f.ejercicios))
  }, [sesion])

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
        {coachPausaIa ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🧑‍🏫</Text>
            <Text style={styles.errorTitle}>{t('generate_coach_paused_title')}</Text>
            <Text style={styles.errorMessage}>
              {t('generate_coach_paused_body')}{coachNombre ? ` ${coachNombre}.` : '.'}
            </Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(app)/dashboard')}
            >
              <Text style={styles.backBtnText}>{t('common_back')}</Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>{t('common_error')}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={generate}>
              <Text style={styles.retryBtnText}>{t('common_retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(app)/dashboard')}
            >
              <Text style={styles.backBtnText}>{t('common_back')}</Text>
            </TouchableOpacity>
          </View>
        ) : sesion ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Top nav — botón de salida */}
            <View style={styles.topNav}>
              <TouchableOpacity
                style={styles.topNavBack}
                onPress={handleCancelar}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Descartar rutina y volver"
              >
                <Text style={styles.topNavBackText}>←</Text>
              </TouchableOpacity>
            </View>

            {/* Header */}
            <View style={styles.sessionHeader}>
              <Text style={styles.headerEyebrow}>TU ENTRENAMIENTO DE HOY</Text>
              <Text style={styles.sessionTitle}>{sesion.titulo}</Text>
              <Text style={styles.sessionMeta}>{formatDateES(lang)} · {sesion.duracion_total} {t('generate_mins_label')}</Text>
              {coachNombre ? (
                <View style={styles.coachBadge}>
                  <Text style={styles.coachBadgeIcon}>🧑‍🏫</Text>
                  <Text style={styles.coachBadgeText}>
                    {t('generate_coach_guided')} <Text style={styles.coachBadgeName}>{coachNombre}</Text>
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Justification card */}
            <EvidenciaCard resumen={resumen} loading={resumenLoading} />

            {/* Parameters grid */}
            <View style={styles.paramsSection}>
              <View style={styles.paramsRow}>
                <ParamCard
                  value={String(sesion.duracion_total)}
                  unit={t('generate_unit_minutes')}
                />
                <ParamCard
                  value={String(totalEjercicios)}
                  unit={t('generate_unit_exercises')}
                />
              </View>
              <View style={styles.paramsRow}>
                <ParamCard
                  value={String(totalSeries)}
                  unit={t('generate_unit_series')}
                />
                <ParamCard
                  value={`${sesion.rpe_target}/10`}
                  unit={t('generate_unit_intensity')}
                />
              </View>
            </View>

            {/* Trainer note */}
            {sesion.nota_del_entrenador ? (
              <View style={styles.trainerCard}>
                <View style={styles.trainerCardHeader}>
                  <Text style={styles.trainerIcon}>🧠</Text>
                  <Text style={styles.trainerLabel}>{t('generate_coach_label')}</Text>
                </View>
                <Text style={styles.trainerNote}>{sesion.nota_del_entrenador}</Text>
              </View>
            ) : null}

            {/* Phases */}
            <View style={styles.fasesSection}>
              <Text style={styles.sectionLabel}>PLAN DE ENTRENAMIENTO</Text>
              {sesion.fases.map((fase, idx) => (
                <FaseBlock
                  key={idx}
                  fase={fase}
                  defaultExpanded={fase.nombre === 'principal'}
                  expandedRef={faseExpandedRef}
                  modifiedKeys={modifiedKeys}
                  regenCount={regenCount}
                  onSustituir={(ej, fn, i) => setSubTarget({ ejercicio: ej, faseNombre: fn, idx: i })}
                />
              ))}
            </View>

            {/* CTA */}
            <View style={styles.ctaSection}>
              <TouchableOpacity style={styles.ctaPrimary} onPress={handleEjecutar} activeOpacity={0.88}>
                <Text style={styles.ctaPrimaryText}>{t('generate_btn_start')}</Text>
                <Text style={styles.ctaArrow}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaSecondary} onPress={() => setAjusteVisible(true)} activeOpacity={0.75}>
                <Text style={styles.ctaGearIcon}>⚙</Text>
                <Text style={styles.ctaSecondaryText}>{t('generate_btn_adjust')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaTerciary} onPress={handleMarcarCompletada}>
                <Text style={styles.ctaTerciaryText}>{t('generate_btn_complete')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : null}
      </Animated.View>

      <SubstitutionModal
        visible={subTarget !== null}
        ejercicio={subTarget?.ejercicio ?? null}
        faseNombre={subTarget?.faseNombre ?? ''}
        sesionId={sesionId}
        onSelect={handleSelectAlternativa}
        onClose={() => setSubTarget(null)}
      />

      <AjusteModal
        visible={ajusteVisible}
        sesion={sesion}
        sesionId={sesionId}
        onResult={handleAjusteResult}
        onClose={() => setAjusteVisible(false)}
      />
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

    // Top nav (back button)
    topNav: {
      flexDirection:  'row',
      alignItems:     'center',
      paddingBottom:  8,
    },
    topNavBack: {
      paddingVertical:   10,
      paddingHorizontal: 4,
      marginRight:       8,
    },
    topNavBackText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   22,
      color:      c.inkMuted,
      lineHeight: 26,
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
    sessionMeta: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   13,
      color:      c.inkMuted,
      letterSpacing: 0.1,
    },
    coachBadge: {
      flexDirection: 'row',
      alignItems:    'center',
      alignSelf:     'flex-start',
      gap:           6,
      marginTop:     12,
      paddingVertical:   5,
      paddingHorizontal: 10,
      borderRadius:  999,
      backgroundColor: 'rgba(79,140,255,0.1)',
      borderWidth:   1,
      borderColor:   'rgba(79,140,255,0.3)',
    },
    coachBadgeIcon: { fontSize: 12 },
    coachBadgeText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize:   12,
      color:      c.inkSecondary,
    },
    coachBadgeName: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      color:      c.accent,
    },

    // Params grid
    paramsSection: {
      gap:          10,
      marginBottom: 24,
    },
    paramsRow: {
      flexDirection: 'row',
      gap:           10,
    },

    // Stats (kept for StatChip reuse elsewhere)
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
      borderRadius:    RADII.md,
      padding:         16,
      marginBottom:    24,
      ...cardShadow(c.accent, 0.12),
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

    // CTA
    ctaSection: {
      gap: 10,
    },
    ctaPrimary: {
      backgroundColor: c.inkPrimary,   // inverso: oscuro en claro, casi-blanco en dark
      borderRadius:    16,
      paddingVertical: 17,
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             10,
    },
    ctaPrimaryText: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      16,
      color:         c.bg,
      letterSpacing: -0.2,
    },
    ctaArrow: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize:   18,
      color:      c.bg,
      lineHeight: 22,
    },
    ctaSecondary: {
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    16,
      paddingVertical: 15,
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             8,
    },
    ctaGearIcon: {
      fontSize:   16,
      color:      c.inkSecondary,
      lineHeight: 21,
    },
    ctaSecondaryText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize:   15,
      color:      c.inkSecondary,
    },
    ctaTerciary: {
      alignItems:      'center',
      paddingVertical:  10,
    },
    ctaTerciaryText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   13,
      color:      c.inkMuted,
    },
  })
}
