import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'
import { apiGet } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Filtro = 'todo' | 'fuerza' | 'cardio' | 'movilidad'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todo',      label: 'Todo' },
  { id: 'fuerza',    label: 'Fuerza' },
  { id: 'cardio',    label: 'Cardio' },
  { id: 'movilidad', label: 'Movilidad' },
]

interface SemanaRPE { semana_num: number; label: string; rpe: number }

interface RPEData {
  semanas_entrenando: number
  semanas: SemanaRPE[]
  fecha_registro_year: number
  fecha_registro_month: number
}

interface DiaData { fecha: string; intensidad: number; es_descanso: boolean }

interface ConsistData {
  year: number
  month: number
  dias: DiaData[]
  sesiones_completadas: number
  sesiones_planificadas: number
  fecha_registro_year: number
  fecha_registro_month: number
}

// ─── Chart constants ──────────────────────────────────────────────────────────

const CHART_H = 180
const PAD_T   = 14
const PAD_B   = 26
const PAD_L   = 30
const PAD_R   = 10
const DATA_H  = CHART_H - PAD_T - PAD_B
const Y_MIN   = 5
const Y_MAX   = 10
const Y_RANGE = Y_MAX - Y_MIN

function rpeToY(rpe: number): number {
  const c = Math.min(Math.max(rpe, Y_MIN), Y_MAX)
  return PAD_T + DATA_H * (1 - (c - Y_MIN) / Y_RANGE)
}

function weekToX(w: number, minW: number, maxW: number, dataW: number): number {
  const span = maxW - minW
  if (span === 0) return PAD_L + dataW / 2
  return PAD_L + ((w - minW) / span) * dataW
}

function pathD(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
}

function movingAvg2(arr: SemanaRPE[]): SemanaRPE[] {
  return arr.map((s, i) =>
    i === 0 ? s : { ...s, rpe: (arr[i - 1].rpe + s.rpe) / 2 },
  )
}

function trendText(arr: SemanaRPE[]): string | null {
  if (arr.length < 3) return null
  const last3 = arr.slice(-3)
  const diff = last3[2].rpe - last3[0].rpe
  if (diff < -0.3) return 'Tu esfuerzo percibido está bajando — te estás adaptando.'
  if (diff > 0.3)  return 'Estás empujando más fuerte estas semanas.'
  return 'Tu rendimiento se ha estabilizado en este rango.'
}

// ─── Heat map constants ───────────────────────────────────────────────────────

const INTENSITY_BG = [
  'rgba(255,255,255,0.04)',
  'rgba(79,140,255,0.18)',
  'rgba(79,140,255,0.40)',
  'rgba(79,140,255,0.65)',
  '#4f8cff',
]

const MESES_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const DAY_LABELS = ['L','M','X','J','V','S','D']

function buildCells(year: number, month: number, dias: DiaData[]): (DiaData | null)[] {
  // JS Date month is 0-indexed
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7 // 0=Mon
  const cells: (DiaData | null)[] = Array(firstWeekday).fill(null)
  for (const d of dias) cells.push(d)
  return cells
}

// ─── RPE Line Chart ───────────────────────────────────────────────────────────

function RPELineChart({
  semanas, totalWeeks, containerW, accent,
}: {
  semanas: SemanaRPE[]
  totalWeeks: number
  containerW: number
  accent: string
}) {
  const dataW = containerW - PAD_L - PAD_R
  if (dataW <= 10 || semanas.length === 0) return null

  const minW = 1
  const maxW = Math.max(totalWeeks, semanas[semanas.length - 1]?.semana_num ?? 1)
  const toX  = (w: number) => weekToX(w, minW, maxW, dataW)

  const mainPts = semanas.map(s => ({ x: toX(s.semana_num), y: rpeToY(s.rpe) }))
  const maPts   = movingAvg2(semanas).map(s => ({ x: toX(s.semana_num), y: rpeToY(s.rpe) }))

  const step = maxW <= 8 ? 1 : maxW <= 16 ? 2 : 4
  const xLabels: number[] = []
  for (let w = 1; w <= maxW; w += step) xLabels.push(w)
  if (xLabels[xLabels.length - 1] !== maxW) xLabels.push(maxW)

  return (
    <Svg width={containerW} height={CHART_H}>
      {[5,6,7,8,9,10].map(v => {
        const y = rpeToY(v)
        return (
          <React.Fragment key={v}>
            <Line x1={PAD_L} y1={y} x2={containerW - PAD_R} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <SvgText x={PAD_L - 5} y={y + 3.5} fontSize={9}
              fill="rgba(255,255,255,0.28)" textAnchor="end">
              {v}
            </SvgText>
          </React.Fragment>
        )
      })}

      {xLabels.map(w => (
        <SvgText key={w} x={toX(w)} y={CHART_H - 5} fontSize={8}
          fill="rgba(255,255,255,0.28)" textAnchor="middle">
          {`S${w}`}
        </SvgText>
      ))}

      {maPts.length >= 2 && (
        <Path d={pathD(maPts)} stroke={`${accent}55`} strokeWidth={1.5}
          fill="none" strokeDasharray="5 4" />
      )}

      {mainPts.length >= 2 && (
        <Path d={pathD(mainPts)} stroke={accent} strokeWidth={2.5}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {mainPts.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={5} fill={accent} />
          <Circle cx={p.x} cy={p.y} r={2.5} fill="#000000" />
        </React.Fragment>
      ))}
    </Svg>
  )
}

// ─── Heat Map Block ───────────────────────────────────────────────────────────

function HeatMapBlock({
  data,
  loading,
  regYear,
  regMonth,
  mesActual,
  onPrev,
  onNext,
  containerW,
  styles,
}: {
  data: ConsistData | null
  loading: boolean
  regYear: number
  regMonth: number
  mesActual: { year: number; month: number }
  onPrev: () => void
  onNext: () => void
  containerW: number
  styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()

  const today    = new Date()
  const canPrev  = mesActual.year > regYear || (mesActual.year === regYear && mesActual.month > regMonth)
  const canNext  = mesActual.year < today.getFullYear() ||
                   (mesActual.year === today.getFullYear() && mesActual.month < today.getMonth() + 1)

  // Grid sizing
  const GAP      = 4
  const cellSize = Math.floor((containerW - GAP * 6) / 7)

  return (
    <>
      {/* Section label + navigator on same row */}
      <View style={styles.consistHeaderRow}>
        <Text style={styles.blockLabel}>TU CONSISTENCIA</Text>

        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={canPrev ? onPrev : undefined}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={canPrev ? 0.7 : 1}
          >
            <Text style={[styles.navArrow, !canPrev && styles.navArrowDisabled]}>←</Text>
          </TouchableOpacity>

          <Text style={styles.navMonth}>
            {MESES_ES[mesActual.month - 1]} {mesActual.year}
          </Text>

          <TouchableOpacity
            onPress={canNext ? onNext : undefined}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={canNext ? 0.7 : 1}
          >
            <Text style={[styles.navArrow, !canNext && styles.navArrowDisabled]}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        {loading || !data ? (
          <View style={styles.heatLoadingWrap}>
            <ActivityIndicator color={colors.accent} size="small" />
          </View>
        ) : (
          <>
            {/* Day headers */}
            <View style={[styles.dayHeaderRow, { gap: GAP }]}>
              {DAY_LABELS.map(d => (
                <View key={d} style={{ width: cellSize, alignItems: 'center' }}>
                  <Text style={styles.dayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {(() => {
              const cells = buildCells(data.year, data.month, data.dias)
              const rows: (DiaData | null)[][] = []
              for (let i = 0; i < cells.length; i += 7) {
                rows.push(cells.slice(i, i + 7))
              }
              return rows.map((row, ri) => (
                <View key={ri} style={[styles.gridRow, { gap: GAP, marginBottom: GAP }]}>
                  {Array.from({ length: 7 }).map((_, ci) => {
                    const cell = row[ci] ?? null
                    if (cell === null) {
                      return <View key={ci} style={{ width: cellSize, height: cellSize }} />
                    }
                    if (cell.es_descanso) {
                      return (
                        <View
                          key={ci}
                          style={{
                            width: cellSize, height: cellSize, borderRadius: 3,
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: 'rgba(255,170,50,0.55)',
                          }}
                        />
                      )
                    }
                    return (
                      <View
                        key={ci}
                        style={{
                          width: cellSize, height: cellSize, borderRadius: 3,
                          backgroundColor: INTENSITY_BG[cell.intensidad] ?? INTENSITY_BG[0],
                        }}
                      />
                    )
                  })}
                </View>
              ))
            })()}

            {/* Legend */}
            <View style={styles.legendRow}>
              <Text style={styles.legendText}>Menos</Text>
              {INTENSITY_BG.map((bg, i) => (
                <View key={i} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: bg }} />
              ))}
              <Text style={styles.legendText}>Más</Text>
            </View>

            {/* Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={[styles.metricValue, { color: colors.accent }]}>
                  {data.sesiones_completadas}
                </Text>
                <Text style={styles.metricLabel}>SESIONES</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricBox}>
                <Text style={[styles.metricValue, { color: colors.green }]}>
                  {data.sesiones_planificadas > 0
                    ? `${Math.round((data.sesiones_completadas / data.sesiones_planificadas) * 100)}%`
                    : '—'}
                </Text>
                <Text style={styles.metricLabel}>DE LO PLANIFICADO</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EstadisticasScreen() {
  const { colors } = useTheme()
  const styles     = React.useMemo(() => makeStyles(colors), [colors])
  const insets     = useSafeAreaInsets()
  const { width: screenW } = useWindowDimensions()

  const cardInnerW = screenW - 20 * 2 - 16 * 2  // screen pad + card pad

  // ── Block 1 state ─────────────────────────────────────────────────────────
  const [filtro,       setFiltro]       = useState<Filtro>('todo')
  const [rpeData,      setRpeData]      = useState<RPEData | null>(null)
  const [rpeChartBusy, setRpeChartBusy] = useState(false)

  // ── Block 2 state ─────────────────────────────────────────────────────────
  const now = new Date()
  const [mesActual,      setMesActual]      = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [consistData,    setConsistData]    = useState<ConsistData | null>(null)
  const [consistLoading, setConsistLoading] = useState(false)
  const [regDate, setRegDate] = useState({ year: 2000, month: 1 })

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true)
  const [error,          setError]          = useState<string | null>(null)

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchRPE = useCallback(async (f: Filtro, isInitial = false) => {
    if (!isInitial) setRpeChartBusy(true)
    try {
      const res: RPEData = await apiGet(`/api/stats/rpe-semanal/?filtro=${f}`)
      setRpeData(res)
      setRegDate({ year: res.fecha_registro_year, month: res.fecha_registro_month })
    } catch (e: any) {
      if (isInitial) setError(e.message ?? 'Error cargando estadísticas')
    } finally {
      setRpeChartBusy(false)
    }
  }, [])

  const fetchConsist = useCallback(async (year: number, month: number, isInitial = false) => {
    if (!isInitial) setConsistLoading(true)
    try {
      const res: ConsistData = await apiGet(`/api/stats/consistencia-mensual/?year=${year}&month=${month}`)
      setConsistData(res)
      setRegDate({ year: res.fecha_registro_year, month: res.fecha_registro_month })
    } catch (e: any) {
      if (isInitial) setError(e.message ?? 'Error cargando estadísticas')
    } finally {
      setConsistLoading(false)
    }
  }, [])

  useEffect(() => {
    const { year, month } = mesActual
    Promise.all([
      fetchRPE('todo', true),
      fetchConsist(year, month, true),
    ]).finally(() => setInitialLoading(false))
  }, []) // eslint-disable-line

  // ── Month navigation ───────────────────────────────────────────────────────
  function goPrev() {
    const m = mesActual.month === 1
      ? { year: mesActual.year - 1, month: 12 }
      : { year: mesActual.year, month: mesActual.month - 1 }
    setMesActual(m)
    fetchConsist(m.year, m.month)
  }

  function goNext() {
    const m = mesActual.month === 12
      ? { year: mesActual.year + 1, month: 1 }
      : { year: mesActual.year, month: mesActual.month + 1 }
    setMesActual(m)
    fetchConsist(m.year, m.month)
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['rgba(37,99,255,0.25)', 'transparent']} style={styles.gradient} />
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['rgba(37,99,255,0.25)', 'transparent']} style={styles.gradient} />
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null)
              setInitialLoading(true)
              Promise.all([
                fetchRPE(filtro, true),
                fetchConsist(mesActual.year, mesActual.month, true),
              ]).finally(() => setInitialLoading(false))
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const semanas           = rpeData?.semanas ?? []
  const semanasEntrenando = rpeData?.semanas_entrenando ?? 0
  const hasEnoughData     = semanas.length >= 2
  const trend             = trendText(semanas)

  return (
    <View style={styles.root}>
      <LinearGradient colors={['rgba(37,99,255,0.25)', 'transparent']} style={styles.gradient} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Text style={styles.sectionLabel}>ESTADÍSTICAS</Text>
        <Text style={styles.pageTitle}>
          {semanasEntrenando}{' '}
          {semanasEntrenando === 1 ? 'semana' : 'semanas'} entrenando.
        </Text>

        {/* ── Bloque 1: Tu progreso en el tiempo ── */}
        <Text style={styles.blockLabel}>TU PROGRESO EN EL TIEMPO</Text>

        <View style={styles.card}>
          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {FILTROS.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterTab, filtro === f.id && styles.filterTabActive]}
                onPress={() => { setFiltro(f.id); fetchRPE(f.id) }}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterTabText, filtro === f.id && styles.filterTabTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart area */}
          <View style={styles.chartArea}>
            {rpeChartBusy ? (
              <View style={styles.chartCenter}>
                <ActivityIndicator color={colors.accent} size="small" />
              </View>
            ) : !hasEnoughData ? (
              <View style={styles.chartCenter}>
                <Text style={styles.emptyText}>
                  {filtro === 'todo'
                    ? 'Completa al menos 2 semanas de entrenamiento para ver tu progreso.'
                    : 'No hay suficientes datos para este filtro aún.'}
                </Text>
              </View>
            ) : (
              <RPELineChart
                semanas={semanas}
                totalWeeks={semanasEntrenando}
                containerW={cardInnerW}
                accent={colors.accent}
              />
            )}
          </View>

          {!rpeChartBusy && hasEnoughData && !!trend && (
            <Text style={styles.trendText}>{trend}</Text>
          )}
        </View>

        {/* ── Bloque 2: Tu consistencia ── */}
        <HeatMapBlock
          data={consistData}
          loading={consistLoading}
          regYear={regDate.year}
          regMonth={regDate.month}
          mesActual={mesActual}
          onPrev={goPrev}
          onNext={goNext}
          containerW={cardInnerW}
          styles={styles}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
    scroll:   { flex: 1 },
    content:  { paddingHorizontal: 20 },

    centerWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 16, paddingHorizontal: 32,
    },
    errorText: {
      color: c.red, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: 'rgba(255,68,68,0.15)',
      paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    },
    retryText: { color: c.red, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 },

    // Header
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted,
      letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8,
    },
    pageTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 28, color: c.inkPrimary,
      letterSpacing: -0.8, lineHeight: 34, marginBottom: 28,
    },

    // Block labels
    blockLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted,
      letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12,
    },

    // Card
    card: {
      backgroundColor: c.cardBg, borderWidth: 1,
      borderColor: c.borderDefault, borderRadius: 20,
      padding: 16, marginBottom: 20,
    },

    // Filter tabs
    filterRow:           { flexDirection: 'row', gap: 6, marginBottom: 16 },
    filterTab:           { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.borderDefault },
    filterTabActive:     { backgroundColor: c.accent, borderColor: c.accent },
    filterTabText:       { fontFamily: 'SpaceGrotesk-Medium', fontSize: 11, color: c.inkMuted, letterSpacing: 0.1 },
    filterTabTextActive: { color: '#ffffff' },

    // Chart
    chartArea:   { height: CHART_H },
    chartCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    emptyText:   { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
    trendText:   { marginTop: 14, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkSecondary, lineHeight: 18, fontStyle: 'italic' },

    // Consistencia header row
    consistHeaderRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 12,
    },

    // Month navigator
    navRow:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
    navMonth:        { fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, color: c.inkSecondary, letterSpacing: -0.2, minWidth: 100, textAlign: 'center' },
    navArrow:        { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: c.accent },
    navArrowDisabled:{ color: c.borderDefault },

    // Heat map internals
    heatLoadingWrap: { height: 180, alignItems: 'center', justifyContent: 'center' },
    dayHeaderRow:    { flexDirection: 'row', marginBottom: 6 },
    dayHeaderText:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.3 },
    gridRow:         { flexDirection: 'row' },

    // Legend
    legendRow: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      marginTop: 14, marginBottom: 2,
    },
    legendText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.inkMuted, letterSpacing: 0.3,
    },

    // Metrics
    metricsRow: {
      flexDirection: 'row', alignItems: 'center',
      marginTop: 14, paddingTop: 14,
      borderTopWidth: 1, borderTopColor: c.borderDefault,
    },
    metricBox:     { flex: 1, alignItems: 'center', gap: 4 },
    metricDivider: { width: 1, height: 44, backgroundColor: c.borderDefault },
    metricValue:   { fontFamily: 'SpaceGrotesk-Bold', fontSize: 26, letterSpacing: -0.8 },
    metricLabel:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  })
}
