import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
  Easing,
  LayoutAnimation,
  FlatList,
  useWindowDimensions,
  Platform,
  UIManager,
  Image,
  Modal,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native'

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ─── Zyfit Score ring constants ────────────────────────────────────────────────
const RING_SIZE   = 120
const RING_R      = 50
const RING_STROKE = 9
const RING_CIRC   = 2 * Math.PI * RING_R
const RING_CX     = RING_SIZE / 2
const RING_CY     = RING_SIZE / 2
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { COLORS, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, localDateStr } from '../../../lib/api'
import StreakMilestoneModal from '../../../components/StreakMilestoneModal'

// ─── Daily motivational phrases ───────────────────────────────────────────────

const FRASES_DIARIAS = [
  'Hoy construyes lo que mañana agradeces.',
  'Tu esfuerzo de hoy tiene memoria.',
  'Cada sesión te hace más difícil de ignorar.',
  'Otra sesión, otra versión de ti.',
  'No se necesita perfecto. Se necesita presente.',
  'Aparecer ya es ganar la mitad.',
  'Tu cuerpo se adapta mientras descansas.',
  'La consistencia hace lo que la motivación no.',
  'Cada día que apareces, ganas algo.',
  'La disciplina es motivación con memoria.',
  'Lo que repites, lo que eres.',
  'Tus hábitos están escribiendo tu historia.',
  'Constante gana a perfecto, siempre.',
  'Más fuerte de lo que crees. En serio.',
  'Tu progreso no siempre se ve. Siempre existe.',
  'Tu cuerpo aprende. Tú también.',
  'Cada sesión deja una huella que no se borra.',
  'El esfuerzo de ayer ya está en tu cuerpo.',
  'Ya eres distinto a quien empezó aquí.',
  'No tienes que dar el cien. Solo aparecer.',
  'Entrenar con estrés es adaptabilidad real.',
  'Tu mente necesita esto más que tu cuerpo.',
  'El movimiento cambia el estado. Siempre.',
  'Días difíciles, sesiones que más importan.',
  'No pasa nada si hoy das menos. Da algo.',
  'Empezaste. Eso ya te pone delante de muchos.',
  'Esto ya no es motivación. Es identidad.',
  'Ya no eres el mismo que empezó aquí.',
  'Tu consistencia está construyendo algo permanente.',
  'Muévete. Tu versión futura te lo agradece.',
  'Sin prisa. Sin pausa. Hacia adelante.',
  'Hoy también cuenta.',
  'No necesitas más razones. Ya las tienes.',
  'Hoy también eres capaz. Lo sabes.',
  'Sigue. Siempre hay una razón para seguir.',
  'Lo que lograste esta semana no se borra.',
  'Lo que empezaste merece que lo termines.',
  'Nadie te puede quitar lo que ya entrenaste.',
  'El que persiste, transforma.',
  'Tu único competidor eres tú de ayer.',
  'Duele ahora. Orgullece después.',
  'No pares cuando estés cansado. Para cuando acabes.',
  'El cuerpo logra lo que la mente permite.',
  'Hoy defines quién eres mañana.',
  'Cada gota de sudor tiene un propósito.',
  'Lo ordinario hecho consistentemente se vuelve extraordinario.',
  'No busques la motivación. Conviértete en ella.',
  'Tu esfuerzo de hoy es tu ventaja de mañana.',
  'Ganar empieza por no rendirse hoy.',
  'Un día a la vez. Un rep a la vez.',
  'La versión que quieres ser ya existe — entrénala.',
  'Nadie recuerda los días que descansaron de más.',
  'Haz hoy lo que otros no harán.',
  'El dolor de hoy es la fuerza de mañana.',
  'Confía en el proceso aunque no veas los resultados.',
  'Cada entrenamiento es una promesa cumplida contigo mismo.',
]

/** Devuelve la frase correspondiente al día actual (misma frase todo el día, rota cada 24h) */
function getFraseDiaria(): string {
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return FRASES_DIARIAS[dayIndex % FRASES_DIARIAS.length]
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: number
  fecha: string
  respuesta_ia: { titulo?: string; duracion_total?: number }
  duracion_planificada: number
  feedback?: { cumplimiento: number }
}

/** Sesión completa usada por TuSemanaCard (viene de /api/sessions/) */
interface FullSession {
  id: number
  fecha: string
  respuesta_ia: { titulo?: string; duracion_total?: number; rpe_target?: number }
  duracion_planificada: number
  feedback?: { cumplimiento?: number; rpe_real?: number }
}

type DayState = 'past-done' | 'today' | 'future' | 'rest' | 'past-skip'
type EventTipo = 'competicion' | 'descanso' | 'otro'
interface WeekEvent { fecha: string; tipo: EventTipo }
const WEEK_EVENT_BG:   Record<EventTipo, string> = { competicion: '#ffaa32', descanso: '#a78bfa', otro: '#6ce5ff' }
const WEEK_EVENT_TEXT: Record<EventTipo, string> = { competicion: '#000',    descanso: '#fff',    otro: '#000' }

interface SemanaDay {
  fecha: string
  dia_abbr: string
  estado: 'entrenado' | 'hoy' | 'planificado' | 'descanso' | 'vacio'
  tipo_sesion: string | null
  is_today: boolean
}

interface CTAData {
  // A: listo · B: ya entrenó (ver resumen) · C: recuperación · D: primer entreno
  // E: sesión generada hoy sin terminar → continuar entrenamiento
  estado: 'A' | 'B' | 'C' | 'D' | 'E'
  pill_label: string
  pill_color: 'green' | 'neutral' | 'orange'
  titulo: string
  descripcion: string
  sesion_hoy_id: number | null
  run_sesion_hoy_id?: number | null  // RunSession (carrera libre), modelo separado de Session
  solo_feedback?: boolean  // estado E + terminó ejercicios sin feedback → ir directo a feedback
}

interface MetricaData {
  tipo: 'rpe' | 'consistencia' | 'progreso' | 'racha'
  label: string
  valor: number
  valor_display: string
  unidad: string
  descripcion: string
  progreso_pct: number
  tendencia: 'up' | 'down' | 'neutral'
}

interface ZyfitScoreData {
  valor: number | null
  descripcion: string | null
  has_data: boolean
  // TODO: el backend debe exponer los factores en /api/stats/dashboard/
  factores?: { consistencia: number; sueno: number; volumen: number }
}

interface CheckinHoy {
  calidad_sueno: number | null
  estado_animo: number | null
  hrv: number | null
}

interface RachaContextoAlerta {
  tipo: 'descanso_manana' | 'descansando' | 'retomar' | 'continuar'
  mensaje: string
  color: 'orange' | 'blue' | 'green'
}

interface RachaContexto {
  racha_actual: number
  dias_desde_ultima: number | null
  entrenado_hoy: boolean
  dias_entrenados_semana: number
  dias_descanso_semana: number
  alerta: RachaContextoAlerta | null
}

interface DashboardData {
  nombre: string
  saludo: string
  avatar?: string
  cta: CTAData
  semana_detalle: SemanaDay[]
  zyfit_score?: ZyfitScoreData
  insight_entrenador?: InsightPayload | null
  racha_actual?: number
}

interface InsightPayload {
  modo: 'empty' | 'first' | 'building' | 'full'
  mensaje: string
  fragmento: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function formatSessionDate(iso: string, lang: string): string {
  const d = new Date(iso + 'T00:00:00')
  const DAYS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const DAYS_EN   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (lang === 'en') {
    return `${DAYS_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`
  }
  return `${DAYS_ES[d.getDay()]}, ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

function formatHeaderDate(lang: string): string {
  const d = new Date()
  const DAYS_ES   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const DAYS_EN   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  if (lang === 'en') {
    return `${DAYS_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`
  }
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const MONTHS_LONG  = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre']
const DAYS_LONG    = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

/** Lunes de la semana que contiene hoy, desplazada por weekOffset semanas */
function getWeekMonday(weekOffset: number): Date {
  const today = new Date()
  const dow = today.getDay() // 0=Sun…6=Sat
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const mon = new Date(today)
  mon.setDate(today.getDate() + diffToMon + weekOffset * 7)
  mon.setHours(0, 0, 0, 0)
  return mon
}

/** Array de 7 fechas ISO (lun→dom) usando fecha LOCAL, no UTC */
function getWeekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return localDateStr(d)  // local date components, never toISOString()
  })
}

/** Suma (o resta) días a una fecha ISO usando fecha LOCAL, no UTC */
function addDaysIso(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return localDateStr(d)
}

/** "19–25 may" | "28 abr – 4 may" */
function formatWeekRange(monday: Date): string {
  const sun = new Date(monday)
  sun.setDate(monday.getDate() + 6)
  const d1 = monday.getDate(), m1 = MONTHS_SHORT[monday.getMonth()]
  const d2 = sun.getDate(),    m2 = MONTHS_SHORT[sun.getMonth()]
  return m1 === m2 ? `${d1}–${d2} ${m1}` : `${d1} ${m1} – ${d2} ${m2}`
}

/** "martes 19 de mayo" */
function formatDetailDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`
}

function getDayState(
  iso: string,
  today: string,
  sessionsByDate: Map<string, FullSession[]>,
  semanaDetalle: SemanaDay[],
  weekOffset: number,
): DayState {
  if (iso === today) return 'today'
  if (iso > today)   return 'future'
  if ((sessionsByDate.get(iso)?.length ?? 0) > 0) return 'past-done'
  if (weekOffset === 0) {
    const d = semanaDetalle.find(x => x.fecha === iso)
    if (d?.estado === 'descanso') return 'rest'
  }
  return 'past-skip'
}

function getDisciplineIcon(titulo?: string): string {
  if (!titulo) return '🏋️'
  const t = titulo.toLowerCase()
  if (/corr|run|cardio|aerob/.test(t))           return '🏃'
  if (/movil|flex|yoga|stretc|estira/.test(t))   return '🧘'
  if (/natac|swim|piscin/.test(t))               return '🏊'
  if (/cicl|bici|cycl/.test(t))                  return '🚴'
  if (/funcional|hiit|circuito/.test(t))         return '⚡'
  return '🏋️'
}

// ─── Sparkles Icon ────────────────────────────────────────────────────────────

function SparklesIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M19 3L19.8 5.2L22 6L19.8 6.8L19 9L18.2 6.8L16 6L18.2 5.2L19 3Z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M5 15L5.6 16.4L7 17L5.6 17.6L5 19L4.4 17.6L3 17L4.4 16.4L5 15Z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

function ZapIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Renderiza un mensaje destacando el fragmento recibido del backend.
 * Si el fragmento no se encuentra en el mensaje, devuelve el mensaje en secundario.
 */
function renderMensajeConFragmento(
  mensaje: string,
  fragmento: string,
  baseStyle: object,
  hiStyle: object,
): React.ReactNode {
  if (!fragmento) return <Text style={baseStyle}>{mensaje}</Text>
  const idx = mensaje.indexOf(fragmento)
  if (idx === -1) return <Text style={baseStyle}>{mensaje}</Text>
  return (
    <>
      {idx > 0 && <Text style={baseStyle}>{mensaje.slice(0, idx)}</Text>}
      <Text style={hiStyle}>{fragmento}</Text>
      {idx + fragmento.length < mensaje.length && (
        <Text style={baseStyle}>{mensaje.slice(idx + fragmento.length)}</Text>
      )}
    </>
  )
}

/**
 * Parsea texto con **highlight** y devuelve un array de elementos Text.
 * Las partes entre ** se renderizan en inkPrimary, el resto en inkSecondary.
 */
function parseHighlight(
  texto: string,
  baseStyle: object,
  highlightStyle: object,
): React.ReactNode[] {
  const parts = texto.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={highlightStyle}>{part}</Text>
      : <Text key={i} style={baseStyle}>{part}</Text>
  )
}

// ─── Bell Icon ────────────────────────────────────────────────────────────────

function BellIcon() {
  const { colors } = useTheme()
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={colors.inkSecondary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={colors.inkSecondary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Zyfit Score Card ─────────────────────────────────────────────────────────

function getZyfitRango(score: number): string {
  if (score >= 91) return 'Élite adaptativo'
  if (score >= 76) return 'Alto rendimiento'
  if (score >= 56) return 'Entrenando bien'
  if (score >= 31) return 'En ritmo'
  return 'Construyendo base'
}

function ZyfitScoreCard({
  scoreData,
  colors,
  styles,
}: {
  scoreData: ZyfitScoreData | undefined
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  const valor   = scoreData?.valor    ?? null
  const hasData = scoreData?.has_data ?? false
  const desc    = scoreData?.descripcion ?? null

  const [modalVisible, setModalVisible] = useState(false)

  // Animated offset: arranca en RING_CIRC (anillo vacío) → valor real
  const animOffset = useRef(new Animated.Value(RING_CIRC)).current
  const prevValorRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevValorRef.current === valor) return
    prevValorRef.current = valor
    const target = hasData && valor != null
      ? RING_CIRC * (1 - valor / 100)
      : RING_CIRC
    Animated.timing(animOffset, {
      toValue: target,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
  }, [valor, hasData])

  return (
    <View style={styles.zsCard}>
      {/* Label superior */}
      <Text style={styles.zsLabel}>ZYFIT SCORE</Text>

      {/* ── Fila: anillo izquierda + texto derecha ── */}
      <View style={styles.zsRow}>
        {/* Anillo */}
        <View style={styles.zsRingWrap}>
          {hasData && <View style={styles.zsRingGlow} />}
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_CX} cy={RING_CY} r={RING_R}
              fill="none" stroke={colors.borderDefault} strokeWidth={RING_STROKE}
            />
            <AnimatedCircle
              cx={RING_CX} cy={RING_CY} r={RING_R}
              fill="none"
              stroke={hasData ? colors.accent : 'rgba(79,140,255,0.20)'}
              strokeWidth={RING_STROKE} strokeLinecap="round"
              strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
              strokeDashoffset={animOffset}
              transform={`rotate(-90, ${RING_CX}, ${RING_CY})`}
            />
          </Svg>
          <View style={styles.zsRingCenter}>
            {hasData && valor != null ? (
              <>
                <Text style={styles.zsScore}>{valor}</Text>
                <Text style={styles.zsScoreSub}>/ 100</Text>
              </>
            ) : (
              <Text style={styles.zsScorePlaceholder}>—</Text>
            )}
          </View>
        </View>

        {/* Texto derecho */}
        <View style={styles.zsTextCol}>
          <Text style={styles.zsRango}>
            {hasData && valor != null ? getZyfitRango(valor) : 'Construyendo\ntu score'}
          </Text>
          <Text style={styles.zsDesc}>
            {hasData && desc ? desc : 'Completa 7 sesiones para ver tu Zyfit Score.'}
          </Text>
        </View>
      </View>

      {/* ── Barras de factores — solo cuando hay datos ── */}
      {hasData && (
        <View style={styles.zsFactores}>
          {([
            { label: 'Consistencia', key: 'consistencia' as const },
            { label: 'Sueño',        key: 'sueno'        as const },
            { label: 'Volumen',      key: 'volumen'      as const },
          ] as const).map(f => {
            // TODO: conectar valores reales desde el backend cuando exponga factores individuales
            const val = scoreData?.factores?.[f.key] ?? null
            const barColor = val == null ? colors.borderBright
              : val >= 70 ? colors.green
              : val >= 40 ? colors.orange
              : colors.red
            return (
              <View key={f.key} style={styles.zsFactorRow}>
                <Text style={[styles.zsFactorLabel, { color: colors.inkMuted }]}>{f.label}</Text>
                <View style={[styles.zsFactorBarBg, { backgroundColor: colors.borderDefault }]}>
                  {val != null && (
                    <View style={[styles.zsFactorBarFill, { width: `${val}%`, backgroundColor: barColor }]} />
                  )}
                </View>
                <Text style={[styles.zsFactorPct, { color: val != null ? barColor : colors.inkFaint }]}>
                  {val != null ? `${val}%` : '—'}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {/* ── Enlace explicación ── */}
      <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.7} style={styles.zsHowBtn}>
        <Text style={styles.zsHowText}>¿Cómo se calcula el Score? →</Text>
      </TouchableOpacity>

      {/* ── Modal explicación ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.zsModalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.zsModalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.zsModalTitle}>¿Cómo se calcula el Zyfit Score?</Text>
            <Text style={styles.zsModalBody}>
              El <Text style={styles.zsModalAccent}>Zyfit Score</Text> es una puntuación del 0 al 100 que refleja tu consistencia y calidad de entrenamiento reciente.{'\n\n'}
              <Text style={styles.zsModalBold}>📊 Consistencia (40%)</Text>{'\n'}
              Porcentaje de días entrenados vs. tu objetivo semanal en las últimas 4 semanas.{'\n\n'}
              <Text style={styles.zsModalBold}>💪 Calidad (35%)</Text>{'\n'}
              Promedio de cumplimiento y rating de tus sesiones recientes.{'\n\n'}
              <Text style={styles.zsModalBold}>🔥 Racha (25%)</Text>{'\n'}
              Tu racha actual penaliza si llevas días sin entrenar y premia la continuidad.{'\n\n'}
              El score se actualiza después de cada sesión completada.
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.zsModalCloseBtn}>
              <Text style={styles.zsModalCloseText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ width, height, borderRadius = 8, style }: {
  width: number | string
  height: number
  borderRadius?: number
  style?: object
}) {
  const { colors } = useTheme()
  // Pulso de opacidad (shimmer) para que el estado de carga se sienta vivo y no
  // como contenido congelado. useNativeDriver: la opacidad corre en el hilo nativo.
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
  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.glassBg,
          opacity: pulse,
        },
        style,
      ]}
    />
  )
}

// ─── Tu Semana — sub-components ───────────────────────────────────────────────

function DayPill({ state, isSelected, dayNumber, dayLetter, colors, eventTipo, inStreak }: {
  state: DayState
  isSelected: boolean
  dayNumber: number
  dayLetter: string
  colors: Colors
  eventTipo?: EventTipo
  /** Forma parte del tramo activo de la racha — el sombreado corrido (StreakTrack)
   * ya pinta el fondo compartido, así que esta pilla individual va transparente. */
  inStreak?: boolean
}) {
  const W = 34, H = 50, R = 14

  // Animación de brillo para competiciones (menos intensa que el calendario mensual)
  const glowAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (eventTipo !== 'competicion') { glowAnim.setValue(0); return }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [eventTipo])

  // Evento sobreescribe el estado visual
  if (eventTipo) {
    const bg   = WEEK_EVENT_BG[eventTipo]
    const text = WEEK_EVENT_TEXT[eventTipo]
    return (
      <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
        {eventTipo === 'competicion' && (
          <Animated.View style={{
            position: 'absolute', width: W, height: H, borderRadius: R,
            backgroundColor: bg,
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
          }} />
        )}
        <View style={{ width: W, height: H, borderRadius: R, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Text style={{ color: text, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 }}>{dayLetter}</Text>
          <Text style={{ color: text, fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, lineHeight: 16 }}>{dayNumber}</Text>
        </View>
      </View>
    )
  }

  if (state === 'today') {
    return (
      <View style={{
        width: W, height: H, borderRadius: R,
        backgroundColor: colors.accent,
        alignItems: 'center', justifyContent: 'center', gap: 2,
        shadowColor: colors.accent, shadowOpacity: 0.55,
        shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 5,
      }}>
        <Text style={{ color: colors.white, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 }}>{dayLetter}</Text>
        <Text style={{ color: colors.white, fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, lineHeight: 16 }}>{dayNumber}</Text>
      </View>
    )
  }

  if (state === 'past-done') {
    return (
      <View style={{
        width: W, height: H, borderRadius: R,
        // Dentro de un tramo de racha activa, el fondo/borde lo pinta el StreakTrack
        // corrido detrás de la fila — esta pilla queda transparente para no cortarlo.
        backgroundColor: inStreak ? 'transparent' : 'rgba(79,140,255,0.12)',
        borderWidth: isSelected ? 2 : (inStreak ? 0 : 1.5),
        borderColor: isSelected ? colors.accent : 'rgba(79,140,255,0.45)',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        shadowColor: isSelected ? colors.accent : 'transparent',
        shadowOpacity: isSelected ? 0.5 : 0,
        shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: isSelected ? 4 : 0,
      }}>
        <Text style={{ color: colors.accent, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 }}>{dayLetter}</Text>
        <Text style={{ color: colors.accent, fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, lineHeight: 16 }}>{dayNumber}</Text>
      </View>
    )
  }

  if (state === 'future') {
    return (
      <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Svg width={W} height={H} style={{ position: 'absolute' }}>
          <Rect x={2} y={2} width={W - 4} height={H - 4} rx={R - 1} ry={R - 1}
            fill="none" stroke={colors.borderBright}
            strokeWidth={1.5} strokeDasharray="3 2.5" />
        </Svg>
        <Text style={{ color: colors.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 }}>{dayLetter}</Text>
        <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, lineHeight: 16 }}>{dayNumber}</Text>
      </View>
    )
  }

  if (state === 'rest') {
    return (
      <View style={{
        width: W, height: H, borderRadius: R,
        backgroundColor: colors.glassBg,
        borderWidth: 1, borderColor: colors.borderDefault,
        alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <Text style={{ color: colors.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 }}>{dayLetter}</Text>
        <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, lineHeight: 16 }}>{dayNumber}</Text>
      </View>
    )
  }

  // past-skip
  return (
    <View style={{
      width: W, height: H, borderRadius: R,
      backgroundColor: colors.glassBg,
      borderWidth: 1, borderColor: colors.borderDefault,
      alignItems: 'center', justifyContent: 'center', gap: 2,
    }}>
      <Text style={{ color: colors.inkFaint, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.3 }}>{dayLetter}</Text>
      <Text style={{ color: colors.inkFaint, fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, lineHeight: 16 }}>{dayNumber}</Text>
    </View>
  )
}

function SessionRow({ session, colors }: { session: FullSession; colors: Colors }) {
  const titulo   = session.respuesta_ia?.titulo ?? 'Sesión'
  const duracion = session.respuesta_ia?.duracion_total ?? session.duracion_planificada ?? 0
  const rpe      = session.feedback?.rpe_real ?? session.respuesta_ia?.rpe_target ?? null
  const icon     = getDisciplineIcon(titulo)
  const meta     = [
    duracion > 0 ? `${duracion} min` : null,
    rpe != null  ? `RPE ${rpe}`      : null,
  ].filter(Boolean).join('  ·  ')

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.glassBg,
      borderWidth: 1, borderColor: colors.borderDefault,
      borderRadius: 12, padding: 10, marginBottom: 8,
    }}>
      {/* Ícono disciplina */}
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(79,140,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 18, lineHeight: 22 }}>{icon}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13,
          color: colors.inkPrimary, lineHeight: 18,
        }} numberOfLines={1}>{titulo}</Text>
        {!!meta && (
          <Text style={{
            fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
            color: colors.inkMuted, letterSpacing: 0.3, marginTop: 2,
          }}>{meta}</Text>
        )}
      </View>

      {/* Ver rutina */}
      <TouchableOpacity
        style={{
          paddingHorizontal: 10, paddingVertical: 6,
          borderWidth: 1, borderColor: colors.borderBright,
          borderRadius: 8,
        }}
        onPress={() => router.push({ pathname: '/(app)/historial', params: { fecha: session.fecha, ts: String(Date.now()) } } as any)}
        activeOpacity={0.7}
      >
        <Text style={{
          fontFamily: 'SpaceGrotesk-Medium', fontSize: 11,
          color: colors.inkSecondary,
        }}>Ver rutina →</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Tu Semana Card (Zone 1.5) ────────────────────────────────────────────────

function TuSemanaCard({
  semanaDetalle,
  sessions,
  runDates,
  racha,
  colors,
  styles,
}: {
  semanaDetalle: SemanaDay[]
  sessions: FullSession[]
  runDates: Set<string>
  racha?: number
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  const { width: screenW } = useWindowDimensions()
  // Usamos onLayout para medir el ancho exacto del container del FlatList.
  // Valor inicial aproximado para no renderizar en blanco el primer frame.
  const [flatWidth, setFlatWidth] = useState(screenW - 40)

  const today = useMemo(() => localDateStr(), [])

  // 53 semanas virtuales: −26 a +26 desde hoy, sin necesidad de resetear scroll
  const RANGE  = 26
  const CENTER = RANGE
  const weekOffsets = useMemo(
    () => Array.from({ length: RANGE * 2 + 1 }, (_, i) => i - RANGE),
    [],
  )

  const [currentIdx,   setCurrentIdx]   = useState(CENTER)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const flatRef = useRef<any>(null)

  const currentOffset = weekOffsets[currentIdx]
  useEffect(() => { setSelectedDate(null) }, [currentIdx])

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, FullSession[]>()
    sessions.forEach(s => {
      if (!map.has(s.fecha)) map.set(s.fecha, [])
      map.get(s.fecha)!.push(s)
    })
    return map
  }, [sessions])

  // "Día entrenado" para la racha = sesión CON feedback (mismo criterio que el backend
  // en _calcular_racha_realtime — no cualquier Session, ver project_dia_entrenado_feedback).
  const feedbackDates = useMemo(
    () => new Set(sessions.filter(s => s.feedback != null).map(s => s.fecha)),
    [sessions],
  )

  // Rango de fechas [inicio, fin] del tramo activo de la racha, para pintar el
  // sombreado corrido en la semana actual. null si no hay racha activa.
  const rachaRange = useMemo(() => {
    if (!racha || racha <= 0) return null
    const fin = feedbackDates.has(today) ? today : addDaysIso(today, -1)
    const inicio = addDaysIso(fin, -(racha - 1))
    return { inicio, fin }
  }, [racha, feedbackDates, today])

  // Footer — se actualiza cuando onMomentumScrollEnd confirma la página nueva
  const currMonday = useMemo(() => getWeekMonday(currentOffset), [currentOffset])
  const currDates  = useMemo(() => getWeekDates(currMonday),     [currMonday])

  // Eventos del mes visible — se recarga cuando cambia de mes
  const [eventos, setEventos] = useState<WeekEvent[]>([])
  const evYear  = currMonday.getFullYear()
  const evMonth = currMonday.getMonth() + 1
  useEffect(() => {
    let cancelled = false
    apiGet(`/api/eventos/?year=${evYear}&month=${evMonth}`)
      .then((res: any) => { if (!cancelled) setEventos(Array.isArray(res) ? res : []) })
      .catch(() => {})
    // Al deslizar de mes rápido: descartar respuestas obsoletas y evitar
    // setState tras desmontar.
    return () => { cancelled = true }
  }, [evYear, evMonth])

  const eventMap = useMemo(() => {
    const m = new Map<string, EventTipo>()
    for (const ev of eventos) { if (!m.has(ev.fecha)) m.set(ev.fecha, ev.tipo) }
    return m
  }, [eventos])
  const sesionesEstaSemana = useMemo(() =>
    currDates.reduce((t, iso) =>
      t + (sessionsByDate.get(iso)?.length ?? 0) + (runDates.has(iso) ? 1 : 0), 0),
    [currDates, sessionsByDate, runDates],
  )
  const diasDescansoSemana = useMemo(() =>
    currDates.filter(iso => iso <= today && (sessionsByDate.get(iso)?.length ?? 0) === 0).length,
    [currDates, today, sessionsByDate],
  )
  const motivacional = useMemo(() => {
    if (sesionesEstaSemana <= 1) return null
    if (sesionesEstaSemana >= 3 && sesionesEstaSemana <= 5)
      return sesionesEstaSemana % 2 === 0 ? '¡Vas muy bien!' : '¡Sigue así!'
    if (sesionesEstaSemana === 2 || diasDescansoSemana >= 2)
      return diasDescansoSemana % 2 === 0 ? '¡No desistas!' : '¡Aprieta!'
    return null
  }, [sesionesEstaSemana, diasDescansoSemana])

  const handleDayPress = useCallback((iso: string, state: DayState) => {
    if (state !== 'past-done') return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setSelectedDate(prev => (prev === iso ? null : iso))
  }, [])
  const detailSessions = selectedDate ? (sessionsByDate.get(selectedDate) ?? []) : []

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: flatWidth, offset: flatWidth * index, index }),
    [flatWidth],
  )

  // Al medir el ancho exacto, re-posiciona en la semana actual
  useEffect(() => {
    if (flatWidth > 0) {
      flatRef.current?.scrollToIndex({ index: currentIdx, animated: false })
    }
  }, [flatWidth])

  const renderItem = useCallback(
    ({ item: weekOffset }: { item: number }) => {
      const monday = getWeekMonday(weekOffset)
      const dates  = getWeekDates(monday)

      // Tramo continuo de la racha activa dentro de esta semana — solo aplica a la
      // semana actual, que es donde vive el concepto de "racha en curso".
      let streakStartIdx = -1, streakEndIdx = -1
      if (weekOffset === 0 && rachaRange) {
        dates.forEach((iso, i) => {
          if (iso >= rachaRange.inicio && iso <= rachaRange.fin) {
            if (streakStartIdx === -1) streakStartIdx = i
            streakEndIdx = i
          }
        })
      }
      const hasStreakTrack = streakStartIdx !== -1

      return (
        <View style={{ width: flatWidth, paddingHorizontal: 4 }}>
          <View style={styles.semDaysRow}>
            {hasStreakTrack && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 4,
                  height: 50,
                  left: `${(streakStartIdx / 7) * 100}%`,
                  width: `${((streakEndIdx - streakStartIdx + 1) / 7) * 100}%`,
                  borderRadius: 14,
                  backgroundColor: 'rgba(79,140,255,0.12)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(79,140,255,0.45)',
                }}
              />
            )}
            {dates.map((iso, idx) => {
              const state      = getDayState(iso, today, sessionsByDate, semanaDetalle, weekOffset)
              const count      = sessionsByDate.get(iso)?.length ?? 0
              const isSelected = selectedDate === iso
              const dayNumber  = parseInt(iso.slice(8, 10), 10)
              const eventTipo  = eventMap.get(iso)
              const inStreak   = hasStreakTrack && idx >= streakStartIdx && idx <= streakEndIdx
              return (
                <TouchableOpacity
                  key={iso}
                  style={styles.semDayCol}
                  onPress={() => handleDayPress(iso, state)}
                  disabled={state !== 'past-done'}
                  activeOpacity={0.75}
                >
                  <View style={{ position: 'relative' }}>
                    <DayPill state={state} isSelected={isSelected} dayNumber={dayNumber} dayLetter={DAY_LETTERS[idx]} colors={colors} eventTipo={eventTipo} inStreak={inStreak} />
                    {state === 'past-done' && count >= 2 && (
                      <View style={styles.semBadge}>
                        <Text style={styles.semBadgeText}>{count}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.semCheckArea}>
                    {state === 'past-done' && <Text style={styles.semCheckMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    },
    [flatWidth, today, sessionsByDate, semanaDetalle, selectedDate, styles, colors, handleDayPress, eventMap, rachaRange],
  )

  return (
    <View style={styles.semCard}>
      <View
        style={[styles.semDaysCard, { overflow: 'hidden' }]}
        onLayout={e => {
          const w = e.nativeEvent.layout.width
          if (w > 0 && w !== flatWidth) setFlatWidth(w)
        }}
      >
        <FlatList
          ref={flatRef}
          data={weekOffsets}
          keyExtractor={String}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={flatWidth}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          initialScrollIndex={CENTER}
          getItemLayout={getItemLayout}
          renderItem={renderItem}
          extraData={selectedDate}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / flatWidth)
            setCurrentIdx(Math.max(0, Math.min(weekOffsets.length - 1, idx)))
          }}
          nestedScrollEnabled
          bounces={false}
        />

        {/* Footer — actualiza solo cuando la página queda centrada */}
        <View style={[styles.semFooter, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }]}>
          {/* Streak badge — solo semana actual con racha > 0 */}
          {currentOffset === 0 && !!racha && racha > 0 && (
            <View style={styles.streakBadge}>
              <Text style={{ fontSize: 11 }}>🔥</Text>
              <Text style={[styles.streakCount, { color: colors.cyan }]}>{racha}</Text>
            </View>
          )}
          <Text style={styles.semFooterText}>
            {currentOffset !== 0 ? (
              <>
                <Text style={styles.semFooterCount}>{sesionesEstaSemana}</Text>
                <Text> {sesionesEstaSemana === 1 ? 'sesión' : 'sesiones'}  ·  </Text>
                <Text style={{ color: colors.inkMuted }}>{formatWeekRange(currMonday)}</Text>
              </>
            ) : sesionesEstaSemana === 0 ? (
              <>
                <Text style={styles.semFooterCount}>0</Text>
                <Text> sesiones esta semana  ·  </Text>
                <Text style={{ color: colors.accent }}>¡Vamos!</Text>
              </>
            ) : sesionesEstaSemana === 1 ? (
              <>
                <Text style={styles.semFooterCount}>1</Text>
                <Text> sesión esta semana  ·  </Text>
                <Text style={{ color: colors.accent }}>¡Vamos!</Text>
              </>
            ) : (
              <>
                <Text style={styles.semFooterCount}>{sesionesEstaSemana}</Text>
                <Text> sesiones esta semana</Text>
                {motivacional && (
                  <>
                    <Text>  ·  </Text>
                    <Text style={{ color: sesionesEstaSemana >= 3 && sesionesEstaSemana <= 5 ? colors.green : colors.orange }}>
                      {motivacional}
                    </Text>
                  </>
                )}
              </>
            )}
          </Text>
        </View>
      </View>

      {/* Panel de detalle */}
      {selectedDate !== null && (
        <View style={styles.semDetailWrap}>
          <View style={styles.semDivider} />
          <View style={styles.semDetailContent}>
            <Text style={styles.semDetailDate}>{formatDetailDate(selectedDate)}</Text>
            {detailSessions.map(s => (
              <SessionRow key={s.id} session={s} colors={colors} />
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Readiness Bar ───────────────────────────────────────────────────────────

function getReadinessLabel(sueno: number | null, animo: number | null, hrv: number | null): { label: string; color: string } {
  let score = 0; let count = 0
  if (sueno != null)  { score += sueno >= 7 ? 2 : sueno >= 5 ? 1 : 0; count++ }
  if (animo != null)  { score += animo >= 4 ? 2 : animo >= 3 ? 1 : 0; count++ }
  if (hrv   != null)  { score += hrv   >= 60 ? 2 : hrv >= 45 ? 1 : 0; count++ }
  if (count === 0) return { label: 'Sin datos', color: '#6b7280' }
  const ratio = score / (count * 2)
  if (ratio >= 0.7) return { label: 'Cuerpo listo', color: '#32c896' }
  if (ratio >= 0.4) return { label: 'Cuerpo precavido', color: '#ffaa32' }
  return { label: 'Cuerpo descansando', color: '#ff6b6b' }
}

function ReadinessBar({ checkin, colors }: { checkin: CheckinHoy; colors: Colors }) {
  const { label, color } = getReadinessLabel(checkin.calidad_sueno, checkin.estado_animo, checkin.hrv)
  const ANIMO_EMOJIS = ['', '😩', '😔', '😐', '😊', '🔥']
  return (
    <View style={[readinessStyles.wrap, { backgroundColor: colors.cardBg, borderColor: colors.borderDefault }]}>
      <View style={[readinessStyles.dot, { backgroundColor: color }]} />
      <Text style={[readinessStyles.label, { color }]}>{label}</Text>
      <View style={[readinessStyles.sep, { backgroundColor: colors.borderBright }]} />
      <View style={readinessStyles.dataRow}>
        {checkin.calidad_sueno != null && (
          <View style={readinessStyles.dataItem}>
            <Text style={readinessStyles.dataIcon}>🌙</Text>
            <Text style={[readinessStyles.dataVal, { color: colors.inkSecondary }]}>{checkin.calidad_sueno.toFixed(1)}h</Text>
          </View>
        )}
        {checkin.estado_animo != null && (
          <View style={readinessStyles.dataItem}>
            <Text style={readinessStyles.dataIcon}>{ANIMO_EMOJIS[checkin.estado_animo] ?? '😐'}</Text>
            <Text style={[readinessStyles.dataVal, { color: colors.inkSecondary }]}>{checkin.estado_animo}/5</Text>
          </View>
        )}
        {checkin.hrv != null && (
          <View style={readinessStyles.dataItem}>
            <Text style={readinessStyles.dataIcon}>💓</Text>
            <Text style={[readinessStyles.dataVal, { color: colors.inkSecondary }]}>{checkin.hrv}ms</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const readinessStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12, gap: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
  sep: { width: 1, height: 14 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' },
  dataItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dataIcon: { fontSize: 12, lineHeight: 16 },
  dataVal: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.3 },
})

// ─── CTA Card ─────────────────────────────────────────────────────────────────

function CTACard({
  cta,
  colors,
  styles,
  t,
}: {
  cta: CTAData
  colors: Colors
  styles: ReturnType<typeof makeStyles>
  t: (key: any) => string
}) {
  const { isDark } = useTheme()
  const PILL: Record<CTAData['pill_color'], { color: string; bg: string; border: string }> = {
    green:   { color: '#32c896', bg: 'rgba(50,200,150,0.12)',  border: 'rgba(50,200,150,0.30)'  },
    neutral: { color: colors.inkMuted, bg: colors.glassBg,    border: colors.borderDefault      },
    orange:  { color: '#ffaa32', bg: 'rgba(255,170,50,0.12)', border: 'rgba(255,170,50,0.30)'  },
  }

  const CARD_BORDER: Record<CTAData['estado'], string> = {
    A: 'rgba(79,140,255,0.35)',
    B: colors.borderBright,
    C: 'rgba(255,170,50,0.35)',
    D: 'rgba(79,140,255,0.35)',
    E: 'rgba(255,170,50,0.40)',
  }

  const pill = PILL[cta.pill_color]
  const isActive = cta.estado === 'A' || cta.estado === 'D' || cta.estado === 'E'

  // Título simplificado a 3 tipos de sesión
  const tipoSesion = useMemo(() => {
    const hay = (s: string) =>
      (cta.titulo + ' ' + cta.descripcion).toLowerCase().includes(s)
    if (hay('running') || hay('correr') || hay('cardio') || hay('carrera')) return 'Sesión de Running'
    if (hay('movilidad') || hay('flexibilidad') || hay('stretching') || hay('recuper')) return 'Sesión de Movilidad'
    return 'Sesión de Fuerza'
  }, [cta.titulo, cta.descripcion])

  function handlePress() {
    if (cta.estado === 'E' && cta.sesion_hoy_id != null) {
      // Terminó los ejercicios pero no dio feedback → directo a feedback.
      // Si no, retomar la ejecución (ejecutar reabre donde la dejó).
      if (cta.solo_feedback) {
        router.push(`/(app)/feedback/${cta.sesion_hoy_id}` as any)
      } else {
        router.push(`/(app)/ejecutar/${cta.sesion_hoy_id}` as any)
      }
    } else if (cta.estado === 'B') {
      if (cta.run_sesion_hoy_id != null) {
        // RunSession (carrera libre) → ir al resumen de la carrera
        router.push(`/(app)/run/resumen/${cta.run_sesion_hoy_id}` as any)
      } else {
        // Sesión gym/IA → historial del día
        router.push({ pathname: '/(app)/historial', params: { fecha: localDateStr(), ts: String(Date.now()) } } as any)
      }
    } else {
      router.push('/(app)/checkin')
    }
  }

  const btnLabel =
    cta.estado === 'E' && cta.solo_feedback ? 'Dar feedback' :
    cta.estado === 'E' ? 'Continuar entrenamiento' :
    cta.estado === 'B' && cta.run_sesion_hoy_id != null ? 'Ver resumen de tu carrera' :
    cta.estado === 'B' ? 'Ver resumen de tu sesión' :
    cta.estado === 'C' ? 'Iniciar recuperación activa' :
    cta.estado === 'D' ? 'Comenzar mi primer entrenamiento' :
    'Iniciar entrenamiento de hoy'

  return (
    <View style={[styles.ctaCard, { backgroundColor: isDark ? '#0E1C42' : colors.cardBg, borderColor: CARD_BORDER[cta.estado] }]}>
      {isActive && (
        <LinearGradient
          colors={['rgba(79,140,255,0.13)', 'transparent']}
          style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
        />
      )}

      {/* Pill */}
      <View style={[styles.ctaPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
        <View style={[styles.ctaPillDot, { backgroundColor: pill.color }]} />
        <Text style={[styles.ctaPillText, { color: pill.color }]}>
          {cta.pill_label.toUpperCase()}
        </Text>
      </View>

      {/* Tipo de sesión — una sola línea */}
      <Text style={styles.ctaTitle} numberOfLines={1}>{tipoSesion}</Text>

      {/* Descripción del backend: carga sugerida, días desde la última, cumplimiento… */}
      {!!cta.descripcion && (
        <Text
          style={{
            fontFamily: 'SpaceGrotesk-Regular',
            fontSize: 12.5,
            color: colors.inkSecondary,
            lineHeight: 17,
            marginTop: 6,
          }}
          numberOfLines={2}
        >
          {cta.descripcion}
        </Text>
      )}

      {/* Botón principal — siempre sólido con letras blancas */}
      <TouchableOpacity
        style={styles.ctaBtnWrap}
        onPress={handlePress}
        activeOpacity={0.88}
      >
        {cta.estado === 'C' ? (
          // Recuperación activa → naranja sólido
          <View style={[styles.ctaBtn, styles.ctaBtnSolidOrange]}>
            <Text style={styles.ctaBtnText}>{btnLabel}</Text>
          </View>
        ) : (
          // ENTRENAR / VER RESUMEN / PRIMER ENTRENO → gradient azul
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.ctaBtn, { borderRadius: 14 }]}
          >
            <Text style={styles.ctaBtnText}>{btnLabel}</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>

      {/* Botón secundario "Entrenar otra vez hoy" — solo en estado B */}
      {cta.estado === 'B' && (
        <TouchableOpacity
          style={[styles.ctaBtnWrap, { marginTop: 10 }]}
          onPress={() => router.push('/(app)/checkin')}
          activeOpacity={0.75}
        >
          <View style={styles.ctaBtnTrainAgain}>
            <Text style={styles.ctaBtnTextTrainAgain}>{t('dashboard_train_again')}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Botón secundario "Generar otra rutina" — solo en estado E */}
      {cta.estado === 'E' && (
        <TouchableOpacity
          style={[styles.ctaBtnWrap, { marginTop: 10 }]}
          onPress={() => router.push('/(app)/checkin')}
          activeOpacity={0.75}
        >
          <View style={styles.ctaBtnTrainAgain}>
            <Text style={styles.ctaBtnTextTrainAgain}>Generar otra rutina</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Helpers — fecha relativa ─────────────────────────────────────────────────

function relativeFecha(iso: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(iso + 'T00:00:00')
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7)  return `Hace ${diff} días`
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// ─── Última Sesión Card ───────────────────────────────────────────────────────

function UltimaSesionCard({ session, colors }: { session: FullSession; colors: Colors }) {
  const titulo       = session.respuesta_ia?.titulo ?? 'Sesión'
  const duracion     = session.respuesta_ia?.duracion_total ?? session.duracion_planificada ?? 0
  const cumplimiento = session.feedback?.cumplimiento ?? null
  const rpe          = session.feedback?.rpe_real ?? null
  const icono        = getDisciplineIcon(titulo)
  const fecha        = relativeFecha(session.fecha)
  const cumpColor    = cumplimiento == null ? colors.inkSecondary
    : cumplimiento >= 90 ? colors.green
    : cumplimiento >= 70 ? colors.orange
    : colors.red

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(app)/historial', params: { fecha: session.fecha, ts: String(Date.now()) } } as any)}
      activeOpacity={0.8}
      style={[ultimaStyles.wrap, { backgroundColor: colors.cardBg, borderColor: colors.borderDefault }]}
    >
      <Text style={[ultimaStyles.sectionLabel, { color: colors.inkMuted }]}>ÚLTIMA SESIÓN</Text>
      <View style={ultimaStyles.row}>
        <View style={ultimaStyles.iconBox}>
          <Text style={{ fontSize: 20 }}>{icono}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ultimaStyles.titulo, { color: colors.inkPrimary }]} numberOfLines={1}>{titulo}</Text>
          <Text style={[ultimaStyles.fecha, { color: colors.inkMuted }]}>{fecha}</Text>
        </View>
        <Text style={[ultimaStyles.chevron, { color: colors.inkFaint }]}>›</Text>
      </View>

      {/* Métricas — solo las que tienen datos */}
      {(duracion > 0 || cumplimiento != null || rpe != null) && (
        <View style={[ultimaStyles.metricsRow, { borderTopColor: colors.borderDefault }]}>
          {duracion > 0 && (
            <View style={ultimaStyles.metricItem}>
              <Text style={[ultimaStyles.metricVal, { color: colors.inkSecondary }]}>{duracion} min</Text>
              <Text style={[ultimaStyles.metricLabel, { color: colors.inkMuted }]}>DURACIÓN</Text>
            </View>
          )}
          {cumplimiento != null && (
            <View style={ultimaStyles.metricItem}>
              <Text style={[ultimaStyles.metricVal, { color: cumpColor }]}>{cumplimiento}%</Text>
              <Text style={[ultimaStyles.metricLabel, { color: colors.inkMuted }]}>CUMPLIMIENTO</Text>
            </View>
          )}
          {rpe != null && (
            <View style={ultimaStyles.metricItem}>
              <Text style={[ultimaStyles.metricVal, { color: colors.inkSecondary }]}>RPE {rpe}</Text>
              <Text style={[ultimaStyles.metricLabel, { color: colors.inkMuted }]}>ESFUERZO</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const ultimaStyles = StyleSheet.create({
  wrap: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 8,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(79,140,255,0.10)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  titulo: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, letterSpacing: -0.3, lineHeight: 19 },
  fecha:  { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.3, marginTop: 1 },
  chevron: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, flexShrink: 0 },
  metricsRow: {
    flexDirection: 'row', marginTop: 12, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricVal:  { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, letterSpacing: -0.3, lineHeight: 20 },
  metricLabel: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 7,
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2,
  },
})

// ─── Coach Message Card (Zone 5) ─────────────────────────────────────────────

function InsightCard({
  payload,
  colors,
  styles,
}: {
  payload: InsightPayload | null | undefined
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  // Siempre visible — en modo empty muestra el punto de partida
  const modo      = payload?.modo ?? 'empty'
  const mensaje   = payload?.mensaje ?? 'Tu entrenador está analizando tu semana.'
  const fragmento = payload?.fragmento ?? ''

  // empty usa ícono de rayo (inicio), resto usa sparkles
  const Icon = modo === 'empty'
    ? <ZapIcon color={colors.inkMuted} size={14} />
    : <SparklesIcon color={colors.accent} size={14} />

  const labelColor = modo === 'empty' ? colors.inkMuted : colors.accent

  const [modalVisible, setModalVisible] = useState(false)

  return (
    <View style={styles.z5Card}>
      {/* Tag: ícono + "TU ENTRENADOR" */}
      <View style={styles.z5Header}>
        {Icon}
        <Text style={[styles.z5Label, { color: labelColor }]}>TU ENTRENADOR</Text>
      </View>

      {/* Mensaje con fragmento destacado */}
      <Text style={styles.z5Text}>
        {renderMensajeConFragmento(mensaje, fragmento, styles.z5Text, styles.z5TextHighlight)}
      </Text>

      {/* Link a la pestaña Coach */}
      <TouchableOpacity
        onPress={() => router.push('/(app)/chat' as any)}
        activeOpacity={0.75}
        style={styles.z5CoachLink}
      >
        <Text style={styles.z5CoachLinkTxt}>Ver recomendaciones →</Text>
      </TouchableOpacity>

      {/* ── Enlace explicación ── */}
      <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.7} style={styles.z5HowBtn}>
        <Text style={styles.zsHowText}>¿Qué hace tu entrenador? →</Text>
      </TouchableOpacity>

      {/* ── Modal explicación ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.zsModalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.zsModalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.zsModalTitle}>¿Qué hace tu entrenador?</Text>
            <Text style={styles.zsModalBody}>
              Tu <Text style={styles.zsModalAccent}>entrenador Zyfit</Text> analiza todo lo que registras para darte un resumen claro de cómo vas y recomendaciones para tu próxima sesión.{'\n\n'}
              <Text style={styles.zsModalBold}>📥 Recopila tus datos</Text>{'\n'}
              Check-ins diarios, sesiones completadas, feedback (RPE, cumplimiento, molestias), rachas, sueño y nivel de fatiga.{'\n\n'}
              <Text style={styles.zsModalBold}>🧠 Interpreta tu momento</Text>{'\n'}
              Cruza esa información para entender cómo estás entrenando, recuperándote y progresando.{'\n\n'}
              <Text style={styles.zsModalBold}>💡 Te resume y recomienda</Text>{'\n'}
              Te devuelve un mensaje breve con lo más relevante de tu estado actual y qué conviene ajustar.{'\n\n'}
              Se actualiza con cada check-in y sesión, así que siempre refleja tu momento más reciente.
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.zsModalCloseBtn}>
              <Text style={styles.zsModalCloseText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// Racha recién alcanzada → siguiente reto a mostrar en el modal de celebración.
// Por ahora solo el hito de 7 días dispara la ventana (ver feedback/[id].tsx).
const RACHA_SIGUIENTE_RETO: Record<number, number> = { 7: 15 }

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors } = useTheme()
  const { t, lang } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<FullSession[]>([])
  const [sessionsError, setSessionsError] = useState(false)
  const [runDates, setRunDates] = useState<Set<string>>(new Set())
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [checkinHoy, setCheckinHoy] = useState<CheckinHoy | null>(null)
  const [streakMilestone, setStreakMilestone] = useState<{ racha: number; siguiente: number } | null>(null)
  const lastMilestoneKeyRef = useRef<string | null>(null)

  // ── Modal de racha al volver del feedback con un hito recién alcanzado ──────
  const { rachaHito, ts: milestoneTs } = useLocalSearchParams<{ rachaHito?: string; ts?: string }>()
  useEffect(() => {
    if (!rachaHito) return
    const key = milestoneTs ?? `once:${rachaHito}`
    if (lastMilestoneKeyRef.current === key) return
    lastMilestoneKeyRef.current = key
    const hito = parseInt(rachaHito, 10)
    const siguiente = RACHA_SIGUIENTE_RETO[hito]
    if (!Number.isNaN(hito) && siguiente) {
      setStreakMilestone({ racha: hito, siguiente })
    }
  }, [rachaHito, milestoneTs])

  const fetchSessions = useCallback(async () => {
    setSessionsError(false)
    try {
      // El calendario deslizable cubre ±26 semanas y no hay sesiones futuras:
      // basta una ventana de ~200 días hacia atrás. Acota el payload vs traer todo.
      const desde = new Date()
      desde.setDate(desde.getDate() - 200)
      const d = await apiGet(`/api/sessions/?desde=${localDateStr(desde)}`)
      setSessions(Array.isArray(d) ? d : (d.results ?? []))
    } catch {
      setSessionsError(true)
    }
  }, [])

  const fetchRunDates = useCallback(async () => {
    try {
      const desde = new Date()
      desde.setDate(desde.getDate() - 200)
      const d = await apiGet(`/api/runs/?desde=${localDateStr(desde)}&page_size=100`)
      const list: { started_at: string; status: string }[] = Array.isArray(d) ? d : (d.results ?? [])
      const dates = new Set(
        list.filter(r => r.status === 'completed').map(r => r.started_at.slice(0, 10))
      )
      setRunDates(dates)
    } catch {}
  }, [])

  const fetchDashboard = useCallback(async (cancelled?: { current: boolean }) => {
    try {
      setError(null)
      const res = await apiGet('/api/stats/dashboard/')
      if (cancelled?.current) return
      setData(res)
    } catch (e: any) {
      if (cancelled?.current) return
      setError(e.message ?? 'Error al cargar el dashboard')
    } finally {
      if (!cancelled?.current) setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchDashboard(undefined), fetchSessions(), fetchRunDates()])
    setRefreshing(false)
  }, [fetchDashboard, fetchSessions, fetchRunDates])

  // Fetch on initial mount AND every time the screen comes back into focus
  // (e.g. after returning from the checkin → generate flow or "Entrenar otra vez hoy")
  // cancelled ref prevents stale state writes if the screen loses focus before fetch completes
  useFocusEffect(
    useCallback(() => {
      const cancelled = { current: false }
      fetchDashboard(cancelled)
      fetchSessions()
      fetchRunDates()
      // Check-in del día para la readiness bar. Fire-and-forget.
      apiGet('/api/checkins/today/')
        .then((d: any) => {
          if (cancelled.current) return
          if (d && typeof d === 'object' && !d.detail) {
            setCheckinHoy({
              calidad_sueno: d.calidad_sueno != null ? Number(d.calidad_sueno) : null,
              estado_animo:  d.estado_animo  ?? null,
              hrv:           d.hrv           ?? null,
            })
          } else {
            setCheckinHoy(null)
          }
        })
        .catch(() => { if (!cancelled.current) setCheckinHoy(null) })
      // Conteo de notificaciones no leídas para el badge de la campana.
      // Fire-and-forget: si falla no rompe el dashboard.
      apiGet('/api/notificaciones/')
        .then((d: any) => {
          if (cancelled.current) return
          const list = Array.isArray(d) ? d : (d.results ?? [])
          setUnreadNotifs(list.filter((n: any) => !n.leida).length)
        })
        .catch(() => {})
      return () => { cancelled.current = true }
    }, [fetchDashboard, fetchSessions, fetchRunDates])
  )


  const ultimaSesion = useMemo(() => {
    const withFeedback = sessions.filter(s => s.feedback != null)
    if (withFeedback.length === 0) return null
    return withFeedback.reduce((a, b) => a.fecha > b.fecha ? a : b)
  }, [sessions])

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* ── Error state ── */}
        {!!error && !loading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── ZONA 1 — Header / Saludo inteligente ── */}
        <View style={styles.z1}>
          {/* Fila: [avatar] [saludo + frase] [campana] */}
          <View style={styles.z1TopRow}>
            {/* Avatar */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/perfil')}
              activeOpacity={0.8}
              style={styles.z1AvatarBtn}
            >
              {data?.avatar ? (
                <Image source={{ uri: data.avatar }} style={styles.z1AvatarImg} />
              ) : (
                <View style={styles.z1AvatarCircle}>
                  <Text style={styles.z1AvatarText}>
                    {(data?.nombre ?? '?').split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Saludo + frase en columna */}
            <View style={styles.z1TextCol}>
              {loading ? (
                <>
                  <Skeleton width={140} height={22} borderRadius={5} />
                  <Skeleton width={100} height={13} borderRadius={4} style={{ marginTop: 5 }} />
                </>
              ) : (
                <>
                  <Text style={styles.z1Saludo} numberOfLines={2}>{data?.saludo ?? ''}</Text>
                  <Text style={styles.z1Insight} numberOfLines={2}>{getFraseDiaria()}</Text>
                </>
              )}
            </View>

            {/* Bell */}
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => { setUnreadNotifs(0); router.push('/(app)/notificaciones') }}
              activeOpacity={0.7}
              accessibilityLabel={unreadNotifs > 0 ? `${unreadNotifs} notificaciones sin leer` : 'Notificaciones'}
              accessibilityRole="button"
            >
              <BellIcon />
              {unreadNotifs > 0 && (
                <View style={styles.bellBadge} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ZONA 1.5 — Tu Semana ── */}
        {loading ? (
          <View style={[styles.semCard, { opacity: 0.5 }]}>
            <View style={styles.semDaysCard}>
              <View style={styles.semDaysRow}>
                {[0,1,2,3,4,5,6].map(i => (
                  <View key={i} style={[styles.semDayCol, { gap: 4 }]}>
                    <Skeleton width={32} height={48} borderRadius={14} />
                    <Skeleton width={20} height={8} borderRadius={3} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <TuSemanaCard
            semanaDetalle={data?.semana_detalle ?? []}
            sessions={sessions}
            runDates={runDates}
            racha={data?.racha_actual}
            colors={colors}
            styles={styles}
          />
        )}

        {sessionsError && (
          <TouchableOpacity
            onPress={fetchSessions}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 6, marginTop: -8, marginBottom: 4 }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
              color: colors.inkMuted, letterSpacing: 0.3 }}>
              No se pudo cargar el historial · ↺ Reintentar
            </Text>
          </TouchableOpacity>
        )}

        {/* ── READINESS BAR — visible solo si hay check-in del día ── */}
        {!loading && checkinHoy && (
          <ReadinessBar checkin={checkinHoy} colors={colors} />
        )}

        {/* ── ZONA 2 — Card CTA principal ── */}
        {loading ? (
          <View style={styles.ctaCardSkeleton}>
            <Skeleton width={100} height={22} borderRadius={11} />
            <Skeleton width="70%" height={26} borderRadius={6} style={{ marginTop: 14 }} />
            <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={52} borderRadius={14} style={{ marginTop: 20 }} />
          </View>
        ) : !!data?.cta && (
          <CTACard cta={data.cta} colors={colors} styles={styles} t={t} />
        )}

        {/* ── Zyfit Score ── */}
        {loading ? (
          <View style={[styles.zsCard, { opacity: 0.5 }]}>
            <Skeleton width={90} height={9} borderRadius={4} style={{ alignSelf: 'center' }} />
            <Skeleton width={RING_SIZE} height={RING_SIZE} borderRadius={RING_SIZE / 2}
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignSelf: 'center', marginVertical: 8 }} />
            <Skeleton width={120} height={18} borderRadius={5} style={{ alignSelf: 'center' }} />
            <Skeleton width="85%" height={12} borderRadius={4} style={{ alignSelf: 'center', marginTop: 6 }} />
          </View>
        ) : (
          <ZyfitScoreCard scoreData={data?.zyfit_score} colors={colors} styles={styles} />
        )}

        {/* ── Última sesión completada con feedback ── */}
        {!loading && ultimaSesion && (
          <UltimaSesionCard session={ultimaSesion} colors={colors} />
        )}

        {/* ── ZONA 5 — Tu Entrenador ── */}
        {!loading && (
          <InsightCard
            payload={data?.insight_entrenador ?? null}
            colors={colors}
            styles={styles}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <StreakMilestoneModal
        visible={!!streakMilestone}
        racha={streakMilestone?.racha ?? 0}
        siguiente={streakMilestone?.siguiente ?? 0}
        onClose={() => setStreakMilestone(null)}
      />
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
    },

    // ── Zone 1 — Saludo inteligente
    z1: {
      marginBottom: 10,
      paddingTop: 4,
    },
    z1TopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    z1AvatarBtn: {
      width: 44,
      height: 44,
      flexShrink: 0,
    },
    z1AvatarImg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: c.accentLight,
    },
    z1AvatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.accentDark,
      borderWidth: 1.5,
      borderColor: c.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    z1AvatarText: {
      color: c.white,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 14,
      letterSpacing: -0.3,
    },
    z1TextCol: {
      flex: 1,
      gap: 3,
    },
    bellBtn: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 19,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      flexShrink: 0,
    },
    bellBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.cyan,
    },
    bellBadgeText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: '#fff',
      lineHeight: 12,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: 'rgba(108,229,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(108,229,255,0.25)',
    },
    streakCount: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 12,
      letterSpacing: -0.3,
    },
    z1Date: {
      // eliminado — ya no se muestra la fecha en el header
      display: 'none',
    },
    z1SkeletonWrap: {
      gap: 0,
    },
    z1Saludo: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      lineHeight: 24,
    },
    z1Insight: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkSecondary,
      lineHeight: 17,
      fontStyle: 'italic',
    },

    // ── Zone 2 — CTA Card
    ctaCardSkeleton: {
      // Fondo ligeramente más claro que el dashboard para distinguirse
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 22,
      padding: 22,
      marginBottom: 20,
    },
    ctaCard: {
      // Azul oscuro (navy) — distingue el card de entrenamiento del resto del
      // dashboard. El resto de colores/elementos (pill, título, botón) se mantienen.
      backgroundColor: '#0E1C42',
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 22,
      padding: 20,
      marginBottom: 20,
      overflow: 'hidden',
    },
    ctaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      gap: 5,
      marginBottom: 12,
    },
    ctaPillDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    ctaPillText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 1.5,
    },
    ctaTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      lineHeight: 24,
      // El espacio hacia el botón lo da `ctaBtnWrap.marginTop`. Antes este
      // marginBottom:16 dejaba el botón pegado a la descripción (que va debajo).
      marginBottom: 0,
    },
    ctaDesc: {
      // eliminado — ya no se muestra
      display: 'none',
    },
    ctaBtnWrap: {
      borderRadius: 14,
      overflow: 'hidden',
      marginTop: 18,
    },
    ctaBtnWrapSecondary: {
      overflow: 'visible',
    },
    ctaBtn: {
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Botón sólido naranja (estado C — recuperación activa)
    ctaBtnSolidOrange: {
      backgroundColor: '#ffaa32',
      borderRadius: 14,
    },
    ctaBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      color: '#ffffff',
      letterSpacing: 0.2,
    },
    // Botón secundario "Entrenar otra vez hoy" — borde visible + texto subrayado
    ctaBtnTrainAgain: {
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 14,
    },
    ctaBtnTextTrainAgain: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkSecondary,
      letterSpacing: 0.1,
      textDecorationLine: 'underline',
    },

    // Section container (shared)
    section: {
      marginBottom: 20,
    },

    // ── Tu Semana Card (Zone 1.5)
    semCard: {
      // Sin fondo — usa el fondo del dashboard directamente
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 20,
      paddingTop: 0,
      paddingHorizontal: 0,
      paddingBottom: 8,
      marginBottom: 12,
      overflow: 'hidden',
    },
    semDaysCard: {
      // Sin fondo — el calendario se integra directo con el fondo del dashboard
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 18,
      paddingVertical: 10,
      paddingHorizontal: 0,   // gestionado por cada panel del FlatList
    },
    semLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    semDaysRow: {
      flexDirection: 'row',
    },
    semDayCol: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 1,
      gap: 5,
    },
    semDayLetter: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    semCheckArea: {
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    semCheckMark: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 10,
      color: c.accent,
      lineHeight: 14,
    },
    semBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.accent,
      borderWidth: 1.5,
      borderColor: c.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    semBadgeText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      color: '#fff',
      lineHeight: 11,
    },
    semFooter: {
      marginTop: 6,
      paddingTop: 8,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    semFooterText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
      textAlign: 'center',
    },
    semFooterCount: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 12,
      color: c.inkSecondary,
    },
    semDivider: {
      height: 1,
      backgroundColor: c.borderDefault,
      marginTop: 14,
      marginBottom: 14,
    },
    semDetailWrap: {
      overflow: 'hidden',
    },
    semDetailContent: {
      paddingBottom: 4,
    },
    semDetailDate: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 10,
    },

    // ── Zyfit Score Card
    zsCard: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 22,
      paddingVertical: 16,
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 8,
      overflow: 'hidden',
    },
    zsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    zsRingWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    zsRingGlow: {
      position: 'absolute',
      width: RING_SIZE + 20,
      height: RING_SIZE + 20,
      borderRadius: (RING_SIZE + 20) / 2,
      backgroundColor: 'transparent',
      shadowColor: '#4f8cff',
      shadowOpacity: 0.30,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    zsRingCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    zsTextCol: {
      flex: 1,
      gap: 6,
    },
    zsScore: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 34,
      color: c.inkPrimary,
      letterSpacing: -1,
      lineHeight: 38,
    },
    zsScoreSub: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkMuted,
      letterSpacing: 0.5,
      textAlign: 'center',
      marginTop: -2,
    },
    zsScorePlaceholder: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      color: c.inkFaint,
      lineHeight: 34,
    },
    zsLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2.5,
      textTransform: 'uppercase',
    },
    zsRango: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      lineHeight: 26,
    },
    zsDesc: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkSecondary,
      lineHeight: 18,
    },
    zsHowBtn: {
      alignSelf: 'center',
      paddingVertical: 2,
    },
    zsHowText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      color: c.accent,
      letterSpacing: 0.1,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    // Modal
    zsModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    zsModalCard: {
      backgroundColor: c.sheetBg,
      borderWidth: 1,
      borderColor: 'rgba(79,140,255,0.30)',
      borderRadius: 24,
      padding: 24,
      width: '100%',
      gap: 14,
    },
    zsModalTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      color: c.inkPrimary,
      letterSpacing: -0.4,
      lineHeight: 24,
    },
    zsModalBody: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 21,
    },
    zsModalAccent: {
      color: c.accent,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    zsModalBold: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    zsModalCloseBtn: {
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 4,
    },
    zsModalCloseText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      color: '#ffffff',
      letterSpacing: 0.2,
    },

    // ── Zone 5 — Tu Entrenador
    z5Card: {
      backgroundColor: c.cardBg,           // fondo secundario del card
      borderWidth: 0.5,
      borderColor: c.borderDefault,
      borderLeftWidth: 1.5,                 // borde izquierdo accent
      borderLeftColor: c.accent,
      borderRadius: 14,
      borderTopLeftRadius: 6,              // radio menor en lado del borde accent
      borderBottomLeftRadius: 6,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 28,
      gap: 8,
    },
    z5Header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    z5Label: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.accent,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    z5HowBtn: {
      alignSelf: 'center',
      paddingVertical: 2,
    },
    z5CoachLink: {
      alignSelf: 'flex-start',
    },
    z5CoachLinkTxt: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13,
      color: c.accent,
      letterSpacing: -0.2,
    },
    z5Text: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 21,
      letterSpacing: -0.1,
    },
    z5TextHighlight: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13,
      color: c.inkPrimary,
      lineHeight: 21,
      letterSpacing: -0.1,
    },

    // ── Zyfit Score — Factor bars
    zsFactores: {
      gap: 8,
    },
    zsFactorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    zsFactorLabel: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      letterSpacing: -0.1,
      width: 90,
    },
    zsFactorBarBg: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      overflow: 'hidden',
    },
    zsFactorBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    zsFactorPct: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.5,
      width: 32,
      textAlign: 'right',
    },

    // Error / empty states
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.2)',
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: 'rgba(255,68,68,0.15)',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 10,
    },
    retryText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
    },
    emptyBox: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyText: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      textAlign: 'center',
    },
  })
}
