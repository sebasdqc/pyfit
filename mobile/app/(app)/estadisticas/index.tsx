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

interface SemanaRPE {
  semana_num: number
  label: string
  rpe: number
}

interface RPEData {
  semanas_entrenando: number
  semanas: SemanaRPE[]
}

// ─── Chart constants ──────────────────────────────────────────────────────────

const CHART_H   = 180
const PAD_T     = 14
const PAD_B     = 26
const PAD_L     = 30
const PAD_R     = 10
const DATA_H    = CHART_H - PAD_T - PAD_B
const Y_MIN     = 5
const Y_MAX     = 10
const Y_RANGE   = Y_MAX - Y_MIN

function rpeToY(rpe: number): number {
  const c = Math.min(Math.max(rpe, Y_MIN), Y_MAX)
  return PAD_T + DATA_H * (1 - (c - Y_MIN) / Y_RANGE)
}

function weekToX(
  weekNum: number,
  minWeek: number,
  maxWeek: number,
  dataW: number,
): number {
  const span = maxWeek - minWeek
  if (span === 0) return PAD_L + dataW / 2
  return PAD_L + ((weekNum - minWeek) / span) * dataW
}

function pathD(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
}

function movingAvg2(semanas: SemanaRPE[]): SemanaRPE[] {
  return semanas.map((s, i) =>
    i === 0 ? s : { ...s, rpe: (semanas[i - 1].rpe + s.rpe) / 2 },
  )
}

function trendText(semanas: SemanaRPE[]): string | null {
  if (semanas.length < 3) return null
  const last3 = semanas.slice(-3)
  const diff = last3[2].rpe - last3[0].rpe
  if (diff < -0.3) return 'Tu esfuerzo percibido está bajando — te estás adaptando.'
  if (diff > 0.3)  return 'Estás empujando más fuerte estas semanas.'
  return 'Tu rendimiento se ha estabilizado en este rango.'
}

// ─── RPE Line Chart ───────────────────────────────────────────────────────────

function RPELineChart({
  semanas,
  totalWeeks,
  containerW,
  accent,
}: {
  semanas: SemanaRPE[]
  totalWeeks: number
  containerW: number
  accent: string
}) {
  const dataW = containerW - PAD_L - PAD_R
  if (dataW <= 10 || semanas.length === 0) return null

  const minWeek = 1
  const maxWeek = Math.max(totalWeeks, semanas[semanas.length - 1]?.semana_num ?? 1)
  const toX = (w: number) => weekToX(w, minWeek, maxWeek, dataW)

  const mainPts = semanas.map(s => ({ x: toX(s.semana_num), y: rpeToY(s.rpe) }))
  const maPts   = movingAvg2(semanas).map(s => ({ x: toX(s.semana_num), y: rpeToY(s.rpe) }))

  // Y grid at integers 5–10
  const yVals = [5, 6, 7, 8, 9, 10]

  // X labels: every 1 (≤8 weeks), 2 (≤16), or 4 (>16)
  const step = maxWeek <= 8 ? 1 : maxWeek <= 16 ? 2 : 4
  const xLabelWeeks: number[] = []
  for (let w = 1; w <= maxWeek; w += step) xLabelWeeks.push(w)
  if (xLabelWeeks[xLabelWeeks.length - 1] !== maxWeek) xLabelWeeks.push(maxWeek)

  return (
    <Svg width={containerW} height={CHART_H}>
      {/* Y gridlines + labels */}
      {yVals.map(v => {
        const y = rpeToY(v)
        return (
          <React.Fragment key={v}>
            <Line
              x1={PAD_L} y1={y}
              x2={containerW - PAD_R} y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <SvgText
              x={PAD_L - 5} y={y + 3.5}
              fontSize={9}
              fill="rgba(255,255,255,0.28)"
              textAnchor="end"
            >
              {v}
            </SvgText>
          </React.Fragment>
        )
      })}

      {/* X axis labels */}
      {xLabelWeeks.map(w => (
        <SvgText
          key={w}
          x={toX(w)} y={CHART_H - 5}
          fontSize={8}
          fill="rgba(255,255,255,0.28)"
          textAnchor="middle"
        >
          {`S${w}`}
        </SvgText>
      ))}

      {/* Moving average — dashed */}
      {maPts.length >= 2 && (
        <Path
          d={pathD(maPts)}
          stroke={`${accent}55`}
          strokeWidth={1.5}
          fill="none"
          strokeDasharray="5 4"
        />
      )}

      {/* Main line */}
      {mainPts.length >= 2 && (
        <Path
          d={pathD(mainPts)}
          stroke={accent}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Dots */}
      {mainPts.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={5}   fill={accent} />
          <Circle cx={p.x} cy={p.y} r={2.5} fill="#000000" />
        </React.Fragment>
      ))}
    </Svg>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EstadisticasScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const { width: screenW } = useWindowDimensions()

  // card inner width: screen - 2*screenPad - 2*cardPad
  const chartW = screenW - 20 * 2 - 16 * 2

  const [filtro,      setFiltro]      = useState<Filtro>('todo')
  const [data,        setData]        = useState<RPEData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [chartBusy,   setChartBusy]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const fetchData = useCallback(async (f: Filtro, initial = false) => {
    if (initial) setLoading(true)
    else setChartBusy(true)
    setError(null)
    try {
      const res = await apiGet(`/api/stats/rpe-semanal/?filtro=${f}`)
      setData(res)
    } catch (e: any) {
      setError(e.message ?? 'Error cargando estadísticas')
    } finally {
      setLoading(false)
      setChartBusy(false)
    }
  }, [])

  useEffect(() => { fetchData(filtro, true) }, []) // eslint-disable-line

  function handleFiltro(f: Filtro) {
    setFiltro(f)
    fetchData(f)
  }

  // ── Loading full screen ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['rgba(37,99,255,0.25)', 'transparent']} style={styles.gradient} />
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </View>
    )
  }

  // ── Error full screen ──────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['rgba(37,99,255,0.25)', 'transparent']} style={styles.gradient} />
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchData(filtro, true)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const semanas           = data?.semanas ?? []
  const semanasEntrenando = data?.semanas_entrenando ?? 0
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
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ESTADÍSTICAS</Text>
        <Text style={styles.pageTitle}>
          {semanasEntrenando}{' '}
          {semanasEntrenando === 1 ? 'semana' : 'semanas'} entrenando.
        </Text>

        {/* ── Bloque 1: Tu progreso en el tiempo ───────────────────────────── */}
        <Text style={styles.blockLabel}>TU PROGRESO EN EL TIEMPO</Text>

        <View style={styles.card}>
          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {FILTROS.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterTab, filtro === f.id && styles.filterTabActive]}
                onPress={() => handleFiltro(f.id)}
                activeOpacity={0.75}
              >
                <Text style={[
                  styles.filterTabText,
                  filtro === f.id && styles.filterTabTextActive,
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart area */}
          <View style={styles.chartArea}>
            {chartBusy ? (
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
                containerW={chartW}
                accent={colors.accent}
              />
            )}
          </View>

          {/* Trend context line */}
          {!chartBusy && hasEnoughData && !!trend && (
            <Text style={styles.trendText}>{trend}</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
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
      top: 0, left: 0, right: 0,
      height: 400,
    },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: 20,
    },
    centerWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingHorizontal: 32,
    },
    errorText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: 'rgba(255,68,68,0.15)',
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 12,
    },
    retryText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
    },
    // Header
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    pageTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      color: c.inkPrimary,
      letterSpacing: -0.8,
      lineHeight: 34,
      marginBottom: 28,
    },
    // Block label
    blockLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    // Card
    card: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 16,
      marginBottom: 20,
    },
    // Filter row
    filterRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 16,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    filterTabActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    filterTabText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 11,
      color: c.inkMuted,
      letterSpacing: 0.1,
    },
    filterTabTextActive: {
      color: '#ffffff',
    },
    // Chart
    chartArea: {
      height: CHART_H,
    },
    chartCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    emptyText: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
    // Trend
    trendText: {
      marginTop: 14,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkSecondary,
      lineHeight: 18,
      fontStyle: 'italic',
    },
  })
}
