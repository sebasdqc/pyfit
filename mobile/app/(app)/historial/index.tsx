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
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import SessionPhotos from '../../../components/SessionPhotos'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { FASES, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, localDateStr } from '../../../lib/api'
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
  peso?: number | null
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

interface RunSessionNorm {
  id: number
  fecha: string               // derivado de started_at (YYYY-MM-DD)
  started_at: string
  ended_at?: string | null
  status: string
  session_type: string        // 'free' | 'planned'
  is_trail: boolean
  total_distance_m: number
  total_duration_s: number
  avg_pace_s_per_km: number
  elevation_gain_m: number
  calories_burned?: number | null
  rpe_real?: number | null
  rating?: number | null
  cumplimiento?: number | null
  created_at: string
}

type GymItem = Session   & { _tipo: 'gym' }
type RunItem = RunSessionNorm & { _tipo: 'run' }
type HistorialItem = GymItem | RunItem

type FilterTipo = 'Todo' | 'Musculación' | 'Running' | 'Libre'

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

// Categoriza el bloque principal por grupo muscular dominante para el título
// corto de la card de Historial — mismo criterio que getShareCardTitle en
// feedback/[id].tsx, pero con label capitalizado para el prefijo "Fuerza -".
const CARD_TITLE_CATEGORIES: { label: string; pattern: RegExp }[] = [
  { label: 'Piernas',  pattern: /sentadilla|zancada|prensa|femoral|cuádricep|cuadricep|glúteo|gluteo|pantorrilla|peso muerto|hip thrust|squat|lunge|deadlift|leg press|leg curl|leg extension/i },
  { label: 'Pecho',    pattern: /pecho|press banca|press de banca|bench press|aperturas|fondos|pectoral|push[\s-]?up|flexion(es)? de brazos/i },
  { label: 'Espalda',  pattern: /espalda|jalón|jalon|remo|dominada|pull[\s-]?up|pulldown|\brow\b|dorsal/i },
  { label: 'Hombros',  pattern: /hombro|press militar|elevaciones laterales|deltoide|overhead press/i },
  { label: 'Brazos',   pattern: /bíceps|biceps|tríceps|triceps|curl/i },
  { label: 'Core',     pattern: /abdominal|\bcore\b|plancha|plank|oblicuo/i },
]

function getSessionCardTitle(ia?: RespuestaIA): string {
  const nombres = ia?.fases?.flatMap(f => f.ejercicios.map(e => e.nombre)) ?? []
  const counts = new Map<string, number>()
  for (const nombre of nombres) {
    const cat = CARD_TITLE_CATEGORIES.find(c => c.pattern.test(nombre))
    if (cat) counts.set(cat.label, (counts.get(cat.label) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [label, count] of counts) {
    if (count > bestCount) { best = label; bestCount = count }
  }
  return best ? `Entrenamiento de Fuerza - ${best}` : 'Entrenamiento de Fuerza'
}

function getSessionTotalSeries(ia?: RespuestaIA): number {
  const ejercicios = ia?.fases?.flatMap(f => f.ejercicios) ?? []
  return ejercicios.reduce((sum, ej) => sum + (ej.series || 0), 0)
}

function formatPace(paceS: number): string {
  if (!paceS || paceS <= 0) return '--'
  const m = Math.floor(paceS / 60)
  const s = paceS % 60
  return `${m}:${String(s).padStart(2, '0')}/km`
}

function formatDuration(totalS: number): string {
  if (!totalS || totalS <= 0) return '--'
  const h = Math.floor(totalS / 3600)
  const m = Math.floor((totalS % 3600) / 60)
  const s = totalS % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDistanceKm(m: number): string {
  if (!m || m <= 0) return '0 km'
  return (m / 1000).toFixed(2) + ' km'
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

// Ícono + color de fondo para el ítem, reutilizado en la vista Calendario y en
// el sheet de "sesiones del día" (mismo lenguaje visual que SessionCard/RunCard).
function getItemVisual(item: HistorialItem): { icon: string; bg: string } {
  if (item._tipo === 'run') {
    return { icon: item.is_trail ? '🏔️' : '🏃', bg: 'rgba(108,229,255,0.15)' }
  }
  const conf = getTipoConfig(item.respuesta_ia)
  return { icon: conf.icon, bg: conf.bg }
}

function getRpeColor(rpe: number): string {
  if (rpe < 6) return '#32c896'
  if (rpe < 8) return '#ffaa32'
  return '#ff4444'
}

function inferTipoSesion(ia?: RespuestaIA): FilterTipo {
  const text = ((ia?.titulo ?? '') + ' ' + (ia?.objetivo_sesion ?? '')).toLowerCase()
  if (/running|correr|cardio|aeróbico|aerobico|trote|kilómetro|kilómetros|ritmo|resistencia cardiovascular/.test(text)) return 'Running'
  if (/fuerza|hipertrofia|pecho|espalda|pierna|cuádricep|femoral|glúteo|bícep|trícep|hombro|sentadilla|press|jalón|musculación|musculacion/.test(text)) return 'Musculación'
  return 'Libre'
}

// ─── Calendar month grid ──────────────────────────────────────────────────────

/** Mes actual + 5 anteriores, más reciente primero. */
function getLast6Months(): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = []
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

// getDay() devuelve 0=Dom…6=Sáb; la grilla es lunes-primero (0=Lun…6=Dom).
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
  const [photos, setPhotos] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  function fetchDetail(sessionId: number) {
    setDetailLoading(true)
    setDetailError(false)
    let cancel = false
    apiGet(`/api/sessions/${sessionId}/`)
      .then((d: any) => { if (!cancel) { setFullIa(d?.respuesta_ia ?? null); setPhotos(d?.photos ?? []); setDetailLoading(false) } })
      .catch(() => { if (!cancel) { setDetailError(true); setDetailLoading(false) } })
    return () => { cancel = true }
  }

  useEffect(() => {
    if (!visible || !session) { setFullIa(null); setPhotos([]); setDetailLoading(false); setDetailError(false); return }
    setPhotos([])
    const yaCompleto = !!session.respuesta_ia?.fases?.some(
      f => f.ejercicios?.some(e => (e as any).series != null)
    )
    if (yaCompleto) { setFullIa(session.respuesta_ia); return }
    setFullIa(null)
    return fetchDetail(session.id)
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

            {/* Indicador de carga del detalle completo */}
            {detailLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <ActivityIndicator color={colors.accent} size="small" />
              </View>
            )}
            {detailError && !detailLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: colors.inkMuted }}>
                  No se pudo cargar el detalle completo
                </Text>
                <TouchableOpacity
                  onPress={() => session && fetchDetail(session.id)}
                  style={{ marginTop: 6 }}
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.accent, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 12 }}>↺ Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}

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
                            {ej.peso != null ? ` · ${ej.peso} kg` : ''}
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

            {/* Fotos de la sesión (galería read-only) */}
            <SessionPhotos kind="gym" sessionId={session.id} initialPhotos={photos} editable={false} />
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
  const { t, ta } = useTranslation()

  const monthShort = ta('historial_months')
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const ia          = session.respuesta_ia
  const titulo      = getSessionCardTitle(ia)
  const duracion    = ia?.duracion_total ?? session.duracion_planificada
  const totalSeries = getSessionTotalSeries(ia)
  const feedback    = session.feedback
  const checkin     = session.checkin
  const tipoConf    = getTipoConfig(ia)
  const rpe         = feedback?.rpe_real
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
            {totalSeries > 0 && (
              <>
                <Text style={styles.cardMetaDur}>{totalSeries} series</Text>
                <View style={styles.metaDot} />
              </>
            )}
            <Text style={styles.cardMetaDur}>⏱ {duracion}m</Text>
            {dolor ? (
              <View style={styles.dolorTag}>
                <Text style={styles.dolorTagText}>{dolor}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardDateLine}>{formatDate(session.fecha, monthShort, weekdayShort)}</Text>
        </View>

        {/* Right */}
        <View style={styles.cardRight}>
          {rpe != null ? (
            <View style={[styles.rpeBadge, { borderColor: `${getRpeColor(rpe)}55` }]}>
              <Text style={[styles.rpeBadgeVal, { color: getRpeColor(rpe) }]}>{rpe}</Text>
              <Text style={styles.rpeBadgeLabel}>RPE</Text>
            </View>
          ) : <View style={styles.rpeBadgeSpacer} />}
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
                        {ej.series ? `${ej.series}×${ej.repeticiones}` : (ej.repeticiones || '')}
                        {ej.peso != null ? ` · ${ej.peso} kg` : ''}
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

// ─── Run Card ─────────────────────────────────────────────────────────────────

function RunCard({
  run,
  isExpanded,
  onToggle,
  styles,
  colors,
}: {
  run: RunItem
  isExpanded: boolean
  onToggle: () => void
  styles: ReturnType<typeof makeStyles>
  colors: Colors
}) {
  const { ta } = useTranslation()
  const monthShort = ta('historial_months')
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const icon = run.is_trail ? '🏔️' : '🏃'
  const rpe = run.rpe_real
  const titulo = run.is_trail ? 'Entrenamiento de Trail' : 'Entrenamiento de Running'

  // Igual que SessionModal: la lista trae los campos básicos, el desglose
  // completo (desnivel/calorías/FC/fotos/feedback) se busca al desplegar.
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!isExpanded || detail) return
    setDetailLoading(true)
    apiGet(`/api/runs/${run.id}/`)
      .then(d => setDetail(d))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [isExpanded])

  const d = detail ?? run
  const photos: any[] = detail?.photos ?? []

  const extraStats = [
    ...(run.elevation_gain_m > 0 ? [{ label: 'DESNIVEL',  value: `↑${Math.round(run.elevation_gain_m)}m` }] : []),
    ...(d.calories_burned  ? [{ label: 'CALORÍAS', value: `${Math.round(d.calories_burned)} kcal` }] : []),
    ...(d.avg_heart_rate   ? [{ label: 'FC MEDIA', value: `${d.avg_heart_rate} bpm` }] : []),
  ]

  return (
    <TouchableOpacity style={styles.sessionCard2} onPress={onToggle} activeOpacity={0.78}>
      <View style={styles.cardRow}>
        <View style={[styles.typeIconBox, { backgroundColor: 'rgba(108,229,255,0.12)' }]}>
          <Text style={styles.typeIconText}>{icon}</Text>
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.cardTitle} numberOfLines={isExpanded ? 2 : 1}>{titulo}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaDur}>{formatDistanceKm(run.total_distance_m)}</Text>
            {run.avg_pace_s_per_km > 0 && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.cardMetaDur}>🚀 {formatPace(run.avg_pace_s_per_km)}</Text>
              </>
            )}
            <View style={styles.metaDot} />
            <Text style={styles.cardMetaDur}>⏱ {formatDuration(run.total_duration_s)}</Text>
          </View>
          <Text style={styles.cardDateLine}>{formatDate(run.fecha, monthShort, weekdayShort)}</Text>
        </View>
        <View style={styles.cardRight}>
          {rpe != null ? (
            <View style={[styles.rpeBadge, { borderColor: `${getRpeColor(rpe)}55` }]}>
              <Text style={[styles.rpeBadgeVal, { color: getRpeColor(rpe) }]}>{rpe}</Text>
              <Text style={styles.rpeBadgeLabel}>RPE</Text>
            </View>
          ) : <View style={styles.rpeBadgeSpacer} />}
        </View>
      </View>

      {/* ── Desglose de ritmo/desnivel/feedback ── */}
      {isExpanded && (
        <>
          <View style={styles.expandDivider} />
          <View style={styles.expandContent}>

            {extraStats.length > 0 && (
              <View style={styles.runStatRow}>
                {extraStats.map(({ label, value }) => (
                  <View key={label} style={styles.runStatChip}>
                    <Text style={styles.runStatValue}>{value}</Text>
                    <Text style={styles.runStatLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            )}

            {detailLoading && !detail && (
              <ActivityIndicator color={colors.accent} size="small" />
            )}

            {(run.rating != null || run.cumplimiento != null) && (
              <Text style={styles.runFeedbackLine}>
                {run.rating != null ? `Rating: ${'⭐'.repeat(run.rating)}` : ''}
                {run.rating != null && run.cumplimiento != null ? '   ·   ' : ''}
                {run.cumplimiento != null ? `Completado: ${run.cumplimiento}%` : ''}
              </Text>
            )}

            {d.feedback_notas ? (
              <View style={styles.noteBlock}>
                <Text style={styles.noteIcon}>📝</Text>
                <Text style={styles.noteText}>{d.feedback_notas}</Text>
              </View>
            ) : null}

            {photos.length > 0 && (
              <SessionPhotos kind="run" sessionId={run.id} initialPhotos={photos} editable={false} />
            )}

          </View>
        </>
      )}
    </TouchableOpacity>
  )
}

// ─── Run Detail Modal ─────────────────────────────────────────────────────────

function RunModal({ run, visible, onClose }: { run: RunItem | null; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme()
  const { ta } = useTranslation()
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors])
  const monthShort = ta('historial_months')
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!visible || !run) { setDetail(null); return }
    setDetailLoading(true)
    apiGet(`/api/runs/${run.id}/`)
      .then(d => setDetail(d))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [visible, run])

  if (!run) return null

  const d = detail ?? run
  const photos: any[] = detail?.photos ?? []

  const statItems = [
    { label: 'DISTANCIA',   value: formatDistanceKm(run.total_distance_m) },
    { label: 'DURACIÓN',    value: formatDuration(run.total_duration_s) },
    { label: 'PACE MEDIO',  value: formatPace(run.avg_pace_s_per_km) },
    ...(run.elevation_gain_m > 0 ? [{ label: 'DESNIVEL', value: `↑${Math.round(run.elevation_gain_m)}m` }] : []),
    ...(d.calories_burned ? [{ label: 'CALORÍAS', value: `${Math.round(d.calories_burned)} kcal` }] : []),
    ...(d.avg_heart_rate   ? [{ label: 'FC MEDIA',  value: `${d.avg_heart_rate} bpm` }] : []),
  ]

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.titulo}>
                {run.is_trail ? '🏔️ Trail Run' : '🏃 Carrera'}
                {run.session_type === 'planned' ? '  · Planificada' : ''}
              </Text>
              <Text style={modalStyles.fecha}>{formatDate(run.fecha, monthShort, weekdayShort)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} activeOpacity={0.7}>
              <Text style={modalStyles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {detailLoading && <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />}

            {/* Métricas */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              {statItems.map(({ label, value }) => (
                <View key={label} style={[modalStyles.statChip, { flex: 1, minWidth: 100 }]}>
                  <Text style={modalStyles.statValue}>{value}</Text>
                  <Text style={modalStyles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Feedback */}
            {(run.rpe_real != null || run.rating != null || run.cumplimiento != null) && (
              <View style={[modalStyles.feedbackCard, { marginBottom: 16 }]}>
                <Text style={modalStyles.feedbackTitle}>FEEDBACK POST-CARRERA</Text>
                <View style={modalStyles.feedbackRow}>
                  {run.rpe_real != null && <Text style={modalStyles.feedbackItem}>RPE real: {run.rpe_real}</Text>}
                  {run.rating   != null && <Text style={modalStyles.feedbackItem}>Rating: {'⭐'.repeat(run.rating)}</Text>}
                  {run.cumplimiento != null && <Text style={modalStyles.feedbackItem}>Completado: {run.cumplimiento}%</Text>}
                </View>
                {d.feedback_notas ? <Text style={modalStyles.feedbackNotas}>{d.feedback_notas}</Text> : null}
              </View>
            )}

            {/* Fotos */}
            {photos.length > 0 && (
              <SessionPhotos kind="run" sessionId={run.id} initialPhotos={photos} editable={false} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
// Icono dentro de un círculo de vidrio + entrada con fade y leve slide-up, en vez
// del glifo geométrico ◎ suelto (que en algunas fuentes se veía como un cuadro).
function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [anim])
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
  return (
    <Animated.View style={[styles.emptyBox, { opacity: anim, transform: [{ translateY }] }]}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIconGlyph}>{icon}</Text>
      </View>
      <Text style={styles.emptyText}>{title}</Text>
      <Text style={styles.emptySubtext}>{subtitle}</Text>
    </Animated.View>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────
// Lista plana ordenada por fecha (sin agrupar por semana) — cada card resume su
// propia fecha, así que el encabezado "Semana del X al X" ya no aporta nada.

function ListView({
  items,
  hasMore,
  isLoadingMore,
}: {
  items: HistorialItem[]
  hasMore: boolean
  isLoadingMore: boolean
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  function handleToggle(key: string) {
    setExpandedKey(prev => prev === key ? null : key)
  }

  if (!items.length) {
    return (
      <EmptyState
        icon="🏋️"
        title={t('historial_empty')}
        subtitle={t('historial_empty_sub')}
      />
    )
  }

  return (
    <>
      {items.map(item => {
        const key = `${item._tipo}-${item.id}`
        return item._tipo === 'run' ? (
          <RunCard
            key={key}
            run={item}
            isExpanded={expandedKey === key}
            onToggle={() => handleToggle(key)}
            styles={styles}
            colors={colors}
          />
        ) : (
          <SessionCard
            key={key}
            session={item}
            isExpanded={expandedKey === key}
            onToggle={() => handleToggle(key)}
            styles={styles}
            colors={colors}
          />
        )
      })}

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
// Grilla mensual (mes actual + 5 anteriores). Los días con sesión muestran el
// ícono de la disciplina en vez del número (fuerza/tipo de gym o carrera/trail);
// los días sin sesión muestran el número. Un punto indica más de una sesión ese día.

function CalendarDayCell({
  date,
  items,
  today,
  colors,
  calStyles,
  onPress,
}: {
  date: Date
  items: HistorialItem[]
  today: string
  colors: Colors
  calStyles: ReturnType<typeof makeCalStyles>
  onPress: () => void
}) {
  const iso = localDateStr(date)
  const isToday = iso === today
  const isFuture = iso > today
  const hasItems = items.length > 0
  const visual = hasItems ? getItemVisual(items[0]) : null

  return (
    <TouchableOpacity
      style={calStyles.dayCell}
      onPress={onPress}
      disabled={!hasItems}
      activeOpacity={hasItems ? 0.7 : 1}
    >
      <View style={{ position: 'relative' }}>
        {hasItems ? (
          <View style={[
            calStyles.dayCircle,
            { backgroundColor: visual!.bg },
            isToday && { borderWidth: 2, borderColor: colors.accent },
          ]}>
            <Text style={calStyles.dayIcon}>{visual!.icon}</Text>
          </View>
        ) : (
          <View style={[calStyles.dayCircle, isToday && { backgroundColor: colors.accent }]}>
            <Text style={[
              calStyles.dayNum,
              { color: isToday ? colors.white : isFuture ? colors.inkFaint : colors.inkSecondary },
              isToday && { fontFamily: 'SpaceGrotesk-Bold' },
            ]}>
              {date.getDate()}
            </Text>
          </View>
        )}
        {items.length > 1 && (
          <View style={[calStyles.dayDot, { backgroundColor: colors.accent, borderColor: colors.cardBg }]} />
        )}
      </View>
    </TouchableOpacity>
  )
}

function CalendarView({
  items,
  onSelectDay,
}: {
  items: HistorialItem[]
  onSelectDay: (dayItems: HistorialItem[]) => void
}) {
  const { colors } = useTheme()
  const { t, ta } = useTranslation()
  const calStyles = useMemo(() => makeCalStyles(colors), [colors])
  const styles = useMemo(() => makeStyles(colors), [colors])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, HistorialItem[]>()
    for (const it of items) {
      if (!map.has(it.fecha)) map.set(it.fecha, [])
      map.get(it.fecha)!.push(it)
    }
    return map
  }, [items])

  const today      = useMemo(() => localDateStr(), [])
  const months      = useMemo(() => getLast6Months(), [])
  const monthNames  = ta('historial_months')
  const dayCols     = ta('historial_days_abbr')

  if (!items.length) {
    return (
      <EmptyState
        icon="🏋️"
        title={t('historial_empty')}
        subtitle={t('historial_empty_sub')}
      />
    )
  }

  return (
    <>
      {months.map(({ year, month }) => {
        const days = getDaysInMonth(year, month)
        const firstOffset = mondayBasedDayIndex(days[0])
        const totalCells = firstOffset + days.length
        const rows = Math.ceil(totalCells / 7)

        return (
          <View key={`${year}-${month}`} style={calStyles.monthBlock}>
            <Text style={calStyles.monthTitle}>{monthNames[month]} {year}</Text>
            <View style={calStyles.weekHeader}>
              {dayCols.map((d, idx) => (
                <Text key={idx} style={calStyles.weekHeaderCell}>{d}</Text>
              ))}
            </View>
            {Array.from({ length: rows }, (_, row) => {
              // Sombreado que conecta los días de entrenamiento consecutivos de
              // esta fila (de la primera a la última sesión de la racha) — un
              // rectángulo redondeado detrás de los círculos del día, visible en
              // los espacios entre ellos.
              const rowHasSession = Array.from({ length: 7 }, (_, col) => {
                const dayIndex = row * 7 + col - firstOffset
                if (dayIndex < 0 || dayIndex >= days.length) return false
                return (itemsByDate.get(localDateStr(days[dayIndex])) ?? []).length > 0
              })
              const shadeSegments: { start: number; end: number }[] = []
              for (let col = 0; col < 7; col++) {
                if (!rowHasSession[col]) continue
                let end = col
                while (end + 1 < 7 && rowHasSession[end + 1]) end++
                if (end > col) shadeSegments.push({ start: col, end })
                col = end
              }

              return (
                <View key={row} style={calStyles.weekRowWrap}>
                  {shadeSegments.map((seg, si) => (
                    <View
                      key={si}
                      pointerEvents="none"
                      style={[
                        calStyles.streakShade,
                        {
                          left: `${(seg.start / 7) * 100}%`,
                          width: `${((seg.end - seg.start + 1) / 7) * 100}%`,
                          backgroundColor: `${colors.accent}26`,
                        },
                      ]}
                    />
                  ))}
                  <View style={calStyles.weekRow}>
                    {Array.from({ length: 7 }, (_, col) => {
                      const cellIndex = row * 7 + col
                      const dayIndex = cellIndex - firstOffset
                      if (dayIndex < 0 || dayIndex >= days.length) {
                        return <View key={col} style={calStyles.dayCell} />
                      }
                      const day = days[dayIndex]
                      const dayItems = itemsByDate.get(localDateStr(day)) ?? []
                      return (
                        <CalendarDayCell
                          key={col}
                          date={day}
                          items={dayItems}
                          today={today}
                          colors={colors}
                          calStyles={calStyles}
                          onPress={() => dayItems.length > 0 && onSelectDay(dayItems)}
                        />
                      )
                    })}
                  </View>
                </View>
              )
            })}
          </View>
        )
      })}
    </>
  )
}

function makeCalStyles(c: Colors) {
  return StyleSheet.create({
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
    weekRowWrap: {
      position: 'relative',
    },
    streakShade: {
      position: 'absolute',
      top: 3,
      height: 30,
      borderRadius: 15,
    },
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 3,
    },
    dayCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayIcon: {
      fontSize: 14,
      lineHeight: 17,
    },
    dayNum: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 12,
    },
    dayDot: {
      position: 'absolute',
      top: -1,
      right: -1,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
    },
  })
}

// ─── Calendar Day Items Modal ─────────────────────────────────────────────────
// Sheet ligero para cuando un día del calendario tiene más de una sesión (gym +
// run mezclados) — lista simple que abre el detalle correspondiente al tocar.

function CalendarDayModal({
  dayItems,
  visible,
  onClose,
  onSelectItem,
}: {
  dayItems: HistorialItem[]
  visible: boolean
  onClose: () => void
  onSelectItem: (item: HistorialItem) => void
}) {
  const { colors } = useTheme()
  const { t, ta } = useTranslation()
  const modalStyles = useMemo(() => makeModalStyles(colors), [colors])
  const styles = useMemo(() => makeStyles(colors), [colors])

  const monthShort   = ta('historial_months')
  const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const fecha = dayItems[0]?.fecha ?? ''

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
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            {dayItems.map(item => {
              const visual = getItemVisual(item)
              const isRun  = item._tipo === 'run'
              const titulo = isRun
                ? `${formatDistanceKm(item.total_distance_m)}${item.is_trail ? '  🏔 Trail' : ''}`
                : (item.respuesta_ia?.titulo ?? 'Sesión de entrenamiento')
              const meta = isRun
                ? `${formatDuration(item.total_duration_s)}${item.avg_pace_s_per_km > 0 ? ` · ${formatPace(item.avg_pace_s_per_km)}` : ''}`
                : `${item.respuesta_ia?.duracion_total ?? item.duracion_planificada} ${t('historial_min')}${item.feedback ? ` · RPE ${item.feedback.rpe_real} · ${item.feedback.cumplimiento}%` : ''}`
              return (
                <TouchableOpacity
                  key={`${item._tipo}-${item.id}`}
                  style={styles.sessionCard}
                  onPress={() => onSelectItem(item)}
                  activeOpacity={0.75}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: visual.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>{visual.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>{titulo}</Text>
                      <Text style={styles.sessionMeta} numberOfLines={1}>{meta}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
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

  // Timer para abrir el detalle tras cerrar este modal; se cancela al desmontar
  // o al elegir otra sesión (evita abrir el modal sobre una pantalla ya desenfocada).
  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (selectTimerRef.current) clearTimeout(selectTimerRef.current) }, [])

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
                  onPress={() => {
                    onClose()
                    if (selectTimerRef.current) clearTimeout(selectTimerRef.current)
                    selectTimerRef.current = setTimeout(() => onSelectSession(s), 300)
                  }}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistorialScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { colors } = useTheme()
  const { t, ta } = useTranslation()
  const styles   = useMemo(() => makeStyles(colors), [colors])
  const insets   = useSafeAreaInsets()

  // ── Deep-link param from dashboard "Ver rutina" / "Ver resumen" ────────────
  // `ts` es un nonce que cambia en cada navegación; permite reabrir el detalle
  // aunque el tab de Historial siga montado (un guard booleano de una sola vez
  // solo abría la primera vez en toda la vida del componente).
  const { fecha: paramFecha, ts: paramTs } = useLocalSearchParams<{ fecha?: string; ts?: string }>()
  const lastDeepLinkKey = useRef<string | null>(null)

  // Timer para abrir el detalle tras cerrar el sheet de días del calendario;
  // se cancela al desmontar (mismo patrón que DayModal más abajo).
  const calendarSelectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (calendarSelectTimerRef.current) clearTimeout(calendarSelectTimerRef.current) }, [])

  // ── Data ───────────────────────────────────────────────────────────────────
  const [gymSessions, setGymSessions] = useState<Session[]>([])
  const [runSessions, setRunSessions] = useState<RunSessionNorm[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // ── View: Lista / Calendario ────────────────────────────────────────────────
  const [view, setView] = useState<'lista' | 'calendario'>('lista')

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [selectedSession,     setSelectedSession]     = useState<GymItem | null>(null)
  const [sessionModalVisible, setSessionModalVisible] = useState(false)
  const [selectedRun,         setSelectedRun]         = useState<RunItem | null>(null)
  const [runModalVisible,     setRunModalVisible]     = useState(false)
  const [daySessions,         setDaySessions]         = useState<Session[]>([])
  const [dayModalVisible,     setDayModalVisible]     = useState(false)
  const [calendarDayItems,        setCalendarDayItems]        = useState<HistorialItem[]>([])
  const [calendarDayModalVisible, setCalendarDayModalVisible] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [gymData, runData] = await Promise.all([
        apiGet('/api/sessions/'),
        apiGet('/api/runs/'),
      ])
      setGymSessions(Array.isArray(gymData) ? gymData : (gymData.results ?? []))
      const rawRuns: any[] = Array.isArray(runData) ? runData : (runData.results ?? [])
      setRunSessions(
        rawRuns
          .filter((r: any) => r.status === 'completed')
          .map((r: any) => ({ ...r, fecha: r.started_at.slice(0, 10) }))
      )
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }, [fetchAll])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Merge gym + run into unified list
  const allItems = useMemo((): HistorialItem[] => {
    const gym: HistorialItem[] = gymSessions.map(s => ({ ...s, _tipo: 'gym' as const }))
    const run: HistorialItem[] = runSessions.map(r => ({ ...r, _tipo: 'run' as const }))
    return [...gym, ...run].sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [gymSessions, runSessions])

  // ── Auto-open modal when navigated from dashboard with a fecha param ───────
  useEffect(() => {
    if (!paramFecha || loading) return
    const key = paramTs ?? `once:${paramFecha}`
    if (lastDeepLinkKey.current === key) return
    lastDeepLinkKey.current = key
    const ds = gymSessions.filter(s => s.fecha === paramFecha)
    if (ds.length === 1) {
      setSelectedSession({ ...ds[0], _tipo: 'gym' })
      setSessionModalVisible(true)
    } else if (ds.length > 1) {
      setDaySessions(ds)
      setDayModalVisible(true)
    }
  }, [paramFecha, paramTs, loading, gymSessions])

  // ── Pagination (lista plana, sin agrupar por semana) ────────────────────────
  const PAGE_SIZE = 10
  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Reset visible range whenever the underlying data changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [allItems])

  const visibleItems = useMemo(() => allItems.slice(0, visibleCount), [allItems, visibleCount])
  const hasMore       = visibleCount < allItems.length

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, allItems.length))
      setIsLoadingMore(false)
    }, 400)
  }, [hasMore, isLoadingMore, allItems.length])

  function handleScroll({ nativeEvent }: any) {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 250 - insets.bottom) {
      loadMore()
    }
  }

  function openSession(s: GymItem) {
    setSelectedSession(s)
    setSessionModalVisible(true)
  }

  function openRun(r: RunItem) {
    setSelectedRun(r)
    setRunModalVisible(true)
  }

  function openCalendarDay(items: HistorialItem[]) {
    if (items.length === 1) {
      const only = items[0]
      if (only._tipo === 'run') openRun(only)
      else openSession(only)
      return
    }
    setCalendarDayItems(items)
    setCalendarDayModalVisible(true)
  }

  function selectFromCalendarDay(item: HistorialItem) {
    setCalendarDayModalVisible(false)
    if (calendarSelectTimerRef.current) clearTimeout(calendarSelectTimerRef.current)
    calendarSelectTimerRef.current = setTimeout(() => {
      if (item._tipo === 'run') openRun(item)
      else openSession(item)
    }, 300)
  }

  return (
    <View style={[styles.root, embedded && { backgroundColor: 'transparent' }]}>
      {!embedded && (
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: embedded ? 8 : insets.top + 24 }]}
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
        {!embedded && <Text style={styles.sectionLabel}>{t('historial_header')}</Text>}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit>
            {loading ? '...' : `${allItems.length} ${t('historial_sessions_suffix')}.`}
          </Text>
        </View>

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
            <TouchableOpacity onPress={fetchAll} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : view === 'lista' ? (
          <ListView
            items={visibleItems}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
        ) : (
          <CalendarView items={allItems} onSelectDay={openCalendarDay} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SessionModal
        session={selectedSession}
        visible={sessionModalVisible}
        onClose={() => setSessionModalVisible(false)}
      />
      <RunModal
        run={selectedRun}
        visible={runModalVisible}
        onClose={() => setRunModalVisible(false)}
      />
      <DayModal
        daySessions={daySessions}
        visible={dayModalVisible}
        onClose={() => setDayModalVisible(false)}
        onSelectSession={(s) => openSession({ ...s, _tipo: 'gym' })}
      />
      <CalendarDayModal
        dayItems={calendarDayItems}
        visible={calendarDayModalVisible}
        onClose={() => setCalendarDayModalVisible(false)}
        onSelectItem={selectFromCalendarDay}
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
    emptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    emptyIconGlyph: {
      fontSize: 28,
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
    cardDateLine: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.2,
      marginTop: 1,
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
    runStatRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    runStatChip: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center',
      minWidth: 72,
    },
    runStatValue: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 14,
      letterSpacing: -0.3,
    },
    runStatLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      letterSpacing: 0.4,
      marginTop: 2,
    },
    runFeedbackLine: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
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
