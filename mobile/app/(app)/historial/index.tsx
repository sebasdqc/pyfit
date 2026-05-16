import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, FASES, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

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
  duracion_minutos?: number
  ejercicios: Ejercicio[]
}

interface RespuestaIA {
  titulo?: string
  objetivo_sesion?: string
  rpe_target?: number
  duracion_total?: number
  fases?: Fase[]
  nota_del_entrenador?: string
}

interface Feedback {
  cumplimiento: number
  rpe_real: number
  rating: number
  notas?: string
}

interface Session {
  id: number
  fecha: string
  duracion_planificada: number
  respuesta_ia: RespuestaIA
  feedback?: Feedback
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTH_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr(): string {
  return toDateStr(new Date())
}

// These helper functions use hardcoded semantic colors that don't change between themes
function cumplimientoColor(c: number): string {
  if (c >= 90) return '#32c896'
  if (c >= 70) return '#90EE90'
  return '#ffaa32'
}

function cumplimientoBgColor(c: number): string {
  if (c >= 90) return 'rgba(50,200,150,0.15)'
  if (c >= 70) return 'rgba(144,238,144,0.15)'
  return 'rgba(255,170,50,0.15)'
}

function getEjerciciosSintesis(ia?: RespuestaIA, max = 3): string {
  if (!ia?.fases) return ''
  const nombres: string[] = []
  for (const fase of ia.fases) {
    for (const ej of fase.ejercicios) {
      if (ej.nombre) nombres.push(ej.nombre)
    }
  }
  if (!nombres.length) return ''
  const shown = nombres.slice(0, max)
  const rest = nombres.length - shown.length
  return shown.join(' · ') + (rest > 0 ? ` +${rest}` : '')
}

function getDayColor(session?: Session): string | null {
  if (!session) return null
  if (!session.feedback) return COLORS.accent
  const c = session.feedback.cumplimiento
  return cumplimientoColor(c)
}

function groupByMonth(sessions: Session[]): { key: string; label: string; sessions: Session[] }[] {
  const map = new Map<string, Session[]>()
  for (const s of sessions) {
    const d = new Date(s.fecha + 'T00:00:00')
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return Array.from(map.entries()).map(([key, sArr]) => {
    const d = new Date(sArr[0].fecha + 'T00:00:00')
    return {
      key,
      label: `${MONTH_NAMES_ES[d.getMonth()]} ${d.getFullYear()}`,
      sessions: sArr.sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }
  })
}

function getLast6Months(): { year: number; month: number }[] {
  const result = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return result
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

// getDay() returns 0=Sun ... 6=Sat. We want 0=Mon ... 6=Sun
function mondayBasedDayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

// ─── Session Detail Modal ─────────────────────────────────────────────────────

function SessionModal({
  session,
  visible,
  onClose,
}: {
  session: Session | null
  visible: boolean
  onClose: () => void
}) {
  const { colors } = useTheme()
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors])

  if (!session) return null
  const { respuesta_ia: ia, feedback } = session
  const titulo = ia?.titulo ?? 'Sesión de entrenamiento'

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.titulo} numberOfLines={2}>{titulo}</Text>
              <Text style={modalStyles.fecha}>{formatDate(session.fecha)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
              <Text style={modalStyles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          >
            {/* Stats row */}
            <View style={modalStyles.statsRow}>
              <View style={modalStyles.statChip}>
                <Text style={modalStyles.statValue}>
                  {ia?.duracion_total ?? session.duracion_planificada}
                </Text>
                <Text style={modalStyles.statLabel}>MIN</Text>
              </View>
              {ia?.rpe_target != null && (
                <View style={modalStyles.statChip}>
                  <Text style={modalStyles.statValue}>{ia.rpe_target}</Text>
                  <Text style={modalStyles.statLabel}>RPE</Text>
                </View>
              )}
              {feedback && (
                <View style={[modalStyles.statChip, { borderColor: cumplimientoColor(feedback.cumplimiento) }]}>
                  <Text style={[modalStyles.statValue, { color: cumplimientoColor(feedback.cumplimiento) }]}>
                    {feedback.cumplimiento}%
                  </Text>
                  <Text style={modalStyles.statLabel}>CUMPL.</Text>
                </View>
              )}
            </View>

            {/* Nota del entrenador */}
            {ia?.nota_del_entrenador ? (
              <View style={modalStyles.notaCard}>
                <Text style={modalStyles.notaLabel}>Nota del entrenador</Text>
                <Text style={modalStyles.notaText}>{ia.nota_del_entrenador}</Text>
              </View>
            ) : null}

            {/* Fases y ejercicios */}
            {ia?.fases?.map((fase, fi) => {
              const faseKey = Object.keys(FASES).find(k =>
                fase.nombre.toLowerCase().includes(k.toLowerCase())
              ) as keyof typeof FASES | undefined
              const faseStyle = faseKey ? FASES[faseKey] : {
                color: colors.accent,
                bg: 'rgba(79,140,255,0.1)',
                label: fase.nombre.toUpperCase(),
              }
              return (
                <View key={fi} style={modalStyles.faseBlock}>
                  <View style={[modalStyles.faseHeader, { backgroundColor: faseStyle.bg }]}>
                    <Text style={[modalStyles.faseName, { color: faseStyle.color }]}>
                      {faseStyle.label}
                    </Text>
                    {fase.duracion_minutos != null && (
                      <Text style={[modalStyles.faseDur, { color: faseStyle.color }]}>
                        {fase.duracion_minutos} min
                      </Text>
                    )}
                  </View>
                  {fase.ejercicios.map((ej, ei) => (
                    <View key={ei} style={modalStyles.ejRow}>
                      <View style={modalStyles.ejIndexBadge}>
                        <Text style={modalStyles.ejIndex}>{ei + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.ejNombre}>{ej.nombre}</Text>
                        <Text style={modalStyles.ejMeta}>
                          {ej.series} series · {ej.repeticiones} reps
                          {ej.rpe_sugerido ? ` · RPE ${ej.rpe_sugerido}` : ''}
                          {ej.descanso_segundos ? ` · ${ej.descanso_segundos}s descanso` : ''}
                        </Text>
                        {ej.notas ? <Text style={modalStyles.ejNotas}>{ej.notas}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              )
            })}

            {/* Feedback resumen */}
            {feedback && (
              <View style={modalStyles.feedbackCard}>
                <Text style={modalStyles.feedbackTitle}>Feedback post-sesión</Text>
                <View style={modalStyles.feedbackRow}>
                  <Text style={modalStyles.feedbackItem}>RPE real: <Text style={{ color: colors.inkPrimary }}>{feedback.rpe_real}</Text></Text>
                  <Text style={modalStyles.feedbackItem}>Rating: <Text style={{ color: colors.inkPrimary }}>{'⭐'.repeat(feedback.rating)}</Text></Text>
                </View>
                {feedback.notas ? (
                  <Text style={modalStyles.feedbackNotas}>"{feedback.notas}"</Text>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function makeModalStyles(c: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.borderDefault,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
    },
    titulo: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    fecha: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    closeX: {
      color: c.inkSecondary,
      fontSize: 14,
      fontFamily: 'SpaceGrotesk-Regular',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      marginBottom: 14,
    },
    statChip: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
      minWidth: 60,
    },
    statValue: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      letterSpacing: -0.5,
    },
    statLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      letterSpacing: 0.5,
      marginTop: 2,
    },
    notaCard: {
      backgroundColor: 'rgba(79,140,255,0.07)',
      borderWidth: 1,
      borderColor: 'rgba(79,140,255,0.15)',
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    notaLabel: {
      color: c.accent,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    notaText: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    faseBlock: {
      marginBottom: 14,
    },
    faseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
    },
    faseName: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.6,
    },
    faseDur: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
    },
    ejRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
    },
    ejIndexBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    ejIndex: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
    },
    ejNombre: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13,
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    ejMeta: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
    },
    ejNotas: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      marginTop: 3,
      fontStyle: 'italic',
    },
    feedbackCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 14,
      marginTop: 6,
    },
    feedbackTitle: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    feedbackRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 8,
    },
    feedbackItem: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
    },
    feedbackNotas: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      fontStyle: 'italic',
    },
  })
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  sessions,
  onSelectSession,
}: {
  sessions: Session[]
  onSelectSession: (s: Session) => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const grouped = groupByMonth(sessions)

  if (!grouped.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Aún no tienes sesiones registradas.</Text>
        <Text style={styles.emptySubtext}>Completa tu primer entrenamiento para verlo aquí.</Text>
      </View>
    )
  }

  return (
    <>
      {grouped.map(group => (
        <View key={group.key} style={styles.monthGroup}>
          <Text style={styles.monthLabel}>{group.label}</Text>
          {group.sessions.map(session => {
            const titulo = session.respuesta_ia?.titulo ?? 'Sesión de entrenamiento'
            const duracion = session.respuesta_ia?.duracion_total ?? session.duracion_planificada
            const feedback = session.feedback
            const ejercicios = getEjerciciosSintesis(session.respuesta_ia)
            return (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => onSelectSession(session)}
                activeOpacity={0.75}
              >
                <View style={styles.sessionTopRow}>
                  <Text style={styles.sessionDate}>{formatDate(session.fecha)}</Text>
                  {feedback ? (
                    <View style={[styles.cumplBadge, { backgroundColor: cumplimientoBgColor(feedback.cumplimiento) }]}>
                      <Text style={[styles.cumplText, { color: cumplimientoColor(feedback.cumplimiento) }]}>
                        {feedback.cumplimiento}%
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.cumplBadge, { backgroundColor: 'rgba(79,140,255,0.12)' }]}>
                      <Text style={[styles.cumplText, { color: colors.accent }]}>SIN FEEDBACK</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sessionTitle} numberOfLines={1}>{titulo}</Text>
                <Text style={styles.sessionMeta}>
                  {duracion} min{feedback ? ` · RPE ${feedback.rpe_real} · ${feedback.cumplimiento}% cumpl.` : ''}
                </Text>
                {!!ejercicios && (
                  <Text style={styles.sessionEjercicios} numberOfLines={1}>{ejercicios}</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      ))}
    </>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  sessions,
  onSelectDay,
}: {
  sessions: Session[]
  onSelectDay: (daySessions: Session[]) => void
}) {
  const { colors } = useTheme()
  const calStyles = useMemo(() => makeCalStyles(colors), [colors])

  const sessionsByDate = new Map<string, Session[]>()
  for (const s of sessions) {
    if (!sessionsByDate.has(s.fecha)) sessionsByDate.set(s.fecha, [])
    sessionsByDate.get(s.fecha)!.push(s)
  }

  const today = todayStr()
  const months = getLast6Months()
  const DAY_COLS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <>
      {/* Legend */}
      <View style={calStyles.legend}>
        {[
          { color: '#32c896', label: '≥90%' },
          { color: '#90EE90', label: '70-89%' },
          { color: colors.accent, label: 'Sin feedback' },
          { color: '#ffaa32', label: '<70%' },
          { color: '#ffaa32', label: 'Hoy', isToday: true },
        ].map((item, i) => (
          <View key={i} style={calStyles.legendItem}>
            <View style={[
              calStyles.legendDot,
              { backgroundColor: item.isToday ? 'transparent' : item.color },
              item.isToday && { borderWidth: 1.5, borderColor: '#ffaa32' },
            ]} />
            <Text style={calStyles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {months.map(({ year, month }) => {
        const days = getDaysInMonth(year, month)
        const firstOffset = mondayBasedDayIndex(days[0])
        const totalCells = firstOffset + days.length
        const rows = Math.ceil(totalCells / 7)

        return (
          <View key={`${year}-${month}`} style={calStyles.monthBlock}>
            <Text style={calStyles.monthTitle}>
              {MONTH_NAMES_ES[month]} {year}
            </Text>
            {/* Weekday headers */}
            <View style={calStyles.weekHeader}>
              {DAY_COLS.map(d => (
                <Text key={d} style={calStyles.weekHeaderCell}>{d}</Text>
              ))}
            </View>
            {/* Day grid */}
            {Array.from({ length: rows }, (_, row) => (
              <View key={row} style={calStyles.weekRow}>
                {Array.from({ length: 7 }, (_, col) => {
                  const cellIndex = row * 7 + col
                  const dayIndex = cellIndex - firstOffset
                  if (dayIndex < 0 || dayIndex >= days.length) {
                    return <View key={col} style={calStyles.dayCell} />
                  }
                  const day = days[dayIndex]
                  const dateStr = toDateStr(day)
                  const daySessions = sessionsByDate.get(dateStr)
                  const isToday = dateStr === today
                  const isFuture = dateStr > today

                  let dotColor: string | null = null
                  if (daySessions?.length) {
                    const topSession = daySessions[0]
                    dotColor = getDayColor(topSession)
                  } else if (isToday) {
                    dotColor = '#ffaa32'
                  }

                  return (
                    <TouchableOpacity
                      key={col}
                      style={[
                        calStyles.dayCell,
                        isToday && calStyles.dayCellToday,
                        isFuture && !daySessions && calStyles.dayCellFuture,
                      ]}
                      onPress={() => {
                        if (daySessions?.length) onSelectDay(daySessions)
                      }}
                      activeOpacity={daySessions?.length ? 0.7 : 1}
                    >
                      <Text style={[
                        calStyles.dayNum,
                        isToday && { color: '#fff', fontFamily: 'SpaceGrotesk-Bold' },
                        isFuture && !daySessions && { color: colors.inkFaint },
                      ]}>
                        {day.getDate()}
                      </Text>
                      {dotColor && (
                        <View style={[
                          calStyles.dayDot,
                          { backgroundColor: isToday && !daySessions ? 'transparent' : dotColor },
                          isToday && !daySessions && { borderWidth: 1.5, borderColor: '#ffaa32' },
                        ]} />
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </View>
        )
      })}
    </>
  )
}

function makeCalStyles(c: Colors) {
  return StyleSheet.create({
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.3,
    },
    monthBlock: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 18,
      padding: 14,
      marginBottom: 16,
    },
    monthTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      letterSpacing: -0.3,
      marginBottom: 12,
    },
    weekHeader: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekHeaderCell: {
      flex: 1,
      textAlign: 'center',
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.3,
      paddingBottom: 6,
    },
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 5,
      gap: 3,
      borderRadius: 8,
    },
    dayCellToday: {
      backgroundColor: 'rgba(79,140,255,0.12)',
    },
    dayCellFuture: {
      opacity: 0.4,
    },
    dayNum: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
    },
    dayDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
  })
}

// ─── Day Sessions Modal ───────────────────────────────────────────────────────

function DayModal({
  daySessions,
  visible,
  onClose,
  onSelectSession,
}: {
  daySessions: Session[]
  visible: boolean
  onClose: () => void
  onSelectSession: (s: Session) => void
}) {
  const { colors } = useTheme()
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors])
  const styles = useMemo(() => makeStyles(colors), [colors])

  const fecha = daySessions[0]?.fecha ?? ''
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { maxHeight: '50%' }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.titulo}>{formatDate(fecha)}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
              <Text style={modalStyles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20 }}
          >
            {daySessions.map(s => {
              const ejercicios = getEjerciciosSintesis(s.respuesta_ia)
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.sessionCard}
                  onPress={() => { onClose(); setTimeout(() => onSelectSession(s), 300) }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {s.respuesta_ia?.titulo ?? 'Sesión de entrenamiento'}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {s.respuesta_ia?.duracion_total ?? s.duracion_planificada} min
                    {s.feedback ? ` · RPE ${s.feedback.rpe_real} · ${s.feedback.cumplimiento}%` : ' · Sin feedback'}
                  </Text>
                  {!!ejercicios && (
                    <Text style={styles.sessionEjercicios} numberOfLines={1}>{ejercicios}</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistorialScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [view, setView] = useState<'lista' | 'calendario'>('lista')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sessionModalVisible, setSessionModalVisible] = useState(false)

  const [daySessions, setDaySessions] = useState<Session[]>([])
  const [dayModalVisible, setDayModalVisible] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      setError(null)
      const data = await apiGet('/api/sessions/')
      setSessions(Array.isArray(data) ? data : (data.results ?? []))
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchSessions()
    setRefreshing(false)
  }, [fetchSessions])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  function openSession(s: Session) {
    setSelectedSession(s)
    setSessionModalVisible(true)
  }

  function openDay(ds: Session[]) {
    if (ds.length === 1) {
      openSession(ds[0])
    } else {
      setDaySessions(ds)
      setDayModalVisible(true)
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
        {/* Page title */}
        <Text style={styles.pageTitle}>Historial</Text>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'lista' && styles.toggleBtnActive]}
            onPress={() => setView('lista')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, view === 'lista' && styles.toggleTextActive]}>
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'calendario' && styles.toggleBtnActive]}
            onPress={() => setView('calendario')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, view === 'calendario' && styles.toggleTextActive]}>
              Calendario
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchSessions} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : view === 'lista' ? (
          <ListView sessions={sessions} onSelectSession={openSession} />
        ) : (
          <CalendarView sessions={sessions} onSelectDay={openDay} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Session detail modal */}
      <SessionModal
        session={selectedSession}
        visible={sessionModalVisible}
        onClose={() => setSessionModalVisible(false)}
      />

      {/* Day sessions modal (multiple sessions on same day) */}
      <DayModal
        daySessions={daySessions}
        visible={dayModalVisible}
        onClose={() => setDayModalVisible(false)}
        onSelectSession={openSession}
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
      paddingTop: 60,
      paddingHorizontal: 20,
    },
    pageTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      letterSpacing: -0.8,
      marginBottom: 20,
    },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 4,
      marginBottom: 20,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 11,
    },
    toggleBtnActive: {
      backgroundColor: c.accent,
    },
    toggleText: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13,
      letterSpacing: -0.2,
    },
    toggleTextActive: {
      color: '#fff',
    },
    loadingBox: {
      paddingVertical: 48,
      alignItems: 'center',
    },
    loadingText: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
    },
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.2)',
      borderRadius: 14,
      padding: 18,
      alignItems: 'center',
      gap: 12,
    },
    errorText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: 'rgba(255,68,68,0.15)',
      paddingHorizontal: 22,
      paddingVertical: 9,
      borderRadius: 10,
    },
    retryText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
    },
    emptyBox: {
      paddingVertical: 48,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      textAlign: 'center',
    },
    emptySubtext: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      textAlign: 'center',
    },
    monthGroup: {
      marginBottom: 24,
    },
    monthLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    sessionCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      gap: 5,
    },
    sessionTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionDate: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    cumplBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    cumplText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.3,
    },
    sessionTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      letterSpacing: -0.2,
    },
    sessionMeta: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
    },
    sessionEjercicios: {
      color: c.inkFaint,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      marginTop: 4,
    },
  })
}
