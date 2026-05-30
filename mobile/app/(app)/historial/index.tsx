import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { COLORS, FASES, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'
import { useTranslation } from '../../../lib/i18n'

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

interface Checkin {
  estado_fisico?: number | null
  estado_animo?: number | null
  dolor_hoy?: string | null
}

interface Session {
  id: number
  fecha: string
  duracion_planificada: number
  respuesta_ia: RespuestaIA
  feedback?: Feedback
  checkin?: Checkin | null
}

type FilterTipo = 'Todo' | 'Musculación' | 'Running' | 'Libre'

const FILTER_TIPOS: FilterTipo[] = ['Todo', 'Musculación', 'Running', 'Libre']

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Fallback static arrays (used only before i18n hook is available in non-hook contexts)
const MONTH_NAMES_ES_FALLBACK = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTH_SHORT_FALLBACK = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

const WEEKDAY_SHORT_FALLBACK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatDate(iso: string, monthShort: string[], weekdayShort: string[]): string {
  const d = new Date(iso + 'T00:00:00')
  return `${weekdayShort[d.getDay()]}, ${d.getDate()} ${monthShort[d.getMonth()]} ${d.getFullYear()}`
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

// ─── Type & state visual config ──────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'Fuerza Tren Inferior': { icon: '🦵', color: '#4f8cff', bg: 'rgba(79,140,255,0.15)' },
  'Fuerza Tren Superior': { icon: '💪', color: '#4f8cff', bg: 'rgba(79,140,255,0.15)' },
  'Fuerza':               { icon: '⚡', color: '#4f8cff', bg: 'rgba(79,140,255,0.15)' },
  'HIIT':                 { icon: '🔥', color: '#ffaa32', bg: 'rgba(255,170,50,0.15)'  },
  'Cardio':               { icon: '❤️', color: '#ff4444', bg: 'rgba(255,68,68,0.15)'   },
  'Movilidad':            { icon: '🌊', color: '#6ce5ff', bg: 'rgba(108,229,255,0.15)' },
  'Funcional':            { icon: '⚙️', color: '#32c896', bg: 'rgba(50,200,150,0.15)'  },
}
const DEFAULT_TIPO = { icon: '🏋️', color: '#4f8cff', bg: 'rgba(79,140,255,0.15)' }

function getTipoConfig(ia?: RespuestaIA) {
  return TIPO_CONFIG[inferTipoSesion(ia)] ?? DEFAULT_TIPO
}

function getRpeColor(rpe: number): string {
  if (rpe < 6) return '#32c896'
  if (rpe < 8) return '#ffaa32'
  return '#ff4444'
}

// Level index = level - 1 (levels 1–4)
const FISICO_CONFIG = [
  { icon: '⊗', color: '#ff4444' },
  { icon: '◌', color: '#ffaa32' },
  { icon: '◎', color: '#4f8cff' },
  { icon: '◉', color: '#32c896' },
]
const MENTAL_CONFIG = [
  { icon: '⊗', color: '#ff4444' },
  { icon: '◌', color: '#ffaa32' },
  { icon: '◎', color: '#4f8cff' },
  { icon: '◉', color: '#32c896' },
]

// ─── Week grouping ────────────────────────────────────────────────────────────

function getWeekStartDate(dateStr: string): Date {
  const d = new Date(Date.UTC(
    parseInt(dateStr.slice(0, 4)),
    parseInt(dateStr.slice(5, 7)) - 1,
    parseInt(dateStr.slice(8, 10)),
  ))
  const dow = d.getUTCDay() || 7  // 1=Mon … 7=Sun
  d.setUTCDate(d.getUTCDate() - (dow - 1))
  return d
}

function formatWeekLabel(ws: Date, monthNames: string[]): string {
  const we = new Date(ws)
  we.setUTCDate(we.getUTCDate() + 6)
  const sd = ws.getUTCDate()
  const ed = we.getUTCDate()
  const sm = monthNames[ws.getUTCMonth()].toLowerCase()
  const em = monthNames[we.getUTCMonth()].toLowerCase()
  if (sm === em) return `Semana del ${sd} al ${ed} de ${sm}`
  return `Semana del ${sd} de ${sm} al ${ed} de ${em}`
}

function groupByWeek(sessions: Session[], monthNames: string[]): { key: string; label: string; sessions: Session[] }[] {
  const map = new Map<string, { ws: Date; sessions: Session[] }>()
  for (const s of sessions) {
    const ws = getWeekStartDate(s.fecha)
    const key = `${ws.getUTCFullYear()}-${String(ws.getUTCMonth() + 1).padStart(2, '0')}-${String(ws.getUTCDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, { ws, sessions: [] })
    map.get(key)!.sessions.push(s)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, { ws, sessions: sArr }]) => ({
      key,
      label: formatWeekLabel(ws, monthNames),
      sessions: sArr.sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }))
}

function getDayColor(session?: Session): string | null {
  if (!session) return null
  if (!session.feedback) return COLORS.accent
  const c = session.feedback.cumplimiento
  return cumplimientoColor(c)
}

function inferTipoSesion(ia?: RespuestaIA): FilterTipo {
  const text = ((ia?.titulo ?? '') + ' ' + (ia?.objetivo_sesion ?? '')).toLowerCase()
  if (/running|correr|cardio|aeróbico|aerobico|trote|kilómetro|kilómetros|ritmo|resistencia cardiovascular/.test(text)) return 'Running'
  if (/fuerza|hipertrofia|pecho|espalda|pierna|cuádricep|femoral|glúteo|bícep|trícep|hombro|sentadilla|press|jalón|musculación|musculacion/.test(text)) return 'Musculación'
  return 'Libre'
}

function matchesTipo(session: Session, tipo: FilterTipo): boolean {
  if (tipo === 'Todo') return true
  return inferTipoSesion(session.respuesta_ia) === tipo
}

function countActiveWeeks(sessions: Session[]): number {
  const weeks = new Set<string>()
  for (const s of sessions) {
    const d = new Date(Date.UTC(
      parseInt(s.fecha.slice(0, 4)),
      parseInt(s.fecha.slice(5, 7)) - 1,
      parseInt(s.fecha.slice(8, 10)),
    ))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    weeks.add(`${d.getUTCFullYear()}-W${weekNo}`)
  }
  return weeks.size
}

function getMostFrequent(sessions: Session[]): { tipo: string; count: number } | null {
  if (!sessions.length) return null
  const map = new Map<string, { count: number; lastFecha: string }>()
  for (const s of sessions) {
    const tipo = inferTipoSesion(s.respuesta_ia)
    const entry = map.get(tipo) ?? { count: 0, lastFecha: '' }
    entry.count++
    if (s.fecha > entry.lastFecha) entry.lastFecha = s.fecha
    map.set(tipo, entry)
  }
  let best: { tipo: string; count: number; lastFecha: string } | null = null
  for (const [tipo, v] of map) {
    if (!best || v.count > best.count || (v.count === best.count && v.lastFecha > best.lastFecha)) {
      best = { tipo, count: v.count, lastFecha: v.lastFecha }
    }
  }
  return best ? { tipo: best.tipo, count: best.count } : null
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
  const { t, ta } = useTranslation()
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors])

  // HIS-1: el listado trae respuesta_ia RECORTADA (solo nombres). Al abrir el
  // detalle se hace fetch de la sesión completa (series/reps/notas + nota).
  const [fullIa, setFullIa] = useState<RespuestaIA | null>(null)
  useEffect(() => {
    if (!visible || !session) { setFullIa(null); return }
    const yaCompleto = !!session.respuesta_ia?.fases?.some(
      f => f.ejercicios?.some(e => (e as any).series != null)
    )
    if (yaCompleto) { setFullIa(session.respuesta_ia); return }
    let cancel = false
    setFullIa(null)
    apiGet(`/api/sessions/${session.id}/`)
      .then((d: any) => { if (!cancel) setFullIa(d?.respuesta_ia ?? null) })
      .catch(() => { if (!cancel) setFullIa(null) })
    return () => { cancel = true }
  }, [visible, session])

  const monthShort = ta('historial_months')
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  if (!session) return null
  // ia: detalle completo si ya se cargó; si no, la versión recortada del listado
  // (muestra nombres al instante y los detalles aparecen al llegar el fetch).
  const ia = fullIa ?? session.respuesta_ia
  const feedback = session.feedback
  const titulo = ia?.titulo ?? 'Sesión de entrenamiento'

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.titulo} numberOfLines={2}>{titulo}</Text>
              <Text style={modalStyles.fecha}>{formatDate(session.fecha, monthShort, weekdayShort)}</Text>
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
                <Text style={modalStyles.statLabel}>{t('historial_min').toUpperCase()}</Text>
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
                        {fase.duracion_minutos} {t('historial_min')}
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
                        {ej.series != null && (
                          <Text style={modalStyles.ejMeta}>
                            {ej.series} series · {ej.repeticiones} reps
                            {ej.rpe_sugerido ? ` · RPE ${ej.rpe_sugerido}` : ''}
                            {ej.descanso_segundos ? ` · ${ej.descanso_segundos}s descanso` : ''}
                          </Text>
                        )}
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
                <Text style={modalStyles.feedbackTitle}>{t('historial_modal_feedback')}</Text>
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

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  isExpanded,
  onToggle,
  styles,
  colors,
}: {
  session: Session
  isExpanded: boolean
  onToggle: () => void
  styles: ReturnType<typeof makeStyles>
  colors: Colors
}) {
  const rotAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current
  const { t, ta } = useTranslation()

  const monthShort = ta('historial_months')
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  useEffect(() => {
    Animated.timing(rotAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isExpanded])

  const chevronRotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })

  const ia          = session.respuesta_ia
  const titulo      = ia?.titulo ?? 'Sesión de entrenamiento'
  const duracion    = ia?.duracion_total ?? session.duracion_planificada
  const feedback    = session.feedback
  const checkin     = session.checkin
  const tipoConf    = getTipoConfig(ia)
  const rpe         = feedback?.rpe_real
  const fisico      = checkin?.estado_fisico    // 1-4
  const mental      = checkin?.estado_animo != null ? Math.min(checkin.estado_animo, 4) : undefined
  const dolor       = checkin?.dolor_hoy

  const allEjercicios = ia?.fases?.flatMap(f => f.ejercicios) ?? []

  return (
    <TouchableOpacity style={styles.sessionCard2} onPress={onToggle} activeOpacity={0.78}>
      {/* ── Top row ── */}
      <View style={styles.cardRow}>
        {/* Left: tipo icon */}
        <View style={[styles.typeIconBox, { backgroundColor: tipoConf.bg }]}>
          <Text style={styles.typeIconText}>{tipoConf.icon}</Text>
        </View>

        {/* Center */}
        <View style={styles.cardCenter}>
          <Text style={styles.cardTitle} numberOfLines={isExpanded ? 2 : 1}>{titulo}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaDate}>{formatDate(session.fecha, monthShort, weekdayShort)}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.cardMetaDur}>⏱ {duracion}m</Text>
            {dolor ? (
              <View style={styles.dolorTag}>
                <Text style={styles.dolorTagText}>{dolor}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Right */}
        <View style={styles.cardRight}>
          {rpe != null ? (
            <View style={[styles.rpeBadge, { borderColor: `${getRpeColor(rpe)}55` }]}>
              <Text style={[styles.rpeBadgeVal, { color: getRpeColor(rpe) }]}>{rpe}</Text>
              <Text style={styles.rpeBadgeLabel}>RPE</Text>
            </View>
          ) : <View style={styles.rpeBadgeSpacer} />}

          {(fisico != null || mental != null) && (
            <View style={styles.estadoRow}>
              {fisico != null && fisico >= 1 && fisico <= 4 && (
                <Text style={[styles.estadoIcon, { color: FISICO_CONFIG[fisico - 1].color }]}>
                  {FISICO_CONFIG[fisico - 1].icon}
                </Text>
              )}
              {mental != null && mental >= 1 && mental <= 4 && (
                <Text style={[styles.estadoIcon, { color: MENTAL_CONFIG[mental - 1].color }]}>
                  {MENTAL_CONFIG[mental - 1].icon}
                </Text>
              )}
            </View>
          )}

          <Animated.Text style={[styles.chevron, { transform: [{ rotate: chevronRotate }] }]}>
            ⌄
          </Animated.Text>
        </View>
      </View>

      {/* ── Expanded detail ── */}
      {isExpanded && (
        <>
          <View style={styles.expandDivider} />
          <View style={styles.expandContent}>

            {/* Ejercicios */}
            {allEjercicios.length > 0 && (
              <View>
                <Text style={styles.ejSectionLabel}>{t('historial_modal_exercises').toUpperCase()}</Text>
                {allEjercicios.map((ej, i) => (
                  <View key={i}>
                    {i > 0 && <View style={styles.ejDivider} />}
                    <View style={styles.ejRow}>
                      <Text style={styles.ejName} numberOfLines={1}>{ej.nombre}</Text>
                      <Text style={styles.ejMeta}>
                        {ej.series ? `${ej.series}×${ej.repeticiones}` : ej.repeticiones}
                        {ej.rpe_sugerido ? ` · RPE ${ej.rpe_sugerido}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Nota de sesión */}
            {feedback?.notas ? (
              <View style={styles.noteBlock}>
                <Text style={styles.noteIcon}>📝</Text>
                <Text style={styles.noteText}>{feedback.notas}</Text>
              </View>
            ) : null}

          </View>
        </>
      )}
    </TouchableOpacity>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

type WeekGroup = { key: string; label: string; sessions: Session[] }

function ListView({
  weeks,
  hasFilters,
  hasMore,
  isLoadingMore,
  onSelectSession,
}: {
  weeks: WeekGroup[]
  hasFilters: boolean
  hasMore: boolean
  isLoadingMore: boolean
  onSelectSession: (s: Session) => void
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [expandedId, setExpandedId] = useState<number | null>(null)

  function handleToggle(id: number) {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (!weeks.length) {
    if (hasFilters) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyFilterIcon}>◎</Text>
          <Text style={styles.emptyText}>{t('historial_empty')}</Text>
          <Text style={styles.emptySubtext}>{t('historial_empty_sub')}</Text>
        </View>
      )
    }
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{t('historial_empty')}</Text>
        <Text style={styles.emptySubtext}>{t('historial_empty_sub')}</Text>
      </View>
    )
  }

  return (
    <>
      {weeks.map(group => (
        <View key={group.key} style={styles.weekGroup}>
          <Text style={styles.weekLabel}>{group.label.toUpperCase()}</Text>
          {group.sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              isExpanded={expandedId === session.id}
              onToggle={() => handleToggle(session.id)}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      ))}

      {/* Footer */}
      <View style={styles.listFooter}>
        {isLoadingMore ? (
          <Text style={styles.listFooterLoading}>· · ·</Text>
        ) : !hasMore ? (
          <Text style={styles.listFooterEnd}>Has llegado al inicio de tu historial.</Text>
        ) : null}
      </View>
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
  const { t, ta } = useTranslation()
  const calStyles = useMemo(() => makeCalStyles(colors), [colors])

  const sessionsByDate = new Map<string, Session[]>()
  for (const s of sessions) {
    if (!sessionsByDate.has(s.fecha)) sessionsByDate.set(s.fecha, [])
    sessionsByDate.get(s.fecha)!.push(s)
  }

  const today = todayStr()
  const months = getLast6Months()

  // Use i18n arrays
  const MONTH_NAMES_I18N = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const DAY_COLS = ta('historial_days_abbr')

  return (
    <>
      {/* Legend */}
      <View style={calStyles.legend}>
        {[
          { color: '#32c896', label: t('historial_legend_high') },
          { color: '#90EE90', label: t('historial_legend_medium') },
          { color: colors.accent, label: t('historial_legend_rest') },
          { color: '#ffaa32', label: '<70%' },
          { color: '#ffaa32', label: t('historial_legend_today'), isToday: true },
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
              {MONTH_NAMES_I18N[month]} {year}
            </Text>
            {/* Weekday headers */}
            <View style={calStyles.weekHeader}>
              {DAY_COLS.map((d, idx) => (
                <Text key={idx} style={calStyles.weekHeaderCell}>{d}</Text>
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
  const { t, ta } = useTranslation()
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors])
  const styles = useMemo(() => makeStyles(colors), [colors])

  const monthShort = ta('historial_months')
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const fecha = daySessions[0]?.fecha ?? ''
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { maxHeight: '50%' }]}>
          <View style={modalStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.titulo}>{formatDate(fecha, monthShort, weekdayShort)}</Text>
            </View>
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
                    {s.respuesta_ia?.duracion_total ?? s.duracion_planificada} {t('historial_min')}
                    {s.feedback ? ` · RPE ${s.feedback.rpe_real} · ${s.feedback.cumplimiento}%` : ` · ${t('historial_modal_no_data')}`}
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

// ─── Summary Block ───────────────────────────────────────────────────────────

function SummaryBlock({
  sessions, styles, colors,
}: {
  sessions: Session[]
  styles: ReturnType<typeof makeStyles>
  colors: Colors
}) {
  const { t } = useTranslation()
  const totalSesiones  = sessions.length
  const semanasActivas = countActiveWeeks(sessions)
  const masFrec        = getMostFrequent(sessions)

  return (
    <View style={styles.summaryGrid}>
      {/* Row 1: dos cards de igual ancho */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('historial_stat_sessions')}</Text>
          <Text style={styles.summaryNumber}>{totalSesiones}</Text>
          <Text style={styles.summarySub}>Completadas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('historial_stat_weeks')}</Text>
          <Text style={styles.summaryNumber}>{semanasActivas}</Text>
          <Text style={styles.summarySub}>Activas</Text>
        </View>
      </View>

      {/* Row 2: card full-width horizontal */}
      <View style={[styles.summaryCard, styles.summaryCardWide]}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.summaryLabel}>{t('historial_stat_top')}</Text>
          <Text style={styles.summaryWideTitle} numberOfLines={1}>
            {masFrec?.tipo ?? '—'}
          </Text>
        </View>
        {masFrec && (
          <View style={[styles.summaryBadge, { backgroundColor: `${colors.accent}20` }]}>
            <Text style={[styles.summaryBadgeText, { color: colors.accent }]}>
              {masFrec.count} veces
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistorialScreen() {
  const { colors } = useTheme()
  const { t, ta } = useTranslation()
  const styles   = useMemo(() => makeStyles(colors), [colors])
  const insets   = useSafeAreaInsets()

  // ── Deep-link param from dashboard "Ver rutina" ────────────────────────────
  const { fecha: paramFecha } = useLocalSearchParams<{ fecha?: string }>()
  const deepLinkHandled = useRef(false)

  // ── View & data ────────────────────────────────────────────────────────────
  const [view,       setView]       = useState<'lista' | 'calendario'>('lista')
  const [sessions,   setSessions]   = useState<Session[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // ── Search & filters ───────────────────────────────────────────────────────
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tipoFilter,  setTipoFilter]  = useState<FilterTipo>('Todo')

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [selectedSession,    setSelectedSession]    = useState<Session | null>(null)
  const [sessionModalVisible, setSessionModalVisible] = useState(false)
  const [daySessions,        setDaySessions]        = useState<Session[]>([])
  const [dayModalVisible,    setDayModalVisible]    = useState(false)

  // i18n month names for week label formatter
  const monthNamesI18n = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

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

  useEffect(() => { fetchSessions() }, [fetchSessions])

  // ── Auto-open modal when navigated from dashboard with a fecha param ───────
  useEffect(() => {
    if (!paramFecha || loading || deepLinkHandled.current) return
    deepLinkHandled.current = true
    const ds = sessions.filter(s => s.fecha === paramFecha)
    if (ds.length === 1) {
      setSelectedSession(ds[0])
      setSessionModalVisible(true)
    } else if (ds.length > 1) {
      setDaySessions(ds)
      setDayModalVisible(true)
    }
  }, [paramFecha, loading, sessions])

  const filteredSessions = useMemo(() => {
    let result = sessions

    if (tipoFilter !== 'Todo') {
      result = result.filter(s => matchesTipo(s, tipoFilter))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s => {
        const titulo   = (s.respuesta_ia?.titulo          ?? '').toLowerCase()
        const objetivo = (s.respuesta_ia?.objetivo_sesion ?? '').toLowerCase()
        const tipo     = inferTipoSesion(s.respuesta_ia).toLowerCase()
        const ejercs   = s.respuesta_ia?.fases?.flatMap(f => f.ejercicios.map(e => e.nombre.toLowerCase())) ?? []
        return titulo.includes(q) || objetivo.includes(q) || tipo.includes(q) || ejercs.some(n => n.includes(q))
      })
    }

    return result
  }, [sessions, searchQuery, tipoFilter])

  const hasFilters = searchQuery.trim().length > 0 || tipoFilter !== 'Todo'

  // ── Pagination ─────────────────────────────────────────────────────────────
  const allWeeks = useMemo(() => groupByWeek(filteredSessions, monthNamesI18n), [filteredSessions])
  const [visibleWeekCount, setVisibleWeekCount] = useState(3)
  const [isLoadingMore,    setIsLoadingMore]    = useState(false)

  // Reset visible range whenever filters change
  useEffect(() => { setVisibleWeekCount(3) }, [filteredSessions])

  const visibleWeeks = useMemo(() => allWeeks.slice(0, visibleWeekCount), [allWeeks, visibleWeekCount])
  const hasMore      = visibleWeekCount < allWeeks.length

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleWeekCount(prev => Math.min(prev + 3, allWeeks.length))
      setIsLoadingMore(false)
    }, 400)
  }, [hasMore, isLoadingMore, allWeeks.length])

  function handleScroll({ nativeEvent }: any) {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 250) {
      loadMore()
    }
  }

  function toggleSearch() {
    if (searchOpen) {
      setSearchQuery('')
      setTipoFilter('Todo')
    }
    setSearchOpen(v => !v)
  }

  function openSession(s: Session) {
    setSelectedSession(s)
    setSessionModalVisible(true)
  }

  function openDay(ds: Session[]) {
    if (ds.length === 1) openSession(ds[0])
    else { setDaySessions(ds); setDayModalVisible(true) }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={300}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* ── Header ── */}
        <Text style={styles.sectionLabel}>{t('historial_header')}</Text>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit>
            {loading ? '...' : `${sessions.length} ${t('historial_sessions_suffix')}.`}
          </Text>
          <TouchableOpacity
            onPress={toggleSearch}
            activeOpacity={0.7}
            style={[styles.searchBtn, { borderColor: searchOpen ? colors.accent : colors.borderBright }]}
          >
            <Text style={[styles.searchBtnIcon, { color: searchOpen ? colors.accent : colors.inkMuted }]}>
              {searchOpen ? '✕' : '⌕'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Search block ── */}
        {searchOpen && (
          <View style={styles.searchBlock}>
            <TextInput
              style={[styles.searchInput, { color: colors.inkPrimary, borderColor: colors.borderBright }]}
              placeholder={t('historial_search')}
              placeholderTextColor={colors.inkMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTER_TIPOS.map(tipo => {
                const active = tipoFilter === tipo
                return (
                  <TouchableOpacity
                    key={tipo}
                    onPress={() => setTipoFilter(tipo)}
                    activeOpacity={0.7}
                    style={[
                      styles.filterPill,
                      active && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <Text style={[styles.filterPillText, { color: active ? '#fff' : colors.inkMuted }]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Summary ── */}
        {!loading && !error && sessions.length > 0 && (
          <SummaryBlock sessions={sessions} styles={styles} colors={colors} />
        )}

        {/* ── View toggle ── */}
        {!loading && !error && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'lista' && styles.toggleBtnActive]}
              onPress={() => setView('lista')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, view === 'lista' && styles.toggleTextActive]}>{t('historial_view_list')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, view === 'calendario' && styles.toggleBtnActive]}
              onPress={() => setView('calendario')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, view === 'calendario' && styles.toggleTextActive]}>{t('historial_view_calendar')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>{t('historial_loading')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchSessions} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : view === 'lista' ? (
          <ListView
            weeks={visibleWeeks}
            hasFilters={hasFilters}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onSelectSession={openSession}
          />
        ) : (
          <CalendarView sessions={filteredSessions} onSelectDay={openDay} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SessionModal
        session={selectedSession}
        visible={sessionModalVisible}
        onClose={() => setSessionModalVisible(false)}
      />
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
    sectionLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    pageTitle: {
      flex: 1,
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      letterSpacing: -0.8,
    },
    searchBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardBg,
    },
    searchBtnIcon: {
      fontSize: 18,
      lineHeight: 20,
    },
    searchBlock: {
      marginBottom: 14,
      gap: 10,
    },
    searchInput: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    filterPill: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: c.borderBright,
      backgroundColor: c.cardBg,
    },
    filterPillText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.4,
    },
    summaryGrid: {
      gap: 10,
      marginBottom: 20,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 16,
      padding: 16,
      gap: 3,
    },
    summaryCardWide: {
      flex: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    summaryNumber: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      letterSpacing: -0.8,
      lineHeight: 32,
    },
    summarySub: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
    },
    summaryWideTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      letterSpacing: -0.3,
      flex: 1,
    },
    summaryBadge: {
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    summaryBadgeText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 10,
      letterSpacing: 0.3,
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
    emptyFilterIcon: {
      color: c.inkFaint,
      fontSize: 36,
      marginBottom: 4,
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
    weekGroup: {
      marginBottom: 24,
    },
    weekLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    // ── Session Card 2 (accordion) ──────────────────────────────────────────
    sessionCard2: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    typeIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    typeIconText: {
      fontSize: 22,
      lineHeight: 26,
    },
    cardCenter: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    cardTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      letterSpacing: -0.2,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexWrap: 'wrap',
    },
    cardMetaDate: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.2,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: c.inkFaint,
    },
    cardMetaDur: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
    },
    dolorTag: {
      backgroundColor: 'rgba(255,170,50,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,170,50,0.3)',
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    dolorTagText: {
      color: '#ffaa32',
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      letterSpacing: 0.2,
    },
    cardRight: {
      alignItems: 'center',
      gap: 5,
      flexShrink: 0,
    },
    rpeBadge: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: 'center',
      minWidth: 42,
    },
    rpeBadgeVal: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      letterSpacing: -0.3,
    },
    rpeBadgeLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 7,
      letterSpacing: 0.4,
    },
    rpeBadgeSpacer: {
      height: 36,
    },
    estadoRow: {
      flexDirection: 'row',
      gap: 3,
    },
    estadoIcon: {
      fontSize: 12,
      lineHeight: 14,
    },
    chevron: {
      color: c.inkMuted,
      fontSize: 16,
      lineHeight: 18,
    },
    expandDivider: {
      height: 1,
      backgroundColor: c.borderDefault,
      marginTop: 12,
      marginBottom: 12,
    },
    expandContent: {
      gap: 14,
    },
    ejSectionLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      letterSpacing: 1.0,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    ejRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 7,
      gap: 8,
    },
    ejName: {
      flex: 1,
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
    },
    ejMeta: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.2,
      textAlign: 'right',
      flexShrink: 0,
    },
    ejDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderDefault,
    },
    noteBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 12,
      padding: 12,
    },
    noteIcon: {
      fontSize: 14,
      lineHeight: 20,
    },
    noteText: {
      flex: 1,
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      lineHeight: 19,
      fontStyle: 'italic',
    },
    listFooter: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    listFooterLoading: {
      color: c.inkFaint,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      letterSpacing: 4,
    },
    listFooterEnd: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    // ── Legacy card (used by DayModal) ──────────────────────────────────────
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
