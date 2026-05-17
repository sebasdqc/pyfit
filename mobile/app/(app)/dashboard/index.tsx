import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
import { router } from 'expo-router'
import { COLORS, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: number
  fecha: string
  respuesta_ia: { titulo?: string; duracion_total?: number }
  duracion_planificada: number
  feedback?: { cumplimiento: number }
}

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

interface DashboardData {
  nombre: string
  nivel: string
  puntos_totales: number
  racha_actual: number
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

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatSessionDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

function formatHeaderDate(): string {
  const d = new Date()
  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
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

// ─── RPE Card ─────────────────────────────────────────────────────────────────

function RPECard({
  metrica,
  colors,
  styles,
}: {
  metrica: MetricaData | undefined
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  const rpeDisplay = metrica?.valor_display ?? '—'
  const progreso = metrica?.progreso_pct ?? 0
  const descripcion = metrica?.descripcion ?? 'Entrena de forma consistente para ver tu RPE promedio.'

  return (
    <View style={styles.rpeCard}>
      <Text style={styles.rpeSectionLabel}>TU MOMENTO</Text>
      <Text style={styles.rpeSubLabel}>RPE PROMEDIO · ESTA SEMANA</Text>

      <View style={styles.rpeBody}>
        {/* Big number — left */}
        <Text style={styles.rpeBigNumber}>{rpeDisplay}</Text>

        {/* Insight text — right */}
        <View style={styles.rpeTextWrap}>
          <Text style={styles.rpeDesc}>{descripcion}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.rpeBarBg}>
        <View style={[styles.rpeBarFill, { width: `${progreso}%` as any }]} />
      </View>

      {/* Scale labels */}
      <View style={styles.rpeBarScaleRow}>
        <Text style={styles.rpeBarScaleLabel}>0</Text>
        <Text style={styles.rpeBarScaleLabel}>10</Text>
      </View>
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

// ─── Weekly View (Zone 3) ─────────────────────────────────────────────────────

function WeekDayIcon({ estado, colors }: { estado: SemanaDay['estado']; colors: Colors }) {
  const SIZE = 26

  if (estado === 'entrenado') {
    return (
      <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        backgroundColor: '#32c896', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk-Bold', lineHeight: 16 }}>✓</Text>
      </View>
    )
  }
  if (estado === 'hoy') {
    return (
      <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        backgroundColor: 'rgba(79,140,255,0.18)', borderWidth: 2, borderColor: colors.accent,
        alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
      </View>
    )
  }
  if (estado === 'planificado') {
    return (
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={13} cy={13} r={10} fill="none"
          stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} strokeDasharray="3 2" />
      </Svg>
    )
  }
  if (estado === 'descanso') {
    return (
      <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: 1, borderColor: 'rgba(255,170,50,0.45)',
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffaa32', fontSize: 13, lineHeight: 16, marginTop: -1 }}>–</Text>
      </View>
    )
  }
  // vacio
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={13} cy={13} r={10} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
    </Svg>
  )
}

function WeeklyView({
  semana,
  racha,
  colors,
  styles,
}: {
  semana: SemanaDay[]
  racha: number
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  const TIPO_COLOR: Record<SemanaDay['estado'], string> = {
    entrenado:   '#32c896',
    hoy:         colors.accent,
    planificado: 'rgba(255,255,255,0.3)',
    descanso:    '#ffaa32',
    vacio:       'transparent',
  }

  return (
    <View style={styles.z3Wrap}>
      <Text style={styles.z3Label}>TU SEMANA</Text>

      <View style={styles.z3Row}>
        {semana.map(day => (
          <View
            key={day.fecha}
            style={[styles.z3DayCol, day.is_today && styles.z3DayColHoy]}
          >
            {/* Day letter */}
            <Text style={[styles.z3DayAbbr, day.is_today && { color: colors.accent }]}>
              {day.dia_abbr}
            </Text>

            {/* State icon */}
            <WeekDayIcon estado={day.estado} colors={colors} />

            {/* Session type label */}
            {day.tipo_sesion ? (
              <Text
                style={[styles.z3DayTipo, { color: TIPO_COLOR[day.estado] }]}
                numberOfLines={1}
              >
                {day.tipo_sesion}
              </Text>
            ) : day.estado === 'descanso' ? (
              <Text style={[styles.z3DayTipo, { color: 'rgba(255,170,50,0.5)' }]}>
                Desc.
              </Text>
            ) : (
              <Text style={styles.z3DayTipo}> </Text>
            )}
          </View>
        ))}
      </View>

      {/* Conditional alert */}
      {racha >= 4 && (
        <View style={styles.z3Alert}>
          <View style={styles.z3AlertDot} />
          <Text style={styles.z3AlertText}>
            {racha} días seguidos · Mañana te sugerimos descanso activo.
          </Text>
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
}: {
  cta: CTAData
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  const PILL: Record<CTAData['pill_color'], { color: string; bg: string; border: string }> = {
    green:   { color: '#32c896', bg: 'rgba(50,200,150,0.12)',  border: 'rgba(50,200,150,0.30)'  },
    neutral: { color: colors.inkMuted, bg: colors.glassBg,    border: colors.borderDefault      },
    orange:  { color: '#ffaa32', bg: 'rgba(255,170,50,0.12)', border: 'rgba(255,170,50,0.30)'  },
  }

  const CARD_BORDER: Record<CTAData['estado'], string> = {
    A: 'rgba(79,140,255,0.28)',
    B: colors.borderDefault,
    C: 'rgba(255,170,50,0.28)',
    D: 'rgba(79,140,255,0.28)',
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
          colors={['rgba(79,140,255,0.10)', 'transparent']}
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

      {/* Button */}
      <TouchableOpacity
        style={[styles.ctaBtnWrap, !isActive && styles.ctaBtnWrapSecondary]}
        onPress={handlePress}
        activeOpacity={0.88}
      >
        {isActive ? (
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>{btnLabel}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.ctaBtn, styles.ctaBtnOutlined,
            cta.estado === 'C' && { borderColor: 'rgba(255,170,50,0.5)' }
          ]}>
            <Text style={[styles.ctaBtnTextSecondary,
              cta.estado === 'C' && { color: '#ffaa32' }
            ]}>
              {btnLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ─── Insight Card (Zone 5) ────────────────────────────────────────────────────

function InsightCard({
  texto,
  colors,
  styles,
}: {
  texto: string | null
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}) {
  const isEmpty = !texto
  return (
    <View style={styles.z5Wrap}>
      <Text style={styles.z5SectionLabel}>Tu entrenador</Text>
      <View style={[styles.z5Card, isEmpty && styles.z5CardEmpty]}>
        <View style={[styles.z5Bar, isEmpty && { backgroundColor: colors.borderBright }]} />
        <View style={styles.z5Content}>
          <View style={styles.z5TagRow}>
            <View style={[styles.z5Tag, isEmpty && styles.z5TagEmpty]}>
              <Text style={[styles.z5TagText, isEmpty && { color: colors.inkMuted }]}>
                {isEmpty ? 'SIN DATOS AÚN' : 'INSIGHT DE LA SEMANA'}
              </Text>
            </View>
          </View>
          <Text style={[styles.z5Text, isEmpty && styles.z5TextEmpty]}>
            {isEmpty
              ? 'Realiza tu primer entrenamiento para ver el análisis de tu entrenador aquí.'
              : texto}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors } = useTheme()
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
          <Text style={styles.z1Date}>{formatHeaderDate()}</Text>

          {/* Greeting */}
          {loading ? (
            <View style={styles.z1SkeletonWrap}>
              <Skeleton width="80%" height={30} borderRadius={6} />
              <Skeleton width="55%" height={30} borderRadius={6} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <Text style={styles.z1Saludo}>{data?.saludo ?? ''}</Text>
          )}

          {/* Insight */}
          {loading ? (
            <Skeleton width="65%" height={14} borderRadius={4} style={{ marginTop: 14 }} />
          ) : !!data?.insight && (
            <Text style={styles.z1Insight}>{data.insight}</Text>
          )}
        </View>

        {/* ── ZONA 2 — Card CTA principal ── */}
        {loading ? (
          <View style={styles.ctaCardSkeleton}>
            <Skeleton width={100} height={22} borderRadius={11} />
            <Skeleton width="70%" height={26} borderRadius={6} style={{ marginTop: 14 }} />
            <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={52} borderRadius={14} style={{ marginTop: 20 }} />
          </View>
        ) : !!data?.cta && (
          <CTACard cta={data.cta} colors={colors} styles={styles} />
        )}

        {/* ── ZONA 3 — Vista semanal ── */}
        {loading ? (
          <View style={[styles.z3Wrap, { opacity: 0.5 }]}>
            <Skeleton width={70} height={10} borderRadius={4} style={{ marginBottom: 14 }} />
            <View style={styles.z3Row}>
              {[0,1,2,3,4,5,6].map(i => (
                <View key={i} style={styles.z3DayCol}>
                  <Skeleton width={14} height={10} borderRadius={3} />
                  <Skeleton width={26} height={26} borderRadius={13} style={{ marginVertical: 4 }} />
                  <Skeleton width={28} height={8} borderRadius={3} />
                </View>
              ))}
            </View>
          </View>
        ) : !!data?.semana_detalle?.length && (
          <WeeklyView
            semana={data.semana_detalle}
            racha={data.racha_actual}
            colors={colors}
            styles={styles}
          />
        )}

        {/* ── RPE Promedio ── */}
        {loading ? (
          <View style={[styles.rpeCard, { opacity: 0.5 }]}>
            <Skeleton width={140} height={10} borderRadius={4} style={{ marginBottom: 16 }} />
            <View style={styles.rpeBody}>
              <Skeleton width={80} height={60} borderRadius={6} />
              <View style={styles.rpeTextWrap}>
                <Skeleton width="90%" height={13} borderRadius={4} />
                <Skeleton width="70%" height={13} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
            </View>
            <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 18, marginBottom: 6 }} />
          </View>
        ) : (
          <RPECard metrica={data?.metrica} colors={colors} styles={styles} />
        )}

        {/* ── ZONA 5 — Insight del entrenador ── */}
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
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 22,
      padding: 22,
      marginBottom: 20,
    },
    ctaCard: {
      backgroundColor: c.cardBg,
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
    ctaBtnOutlined: {
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 14,
    },
    ctaBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      color: '#ffffff',
      letterSpacing: 0.2,
    },
    ctaBtnTextSecondary: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.inkSecondary,
      letterSpacing: 0.1,
    },

    // Section container (shared)
    section: {
      marginBottom: 20,
    },

    // ── Zone 3 — Vista semanal
    z3Wrap: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
    },
    z3Label: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2,
      marginBottom: 14,
    },
    z3Row: {
      flexDirection: 'row',
    },
    z3DayCol: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 1,
      borderRadius: 10,
      gap: 4,
    },
    z3DayColHoy: {
      backgroundColor: 'rgba(79,140,255,0.09)',
      borderWidth: 1,
      borderColor: 'rgba(79,140,255,0.22)',
    },
    z3DayAbbr: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    z3DayTipo: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 7,
      letterSpacing: 0.2,
      color: 'transparent',
      textAlign: 'center',
    },
    z3Alert: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    z3AlertDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ffaa32',
      flexShrink: 0,
    },
    z3AlertText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: '#ffaa32',
      lineHeight: 17,
      flex: 1,
    },

    // ── RPE Card
    rpeCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
    },
    rpeSectionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    rpeSubLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      color: c.inkFaint,
      letterSpacing: 1.5,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    rpeBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 18,
    },
    rpeBigNumber: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 56,
      color: c.accent,
      letterSpacing: -2,
      lineHeight: 60,
      minWidth: 80,
    },
    rpeTextWrap: {
      flex: 1,
    },
    rpeDesc: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkSecondary,
      lineHeight: 20,
    },
    rpeBarBg: {
      height: 4,
      backgroundColor: c.borderDefault,
      borderRadius: 2,
      marginBottom: 6,
      overflow: 'hidden',
    },
    rpeBarFill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: c.accent,
    },
    rpeBarScaleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rpeBarScaleLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkFaint,
      letterSpacing: 0.3,
    },

    // ── Zone 5 — Insight del entrenador
    z5Wrap: {
      marginBottom: 24,
    },
    z5SectionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    z5Card: {
      flexDirection: 'row',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 18,
      overflow: 'hidden',
    },
    z5Bar: {
      width: 3,
      backgroundColor: '#6ce5ff',
    },
    z5Content: {
      flex: 1,
      padding: 18,
      gap: 12,
    },
    z5TagRow: {
      flexDirection: 'row',
    },
    z5Tag: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(108,229,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(108,229,255,0.25)',
    },
    z5TagText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      color: '#6ce5ff',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    z5Text: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkPrimary,
      lineHeight: 22,
      letterSpacing: -0.1,
    },
    z5CardEmpty: {
      borderColor: 'rgba(255,255,255,0.05)',
    },
    z5TagEmpty: {
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderColor: 'rgba(255,255,255,0.10)',
    },
    z5TextEmpty: {
      color: c.inkMuted,
      fontStyle: 'italic',
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
