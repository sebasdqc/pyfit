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
  Platform,
  UIManager,
  StyleProp,
  ViewStyle,
} from 'react-native'

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ─── Zyfit Score ring constants ────────────────────────────────────────────────
const RING_SIZE   = 120
const RING_R      = 50
const RING_STROKE = 9
const RING_CIRC   = 2 * Math.PI * RING_R
const RING_CX     = RING_SIZE / 2
const RING_CY     = RING_SIZE / 2
import { router } from 'expo-router'
import { COLORS, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, localDateStr } from '../../../lib/api'

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

interface SemanaDay {
  fecha: string
  dia_abbr: string
  estado: 'entrenado' | 'hoy' | 'planificado' | 'descanso' | 'vacio'
  tipo_sesion: string | null
  is_today: boolean
}

interface CTAData {
  estado: 'A' | 'B' | 'C' | 'D'
  pill_label: string
  pill_color: 'green' | 'neutral' | 'orange'
  titulo: string
  descripcion: string
  sesion_hoy_id: number | null
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
  nivel: string
  puntos_totales: number
  racha_actual: number
  racha_contexto?: RachaContexto
  fatiga_porcentaje: number
  volumen_porcentaje: number
  dias_entrenados: string[]
  ultimas_sesiones: Session[]
  total_sesiones: number
  saludo: string
  insight: string
  cta: CTAData
  semana_detalle: SemanaDay[]
  metrica?: MetricaData
  zyfit_score?: ZyfitScoreData
  insight_entrenador?: string | null
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
  const valor    = scoreData?.valor    ?? null
  const hasData  = scoreData?.has_data ?? false
  const desc     = scoreData?.descripcion ?? null

  // Animated offset: arranca en RING_CIRC (anillo vacío) → valor real
  const animOffset = useRef(new Animated.Value(RING_CIRC)).current

  useEffect(() => {
    const target = hasData && valor != null
      ? RING_CIRC * (1 - valor / 100)
      : RING_CIRC
    Animated.timing(animOffset, {
      toValue: target,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,   // SVG no soporta native driver
    }).start()
  }, [valor, hasData])

  return (
    <View style={styles.zsCard}>
      {/* Gradiente de fondo sutil */}
      <LinearGradient
        colors={['rgba(79,140,255,0.10)', 'transparent']}
        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
      />

      {/* Label superior */}
      <Text style={styles.zsLabel}>ZYFIT SCORE</Text>

      {/* ── Anillo de progreso — centrado y grande ── */}
      <View style={styles.zsRingWrap}>
        {/* Glow exterior cuando hay datos */}
        {hasData && (
          <View style={styles.zsRingGlow} />
        )}

        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Track de fondo */}
          <Circle
            cx={RING_CX} cy={RING_CY} r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={RING_STROKE}
          />
          {/* Arco de progreso */}
          <AnimatedCircle
            cx={RING_CX} cy={RING_CY} r={RING_R}
            fill="none"
            stroke={hasData ? colors.accent : 'rgba(79,140,255,0.20)'}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
            strokeDashoffset={animOffset}
            transform={`rotate(-90, ${RING_CX}, ${RING_CY})`}
          />
        </Svg>

        {/* Número centrado dentro del anillo */}
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

      {/* ── Rango y descripción ── */}
      <Text style={styles.zsRango}>
        {hasData && valor != null ? getZyfitRango(valor) : 'Construyendo tu score'}
      </Text>
      <Text style={styles.zsDesc}>
        {hasData && desc
          ? desc
          : 'Completa 7 sesiones para ver tu Zyfit Score.'}
      </Text>
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
  return (
    <View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.glassBg,
        },
        style,
      ]}
    />
  )
}

// ─── Tu Semana — sub-components ───────────────────────────────────────────────

function DayCircle({ state, isSelected, dayNumber, colors }: {
  state: DayState
  isSelected: boolean
  dayNumber: number
  colors: Colors
}) {
  const S = 34

  if (state === 'today') {
    // Relleno azul brillante + número blanco
    return (
      <View style={{
        width: S, height: S, borderRadius: S / 2,
        backgroundColor: colors.accent,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.accent, shadowOpacity: 0.55,
        shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
        elevation: 5,
      }}>
        <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'SpaceGrotesk-Bold', lineHeight: 16 }}>
          {dayNumber}
        </Text>
      </View>
    )
  }

  if (state === 'past-done') {
    // Borde azul + tinte + número en azul
    return (
      <View style={{
        width: S, height: S, borderRadius: S / 2,
        backgroundColor: 'rgba(79,140,255,0.12)',
        borderWidth: isSelected ? 2 : 1.5,
        borderColor: isSelected ? colors.accent : 'rgba(79,140,255,0.45)',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: isSelected ? colors.accent : 'transparent',
        shadowOpacity: isSelected ? 0.5 : 0,
        shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
        elevation: isSelected ? 4 : 0,
      }}>
        <Text style={{ color: colors.accent, fontSize: 12, fontFamily: 'SpaceGrotesk-Bold', lineHeight: 16 }}>
          {dayNumber}
        </Text>
      </View>
    )
  }

  if (state === 'future') {
    // Borde punteado + número muy tenue
    return (
      <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={S} height={S} style={{ position: 'absolute' }}>
          <Circle cx={S / 2} cy={S / 2} r={S / 2 - 2}
            fill="none" stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5} strokeDasharray="3 2.5" />
        </Svg>
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: 'SpaceGrotesk-Medium', lineHeight: 16 }}>
          {dayNumber}
        </Text>
      </View>
    )
  }

  if (state === 'rest') {
    // Borde sutil + número muy tenue
    return (
      <View style={{
        width: S, height: S, borderRadius: S / 2,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, fontFamily: 'SpaceGrotesk-Medium', lineHeight: 16 }}>
          {dayNumber}
        </Text>
      </View>
    )
  }

  // past-skip
  return (
    <View style={{
      width: S, height: S, borderRadius: S / 2,
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12, fontFamily: 'SpaceGrotesk-Medium', lineHeight: 16 }}>
        {dayNumber}
      </Text>
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
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
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
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
          borderRadius: 8,
        }}
        onPress={() => router.push({ pathname: '/(app)/historial', params: { fecha: session.fecha } } as any)}
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
  colors,
  styles,
}: {
  semanaDetalle: SemanaDay[]
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  const [sessions,     setSessions]     = useState<FullSession[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    apiGet('/api/sessions/')
      .then((d: any) => setSessions(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
  }, [])

  const today     = useMemo(() => localDateStr(), [])  // fecha LOCAL, no UTC
  const monday    = useMemo(() => getWeekMonday(0), [])
  const weekDates = useMemo(() => getWeekDates(monday), [monday])

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, FullSession[]>()
    sessions.forEach(s => {
      if (!map.has(s.fecha)) map.set(s.fecha, [])
      map.get(s.fecha)!.push(s)
    })
    return map
  }, [sessions])

  function handleDayPress(iso: string, state: DayState) {
    if (state !== 'past-done') return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setSelectedDate(prev => (prev === iso ? null : iso))
  }

  const detailSessions = selectedDate ? (sessionsByDate.get(selectedDate) ?? []) : []

  // Total de sesiones en los 7 días de esta semana
  const sesionesEstaSemana = useMemo(() =>
    weekDates.reduce((total, iso) => total + (sessionsByDate.get(iso)?.length ?? 0), 0),
    [weekDates, sessionsByDate]
  )

  return (
    <View style={styles.semCard}>
      {/* Label */}
      <Text style={styles.semLabel}>TU SEMANA</Text>

      {/* Grid de días */}
      <View style={[styles.semDaysRow, { marginTop: 14 }]}>
        {weekDates.map((iso, idx) => {
          const state      = getDayState(iso, today, sessionsByDate, semanaDetalle, 0)
          const count      = sessionsByDate.get(iso)?.length ?? 0
          const isSelected = selectedDate === iso

          const dayNumber = parseInt(iso.slice(8, 10), 10)

          return (
            <TouchableOpacity
              key={iso}
              style={styles.semDayCol}
              onPress={() => handleDayPress(iso, state)}
              disabled={state !== 'past-done'}
              activeOpacity={0.75}
            >
              {/* Letra del día */}
              <Text style={[styles.semDayLetter, iso === today && { color: colors.accent }]}>
                {DAY_LETTERS[idx]}
              </Text>

              {/* Círculo con número del día */}
              <View style={{ position: 'relative' }}>
                <DayCircle state={state} isSelected={isSelected} dayNumber={dayNumber} colors={colors} />
                {state === 'past-done' && count >= 2 && (
                  <View style={styles.semBadge}>
                    <Text style={styles.semBadgeText}>{count}</Text>
                  </View>
                )}
              </View>

              {/* Check debajo del círculo — solo para días entrenados pasados */}
              <View style={styles.semCheckArea}>
                {state === 'past-done' && (
                  <Text style={styles.semCheckMark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Footer — contador de sesiones de la semana */}
      <View style={styles.semFooter}>
        <Text style={styles.semFooterText}>
          {sesionesEstaSemana === 0 ? (
            <>
              <Text style={styles.semFooterCount}>0</Text>
              <Text> sesiones esta semana  ·  </Text>
              <Text style={{ color: colors.accent }}>¡Vamos!</Text>
            </>
          ) : sesionesEstaSemana === 1 ? (
            <>
              <Text style={styles.semFooterCount}>1</Text>
              <Text> sesión esta semana</Text>
            </>
          ) : (
            <>
              <Text style={styles.semFooterCount}>{sesionesEstaSemana}</Text>
              <Text> sesiones esta semana</Text>
            </>
          )}
        </Text>
      </View>

      {/* Panel de detalle — visible solo cuando hay un día seleccionado */}
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
  const PILL: Record<CTAData['pill_color'], { color: string; bg: string; border: string }> = {
    green:   { color: '#32c896', bg: 'rgba(50,200,150,0.12)',  border: 'rgba(50,200,150,0.30)'  },
    neutral: { color: colors.inkMuted, bg: colors.glassBg,    border: colors.borderDefault      },
    orange:  { color: '#ffaa32', bg: 'rgba(255,170,50,0.12)', border: 'rgba(255,170,50,0.30)'  },
  }

  const CARD_BORDER: Record<CTAData['estado'], string> = {
    A: 'rgba(79,140,255,0.35)',
    B: 'rgba(255,255,255,0.14)',
    C: 'rgba(255,170,50,0.35)',
    D: 'rgba(79,140,255,0.35)',
  }

  const pill = PILL[cta.pill_color]
  const isActive = cta.estado === 'A' || cta.estado === 'D'

  function handlePress() {
    if (cta.estado === 'B') {
      router.push('/(app)/historial')
    } else {
      router.push('/(app)/checkin')
    }
  }

  const btnLabel =
    cta.estado === 'B' ? 'Ver resumen de tu sesión' :
    cta.estado === 'C' ? 'Iniciar recuperación activa' :
    cta.estado === 'D' ? 'Comenzar mi primer entrenamiento' :
    'Iniciar entrenamiento de hoy'

  return (
    <View style={[styles.ctaCard, { borderColor: CARD_BORDER[cta.estado] }]}>
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

      {/* Title */}
      <Text style={styles.ctaTitle}>{cta.titulo}</Text>

      {/* Description */}
      <Text style={styles.ctaDesc}>{cta.descripcion}</Text>

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
    </View>
  )
}

// ─── Coach Message Card (Zone 5) ─────────────────────────────────────────────

function InsightCard({
  texto,
  colors,
  styles,
}: {
  texto: string | null
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  // Si no hay texto (< 3 semanas de historial) no se muestra el card
  if (!texto) return null

  const baseStyle    = styles.z5Text
  const hiStyle      = styles.z5TextHighlight

  return (
    <View style={styles.z5Card}>
      {/* Header row: ícono + label */}
      <View style={styles.z5Header}>
        <SparklesIcon color={colors.accent} size={16} />
        <Text style={styles.z5Label}>TU ENTRENADOR</Text>
      </View>

      {/* Mensaje con fragmento destacado */}
      <Text style={baseStyle}>
        {parseHighlight(texto, baseStyle, hiStyle)}
      </Text>
    </View>
  )
}

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

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null)
      const res = await apiGet('/api/stats/dashboard/')
      setData(res)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchDashboard()
    setRefreshing(false)
  }, [fetchDashboard])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])


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
        {/* ── ZONA 1 — Header / Saludo inteligente ── */}
        <View style={styles.z1}>
          {/* Bell — top right */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/(app)/notificaciones')}
            activeOpacity={0.7}
          >
            <BellIcon />
          </TouchableOpacity>

          {/* Date */}
          <Text style={styles.z1Date}>{formatHeaderDate(lang)}</Text>

          {/* Greeting */}
          {loading ? (
            <View style={styles.z1SkeletonWrap}>
              <Skeleton width="80%" height={30} borderRadius={6} />
              <Skeleton width="55%" height={30} borderRadius={6} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <Text style={styles.z1Saludo}>{data?.saludo ?? ''}</Text>
          )}

          {/* Frase motivacional diaria */}
          {loading ? (
            <Skeleton width="65%" height={14} borderRadius={4} style={{ marginTop: 14 }} />
          ) : (
            <Text style={styles.z1Insight}>{getFraseDiaria()}</Text>
          )}
        </View>

        {/* ── ZONA 1.5 — Tu Semana ── */}
        {loading ? (
          <View style={[styles.semCard, { opacity: 0.5 }]}>
            <Skeleton width={70} height={9} borderRadius={4} />
            <View style={[styles.semDaysRow, { marginTop: 14 }]}>
              {[0,1,2,3,4,5,6].map(i => (
                <View key={i} style={[styles.semDayCol, { gap: 4 }]}>
                  <Skeleton width={12} height={9} borderRadius={3} />
                  <Skeleton width={32} height={32} borderRadius={16} />
                  <Skeleton width={20} height={8} borderRadius={3} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <TuSemanaCard
            semanaDetalle={data?.semana_detalle ?? []}
            colors={colors}
            styles={styles}
          />
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
            <View style={{ width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
              backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)', alignSelf: 'center', marginVertical: 8 }} />
            <Skeleton width={120} height={18} borderRadius={5} style={{ alignSelf: 'center' }} />
            <Skeleton width="85%" height={12} borderRadius={4} style={{ alignSelf: 'center', marginTop: 6 }} />
          </View>
        ) : (
          <ZyfitScoreCard scoreData={data?.zyfit_score} colors={colors} styles={styles} />
        )}

        {/* ── ZONA 5 — Tu Entrenador ── */}
        {!loading && (
          <InsightCard
            texto={data?.insight_entrenador ?? null}
            colors={colors}
            styles={styles}
          />
        )}

        <View style={{ height: 32 }} />
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
    },

    // ── Zone 1 — Saludo inteligente
    z1: {
      marginBottom: 32,
      paddingTop: 4,
    },
    bellBtn: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      zIndex: 1,
    },
    z1Date: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkMuted,
      letterSpacing: 0.4,
      marginBottom: 14,
      textTransform: 'uppercase',
    },
    z1SkeletonWrap: {
      gap: 0,
    },
    z1Saludo: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      color: c.inkPrimary,
      letterSpacing: -0.8,
      lineHeight: 36,
      marginBottom: 10,
      paddingRight: 48,
    },
    z1Insight: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      lineHeight: 20,
      fontStyle: 'italic',
    },

    // ── Zone 2 — CTA Card
    ctaCardSkeleton: {
      // Fondo ligeramente más claro que el dashboard (#000) para distinguirse
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      borderRadius: 22,
      padding: 22,
      marginBottom: 20,
    },
    ctaCard: {
      // Fondo ligeramente más claro que el dashboard (#000) para distinguirse
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 22,
      padding: 22,
      marginBottom: 20,
      overflow: 'hidden',
    },
    ctaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
      marginBottom: 16,
    },
    ctaPillDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    ctaPillText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 1.5,
    },
    ctaTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      color: c.inkPrimary,
      letterSpacing: -0.6,
      lineHeight: 28,
      marginBottom: 8,
    },
    ctaDesc: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkMuted,
      lineHeight: 19,
      marginBottom: 20,
    },
    ctaBtnWrap: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    ctaBtnWrapSecondary: {
      overflow: 'visible',
    },
    ctaBtn: {
      paddingVertical: 16,
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
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
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
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 16,
      marginBottom: 20,
      overflow: 'hidden',
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
      marginTop: 14,
      paddingTop: 12,
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
      alignItems: 'center',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: 'rgba(79,140,255,0.22)',
      borderRadius: 22,
      paddingVertical: 24,
      paddingHorizontal: 20,
      gap: 6,
      marginBottom: 20,
      overflow: 'hidden',
    },
    zsRingWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 10,
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
      color: 'rgba(255,255,255,0.15)',
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
      textAlign: 'center',
      marginTop: 4,
    },
    zsDesc: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 19,
      textAlign: 'center',
      paddingHorizontal: 8,
      marginTop: 2,
    },

    // ── Zone 5 — Tu Entrenador
    z5Card: {
      backgroundColor: c.cardBg,
      borderWidth: 0.5,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 18,
      marginBottom: 28,
      gap: 10,
    },
    z5Header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    z5Label: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    z5Text: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 21,
      letterSpacing: -0.1,
    },
    z5TextHighlight: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
      color: c.inkPrimary,
      lineHeight: 21,
      letterSpacing: -0.1,
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
