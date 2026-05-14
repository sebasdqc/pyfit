import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
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

interface DashboardData {
  nombre: string
  nivel: string
  puntos_totales: number
  racha_actual: number
  fatiga_porcentaje: number
  volumen_porcentaje: number
  dias_entrenados: string[]  // ISO date strings 'YYYY-MM-DD'
  ultimas_sesiones: Session[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function getCurrentWeek(): Date[] {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 Sun ... 6 Sat
  const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMon)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_ABBR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

function nivelLabel(nivel: string): string {
  const map: Record<string, string> = {
    rookie: 'Rookie',
    atleta: 'Atleta',
    elite: 'Élite',
    leyenda: 'Leyenda',
  }
  return map[nivel?.toLowerCase()] ?? nivel ?? 'Rookie'
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

// ─── Circulo Progreso ─────────────────────────────────────────────────────────

function CirculoProgreso({
  porcentaje,
  color,
  size = 90,
  label,
}: {
  porcentaje: number
  color: string
  size?: number
  label: string
}) {
  const { colors } = useTheme()
  const radio = (size - 14) / 2
  const circunferencia = 2 * Math.PI * radio
  const offset = circunferencia - (Math.min(porcentaje, 100) / 100) * circunferencia
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size }}>
        <Svg
          width={size}
          height={size}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radio}
            fill="none"
            stroke={colors.borderDefault}
            strokeWidth="7"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radio}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={`${circunferencia} ${circunferencia}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: colors.inkPrimary,
              fontFamily: 'SpaceGrotesk-Bold',
              fontSize: 17,
            }}
          >
            {porcentaje}%
          </Text>
        </View>
      </View>
      <Text
        style={{
          color: colors.inkMuted,
          fontFamily: 'JetBrainsMono-Regular',
          fontSize: 9,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {label}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekDays = getCurrentWeek()
  const todayStr = toDateStr(new Date())

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

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const diasEntrenadosSet = new Set<string>(Array.isArray(data?.dias_entrenados) ? data!.dias_entrenados : [])

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(37,99,255,0.25)', 'transparent']}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Initials avatar */}
            <View style={styles.avatar}>
              {loading ? (
                <Skeleton width={42} height={42} borderRadius={21} />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(data?.nombre ?? 'U')}
                </Text>
              )}
            </View>
            <View style={{ gap: 1 }}>
              {loading ? (
                <>
                  <Skeleton width={90} height={14} borderRadius={4} />
                  <Skeleton width={40} height={10} borderRadius={3} style={{ marginTop: 4 }} />
                </>
              ) : (
                <>
                  <Text style={styles.headerName}>{data?.nombre ?? 'Usuario'}</Text>
                  <Text style={styles.headerTag}>PYFIT</Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => Alert.alert('Notificaciones', 'Próximamente')}
            activeOpacity={0.7}
          >
            <BellIcon />
          </TouchableOpacity>
        </View>

        {/* ── Weekly Calendar ── */}
        <View style={styles.section}>
          <View style={styles.calendarRow}>
            {weekDays.map((day, i) => {
              const dayStr = toDateStr(day)
              const isToday = dayStr === todayStr
              const hasSession = diasEntrenadosSet.has(dayStr)
              return (
                <TouchableOpacity
                  key={dayStr}
                  style={[
                    styles.calendarDay,
                    isToday && styles.calendarDayToday,
                  ]}
                  onPress={() =>
                    Alert.alert(
                      'Historial',
                      'Ver historial de este día — próximamente',
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calendarDayAbbr,
                      isToday && { color: colors.accent },
                    ]}
                  >
                    {DAY_ABBR[i]}
                  </Text>
                  <Text
                    style={[
                      styles.calendarDayNum,
                      isToday && { color: colors.inkPrimary },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {/* Session dot */}
                  <View
                    style={[
                      styles.calendarDot,
                      { backgroundColor: hasSession ? colors.accent : 'transparent' },
                    ]}
                  />
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* ── Progress Circles ── */}
        <View style={styles.circlesCard}>
          {loading ? (
            <View style={styles.circlesRow}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Skeleton width={90} height={90} borderRadius={45} />
                <Skeleton width={60} height={9} borderRadius={4} />
              </View>
              <View style={styles.circlesDivider} />
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Skeleton width={90} height={90} borderRadius={45} />
                <Skeleton width={60} height={9} borderRadius={4} />
              </View>
            </View>
          ) : (
            <View style={styles.circlesRow}>
              <CirculoProgreso
                porcentaje={data?.fatiga_porcentaje ?? 0}
                color={colors.orange}
                label="Fatiga"
              />
              <View style={styles.circlesDivider} />
              <CirculoProgreso
                porcentaje={data?.volumen_porcentaje ?? 0}
                color={colors.accent}
                label="Volumen sem."
              />
            </View>
          )}
        </View>

        {/* ── Ranking Card ── */}
        <TouchableOpacity
          style={styles.rankCard}
          onPress={() => Alert.alert('Ranking global', 'Próximamente')}
          activeOpacity={0.75}
        >
          {/* Left accent strip */}
          <View style={styles.rankStrip} />
          <View style={styles.rankContent}>
            {loading ? (
              <View style={{ gap: 6 }}>
                <Skeleton width={80} height={13} borderRadius={4} />
                <Skeleton width={120} height={11} borderRadius={4} />
              </View>
            ) : (
              <>
                <View style={styles.rankTopRow}>
                  <Text style={styles.rankNivel}>{nivelLabel(data?.nivel ?? '')}</Text>
                  <Text style={styles.rankProx}>Ver ranking →</Text>
                </View>
                <View style={styles.rankStatsRow}>
                  <Text style={styles.rankStat}>
                    <Text style={{ color: colors.accent, fontFamily: 'SpaceGrotesk-Bold' }}>
                      {data?.puntos_totales ?? 0}
                    </Text>
                    {'  pts'}
                  </Text>
                  <Text style={styles.rankStatDot}>·</Text>
                  <Text style={styles.rankStat}>
                    <Text style={{ color: colors.orange, fontFamily: 'SpaceGrotesk-Bold' }}>
                      {data?.racha_actual ?? 0}
                    </Text>
                    {'  días de racha'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* ── Last Sessions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Últimas sesiones</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/historial')} activeOpacity={0.7}>
              <Text style={styles.sectionLink}>Ver todo</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            [0, 1, 2].map(i => (
              <View key={i} style={[styles.sessionCard, { marginBottom: 10 }]}>
                <Skeleton width={80} height={11} borderRadius={4} />
                <Skeleton width={160} height={14} borderRadius={4} style={{ marginTop: 6 }} />
                <Skeleton width={100} height={10} borderRadius={4} style={{ marginTop: 5 }} />
              </View>
            ))
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchDashboard} style={styles.retryBtn} activeOpacity={0.8}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : !data?.ultimas_sesiones?.length ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Aún no tienes sesiones registradas.</Text>
            </View>
          ) : (
            data.ultimas_sesiones.slice(0, 3).map(session => {
              const titulo = session.respuesta_ia?.titulo ?? 'Sesión de entrenamiento'
              const duracion = session.respuesta_ia?.duracion_total ?? session.duracion_planificada
              const cumplimiento = session.feedback?.cumplimiento
              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => router.push('/(app)/historial')}
                  activeOpacity={0.75}
                >
                  <View style={styles.sessionTopRow}>
                    <Text style={styles.sessionDate}>{formatSessionDate(session.fecha)}</Text>
                    {cumplimiento != null && (
                      <View
                        style={[
                          styles.cumplimientoBadge,
                          {
                            backgroundColor:
                              cumplimiento >= 90
                                ? 'rgba(50,200,150,0.15)'
                                : cumplimiento >= 70
                                ? 'rgba(79,140,255,0.15)'
                                : 'rgba(255,170,50,0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cumplimientoText,
                            {
                              color:
                                cumplimiento >= 90
                                  ? colors.green
                                  : cumplimiento >= 70
                                  ? colors.accent
                                  : colors.orange,
                            },
                          ]}
                        >
                          {cumplimiento}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {titulo}
                  </Text>
                  <Text style={styles.sessionDur}>{duracion} min</Text>
                </TouchableOpacity>
              )
            })
          )}
        </View>

        {/* ── Ver todo historial button ── */}
        <TouchableOpacity
          style={styles.historialBtn}
          onPress={() => router.push('/(app)/historial')}
          activeOpacity={0.8}
        >
          <Text style={styles.historialBtnText}>Ver todo el historial</Text>
        </TouchableOpacity>

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
      paddingTop: 60,
      paddingHorizontal: 20,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 28,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.accentDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: c.white,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      letterSpacing: -0.5,
    },
    headerName: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      letterSpacing: -0.3,
    },
    headerTag: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 1.5,
    },
    bellBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },

    // Calendar
    section: {
      marginBottom: 20,
    },
    calendarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 18,
      padding: 14,
    },
    calendarDay: {
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 2,
      borderRadius: 10,
      minWidth: 36,
    },
    calendarDayToday: {
      backgroundColor: 'rgba(79,140,255,0.12)',
    },
    calendarDayAbbr: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    calendarDayNum: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      letterSpacing: -0.3,
    },
    calendarDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },

    // Circles
    circlesCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 22,
      marginBottom: 16,
    },
    circlesRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    circlesDivider: {
      width: 1,
      height: 70,
      backgroundColor: c.borderDefault,
    },

    // Ranking card
    rankCard: {
      flexDirection: 'row',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 18,
      marginBottom: 24,
      overflow: 'hidden',
    },
    rankStrip: {
      width: 4,
      backgroundColor: c.accent,
    },
    rankContent: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 16,
      gap: 6,
    },
    rankTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rankNivel: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      letterSpacing: -0.4,
    },
    rankProx: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.2,
    },
    rankStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rankStat: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
    },
    rankStatDot: {
      color: c.inkMuted,
      fontSize: 14,
    },

    // Section header
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      letterSpacing: -0.3,
    },
    sectionLink: {
      color: c.accent,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      letterSpacing: 0.2,
    },

    // Session cards
    sessionCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      gap: 4,
    },
    sessionTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionDate: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    sessionTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      letterSpacing: -0.2,
    },
    sessionDur: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
    },
    cumplimientoBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    cumplimientoText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.3,
    },

    // Historial button
    historialBtn: {
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 8,
    },
    historialBtnText: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      letterSpacing: -0.2,
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
