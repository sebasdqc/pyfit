import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  useWindowDimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Line, Path, Circle, Rect, Text as SvgText } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'
import { apiGet, apiPost, apiDelete } from '../../../lib/api'
import RadarBlock, { RadarBlockEmpty, RadarMetric } from '../../../components/RadarBlock'
import { useTranslation } from '../../../lib/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

type Filtro = 'todo' | 'fuerza' | 'cardio' | 'libre'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todo',   label: 'Todo' },
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'libre',  label: 'Libre' },
]

interface DiaRendimiento { fecha: string; label: string; rendimiento: number }

interface RPEData {
  semanas_entrenando: number
  dias: DiaRendimiento[]
  fecha_registro_year: number
  fecha_registro_month: number
}

interface DiaData { fecha: string; intensidad: number; es_descanso: boolean }

interface CalendarEventData {
  id: number
  fecha: string  // YYYY-MM-DD
  titulo: string
  tipo: 'competicion' | 'descanso' | 'otro'
}

const EVENT_COLORS: Record<CalendarEventData['tipo'], string> = {
  competicion: '#ffaa32',
  descanso:    '#a78bfa',
  otro:        '#6ce5ff',
}

interface ConsistData {
  year: number
  month: number
  dias: DiaData[]
  sesiones_completadas: number
  sesiones_planificadas: number
  fecha_registro_year: number
  fecha_registro_month: number
}

interface SemanaEstado { semana_num: number; label: string; promedio: number }

interface DiaEstado { fecha: string; label: string; valor: number }

interface EjercicioTop {
  nombre: string
  count: number
  categoria: string
  rpe_promedio: number
  variacion: number | null
}

interface CuerpoData {
  dias_fisico: DiaEstado[]
  dias_mental: DiaEstado[]
  intencion_counts: { serio: number; descargar: number; moverme: number; recuperar: number }
  total_checkins: number
}

// ─── Chart constants ──────────────────────────────────────────────────────────

const CHART_H = 180
const PAD_T   = 14
const PAD_B   = 26
const PAD_L   = 30
const PAD_R   = 10
const DATA_H  = CHART_H - PAD_T - PAD_B
const Y_MIN   = 1
const Y_MAX   = 10
const Y_RANGE = Y_MAX - Y_MIN  // 9

// Rendimiento 1-10 donde 10 = tope → arriba del gráfico
function rpeToY(r: number): number {
  const c = Math.min(Math.max(r, Y_MIN), Y_MAX)
  return PAD_T + DATA_H * (1 - (c - Y_MIN) / Y_RANGE)
}

function pathD(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
}

function movingAvg2(arr: DiaRendimiento[]): DiaRendimiento[] {
  return arr.map((d, i) =>
    i === 0 ? d : { ...d, rendimiento: (arr[i - 1].rendimiento + d.rendimiento) / 2 },
  )
}

function trendText(arr: DiaRendimiento[]): string | null {
  if (arr.length < 3) return null
  const last3 = arr.slice(-3)
  const diff = last3[2].rendimiento - last3[0].rendimiento
  if (diff > 0.3)  return 'Tu rendimiento está mejorando — el esfuerzo percibido disminuye.'
  if (diff < -0.3) return 'El esfuerzo percibido ha aumentado — considera una semana de descarga.'
  return 'Tu rendimiento se ha estabilizado en este rango.'
}

// ─── Heat map constants ───────────────────────────────────────────────────────

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
  dias, containerW, accent, grid, label, bg,
}: {
  dias: DiaRendimiento[]
  containerW: number
  accent: string
  grid:   string
  label:  string
  bg:     string
}) {
  const dataW = containerW - PAD_L - PAD_R
  const n = dias.length
  if (dataW <= 10 || n === 0) return null

  const toX = (i: number) => PAD_L + (n <= 1 ? dataW / 2 : (i / (n - 1)) * dataW)

  const mainPts = dias.map((d, i) => ({ x: toX(i), y: rpeToY(d.rendimiento) }))
  const maPts   = movingAvg2(dias).map((d, i) => ({ x: toX(i), y: rpeToY(d.rendimiento) }))

  // X labels at week boundaries (every 7 data points) + last
  const xLabelSet = new Set<number>()
  for (let i = 0; i < n; i += 7) xLabelSet.add(i)
  xLabelSet.add(n - 1)

  return (
    <Svg width={containerW} height={CHART_H}>
      {/* Y grid — show even numbers 2,4,6,8,10 */}
      {[2, 4, 6, 8, 10].map(v => {
        const y = rpeToY(v)
        return (
          <React.Fragment key={v}>
            <Line x1={PAD_L} y1={y} x2={containerW - PAD_R} y2={y}
              stroke={grid} strokeWidth={1} />
            <SvgText x={PAD_L - 5} y={y + 3.5} fontSize={9}
              fill={label} textAnchor="end">
              {v}
            </SvgText>
          </React.Fragment>
        )
      })}

      {/* X labels at week boundaries */}
      {dias.map((d, i) =>
        xLabelSet.has(i) ? (
          <SvgText key={i} x={toX(i)} y={CHART_H - 5} fontSize={8}
            fill={label} textAnchor="middle">
            {d.label}
          </SvgText>
        ) : null
      )}

      {/* Moving average (dashed) */}
      {maPts.length >= 2 && (
        <Path d={pathD(maPts)} stroke={`${accent}55`} strokeWidth={1.5}
          fill="none" strokeDasharray="5 4" />
      )}

      {/* Main line */}
      {mainPts.length >= 2 && (
        <Path d={pathD(mainPts)} stroke={accent} strokeWidth={2.5}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Data points */}
      {mainPts.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={5} fill={accent} />
          <Circle cx={p.x} cy={p.y} r={2.5} fill={bg} />
        </React.Fragment>
      ))}
    </Svg>
  )
}

// ─── Bar chart for estados (1–4 scale) ───────────────────────────────────────

const BC_DATA_H = 70  // bar area height per spec
const BC_PAD_T  = 20  // space above bars for tooltip
const BC_PAD_B  = 16  // X labels
const BC_SIDE   = 8
const BC_SVG_H  = BC_PAD_T + BC_DATA_H + BC_PAD_B

function bcY(v: number): number {
  return BC_PAD_T + BC_DATA_H * (1 - (Math.min(Math.max(v, 1), 4) - 1) / 3)
}

function EstadoBarChart({
  semanas, color, containerW, grid, label,
}: {
  semanas: SemanaEstado[]
  color: string
  containerW: number
  grid:   string
  label:  string
}) {
  const [tipIdx, setTipIdx] = useState<number | null>(null)
  const dataW = containerW - BC_SIDE * 2
  const n = semanas.length
  if (n === 0 || dataW <= 0) return null

  const barW  = Math.min(20, Math.floor((dataW / n) * 0.55))
  const step  = n <= 1 ? 0 : dataW / (n - 1)
  const xStep = n <= 8 ? 1 : n <= 16 ? 2 : 4

  return (
    <Svg width={containerW} height={BC_SVG_H}>
      {[1, 2, 3, 4].map(v => (
        <Line key={v}
          x1={BC_SIDE} y1={bcY(v)}
          x2={containerW - BC_SIDE} y2={bcY(v)}
          stroke={grid} strokeWidth={1} />
      ))}

      {semanas.map((s, i) => {
        const cx   = BC_SIDE + (n === 1 ? dataW / 2 : i * step)
        const top  = bcY(s.promedio)
        const barH = Math.max((BC_PAD_T + BC_DATA_H) - top, 4)
        const barY = (BC_PAD_T + BC_DATA_H) - barH
        const pressed = tipIdx === i

        return (
          <React.Fragment key={i}>
            <Rect
              x={cx - barW / 2} y={barY} width={barW} height={barH}
              rx={3}
              fill={pressed ? color : `${color}70`}
              onPress={() => setTipIdx(pressed ? null : i)}
            />
            {pressed && (
              <SvgText
                x={cx} y={barY - 4}
                fontSize={9} fill={color} textAnchor="middle"
              >
                {s.promedio.toFixed(1)}
              </SvgText>
            )}
            {i % xStep === 0 && (
              <SvgText
                x={cx} y={BC_PAD_T + BC_DATA_H + 12}
                fontSize={8} fill={label} textAnchor="middle"
              >
                {s.label}
              </SvgText>
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// ─── Donut chart for intención ────────────────────────────────────────────────

const INTENCION_DEFS = [
  { id: 'serio',     label: 'Entrenar en serio',      color: '#4f8cff' },
  { id: 'descargar', label: 'Descargar energía',       color: '#ffaa32' },
  { id: 'moverme',   label: 'Moverme aunque sea poco', color: '#32c896' },
  { id: 'recuperar', label: 'Recuperarme activamente', color: '#6ce5ff' },
] as const

function roundToHundred(vals: number[]): number[] {
  const total = vals.reduce((a, b) => a + b, 0)
  if (total === 0) return vals.map(() => 0)
  const raw     = vals.map(v => (v / total) * 100)
  const floored = raw.map(Math.floor)
  const rem     = 100 - floored.reduce((a, b) => a + b, 0)
  const fracs   = raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < rem; k++) floored[fracs[k].i]++
  return floored
}

function arcPath(cx: number, cy: number, R: number, r: number, a0: number, a1: number): string {
  const x1 = cx + R * Math.cos(a0), y1 = cy + R * Math.sin(a0)
  const x2 = cx + R * Math.cos(a1), y2 = cy + R * Math.sin(a1)
  const x3 = cx + r * Math.cos(a1), y3 = cy + r * Math.sin(a1)
  const x4 = cx + r * Math.cos(a0), y4 = cy + r * Math.sin(a0)
  const lg  = a1 - a0 > Math.PI ? 1 : 0
  return [
    `M${x1.toFixed(2)},${y1.toFixed(2)}`,
    `A${R},${R},0,${lg},1,${x2.toFixed(2)},${y2.toFixed(2)}`,
    `L${x3.toFixed(2)},${y3.toFixed(2)}`,
    `A${r},${r},0,${lg},0,${x4.toFixed(2)},${y4.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function DonutChart({
  counts, containerW, ringBg, centerBg, legendLabel,
}: {
  counts: CuerpoData['intencion_counts']
  containerW: number
  ringBg:      string  // anillo de fondo
  centerBg:    string  // centro del donut
  legendLabel: string  // color de los labels en la leyenda
}) {
  const raw   = INTENCION_DEFS.map(d => counts[d.id] ?? 0)
  const total = raw.reduce((a, b) => a + b, 0)
  const pcts  = roundToHundred(raw)

  const CX = containerW / 2
  const CY = 45
  const R  = 34
  const ri = 21
  const GAP = 0.05 // radians gap between adjacent segments

  const angles = raw.map(c => (total > 0 ? (c / total) : 0) * Math.PI * 2)
  let cursor   = -Math.PI / 2

  return (
    <>
      <Svg width={containerW} height={90}>
        {/* Background ring */}
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={ringBg} strokeWidth={R - ri} />

        {INTENCION_DEFS.map((def, i) => {
          const angle = angles[i]
          if (angle < 0.01) { cursor += angle; return null }
          const isFull = angle >= Math.PI * 2 - 0.01
          const a0 = cursor + (isFull ? 0 : GAP / 2)
          const a1 = cursor + angle - (isFull ? 0 : GAP / 2)
          cursor += angle
          if (isFull) {
            return (
              <React.Fragment key={def.id}>
                <Circle cx={CX} cy={CY} r={R}  fill={def.color} />
                <Circle cx={CX} cy={CY} r={ri} fill={centerBg} />
              </React.Fragment>
            )
          }
          return <Path key={def.id} d={arcPath(CX, CY, R, ri, a0, a1)} fill={def.color} />
        })}
      </Svg>

      {/* Legend: 2×2 grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {INTENCION_DEFS.map((def, i) => (
          <View key={def.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%' }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: def.color }} />
            <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 10, color: legendLabel, flex: 1 }} numberOfLines={1}>
              {def.label}
            </Text>
            <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: def.color }}>
              {pcts[i]}%
            </Text>
          </View>
        ))}
      </View>
    </>
  )
}

// ─── Mini bar chart for estado mini-cards (48px) ─────────────────────────────

const MB_SVG_H  = 48
const MB_PAD_T  = 4
const MB_PAD_B  = 10
const MB_DATA_H = MB_SVG_H - MB_PAD_T - MB_PAD_B
const MB_SIDE   = 3

function mbY(v: number): number {
  return MB_PAD_T + MB_DATA_H * (1 - (Math.min(Math.max(v, 1), 4) - 1) / 3)
}

function EstadoMiniBarChart({ dias, color, containerW, label }: {
  dias: DiaEstado[]
  color: string
  containerW: number
  label: string
}) {
  const dataW = containerW - MB_SIDE * 2
  const n = dias.length
  if (n === 0 || dataW <= 0) return null

  // Width per slot: leave a small gap between bars (barW ≈ 60% of slot)
  const slotW = dataW / n
  const barW  = Math.max(2, Math.min(10, Math.floor(slotW * 0.65)))
  const xStep = n <= 1 ? 0 : dataW / (n - 1)

  return (
    <Svg width={containerW} height={MB_SVG_H}>
      {dias.map((d, i) => {
        const cx   = MB_SIDE + (n === 1 ? dataW / 2 : i * xStep)
        const top  = mbY(d.valor)
        const barH = Math.max((MB_PAD_T + MB_DATA_H) - top, 3)
        const barY = (MB_PAD_T + MB_DATA_H) - barH
        const isLast = i === n - 1
        // Show label at week boundaries (every 7 data points) and on the last bar
        const showLabel = i % 7 === 0 || isLast
        return (
          <React.Fragment key={i}>
            <Rect
              x={cx - barW / 2} y={barY}
              width={barW} height={barH} rx={2}
              fill={isLast ? color : `${color}66`}
            />
            {showLabel && (
              <SvgText x={cx} y={MB_SVG_H - 1} fontSize={7} fill={label} textAnchor="middle">
                {d.label}
              </SvgText>
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// ─── Mini estado card (2-column layout for Bloque 3) ─────────────────────────

function EstadoMiniCard({ title, dias, color, containerW, label }: {
  title: string
  dias: DiaEstado[]
  color: string
  containerW: number
  label: string
}) {
  const { colors } = useTheme()
  const currentVal = dias.length > 0 ? dias[dias.length - 1].valor : null
  const prevVal    = dias.length > 1 ? dias[dias.length - 2].valor : null
  const delta      = currentVal !== null && prevVal !== null ? currentVal - prevVal : null

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: 14,
      padding: 10,
    }}>
      <Text style={{
        fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: colors.inkMuted,
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
      }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: colors.inkPrimary, letterSpacing: -0.5 }}>
          {currentVal !== null ? currentVal.toFixed(1) : '—'}
        </Text>
        {delta !== null && (
          <Text style={{
            fontFamily: 'JetBrainsMono-Medium', fontSize: 10,
            color: delta >= 0 ? colors.green : colors.orange,
          }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}
          </Text>
        )}
      </View>
      {dias.length > 0 && (
        <EstadoMiniBarChart
          dias={dias}
          color={color}
          containerW={containerW - 20}
          label={label}
        />
      )}
    </View>
  )
}

// ─── Top exercises list ───────────────────────────────────────────────────────

function EjercicioTopList({
  ejercicios, styles, colors,
}: {
  ejercicios: EjercicioTop[]
  styles: ReturnType<typeof makeStyles>
  colors: Colors
}) {
  const { t } = useTranslation()

  if (ejercicios.length === 0) {
    return (
      <View style={[styles.chartCenter, { height: 80 }]}>
        <Text style={styles.emptyText}>
          {t('stats_no_data_sub')}
        </Text>
      </View>
    )
  }

  function varColor(v: number): string {
    if (v < 0) return colors.green
    if (v > 0) return colors.orange
    return colors.inkMuted
  }

  function varArrow(v: number): string {
    if (v < 0) return '↓'
    if (v > 0) return '↑'
    return '='
  }

  function varLabel(v: number): string {
    if (v === 0) return '0.0'
    const sign = v > 0 ? '+' : ''
    return `${sign}${v.toFixed(1)}`
  }

  return (
    <View>
      {ejercicios.map((ej, i) => (
        <View key={ej.nombre}>
          {i > 0 && <View style={styles.exDivider} />}
          <View style={styles.exRow}>
            {/* Position */}
            <Text style={styles.exPos}>{i + 1}</Text>

            {/* Name + meta */}
            <View style={styles.exCenter}>
              <Text style={styles.exNombre} numberOfLines={1}>{ej.nombre}</Text>
              <Text style={styles.exMeta}>
                {ej.count} {ej.count === 1 ? 'vez' : t('stats_top_ex_times')} · {ej.categoria}
              </Text>
            </View>

            {/* RPE + variation */}
            <View style={styles.exRight}>
              <Text style={styles.exRpe}>{ej.rpe_promedio.toFixed(1)}</Text>
              {ej.variacion !== null ? (
                <Text style={[styles.exVar, { color: varColor(ej.variacion) }]}>
                  {varArrow(ej.variacion)} {varLabel(ej.variacion)}
                </Text>
              ) : (
                <Text style={styles.exVarPrimeras}>Primeras</Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Competition Cell — celda con brillo en loop ─────────────────────────────

function CompetitionCell({
  cellSize,
  dayNum,
  onPress,
}: {
  cellSize: number
  dayNum: number
  onPress: () => void
}) {
  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  const fontSize = Math.max(7, Math.floor(cellSize * 0.38))

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ width: cellSize, height: cellSize + 8, alignItems: 'center' }}
    >
      <View style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
        {/* Halo pulsante */}
        <Animated.View style={{
          position: 'absolute',
          width: cellSize,
          height: cellSize,
          borderRadius: 6,
          backgroundColor: '#ffaa32',
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
          transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
        }} />
        {/* Celda principal */}
        <View style={{
          width: cellSize, height: cellSize, borderRadius: 4,
          backgroundColor: '#ffaa32',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize, color: '#000', lineHeight: cellSize }}>
            {dayNum}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
  onDayPress,
  eventos,
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
  onDayPress: (dateStr: string) => void
  eventos: CalendarEventData[]
  containerW: number
  styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  const { t, ta } = useTranslation()

  const MESES_I18N = ta('stats_months')
  const DAY_LABELS_I18N = ['L','M','X','J','V','S','D']

  const INTENSITY_BG = [
    colors.borderDefault,
    colors.accent + '2e',
    colors.accent + '66',
    colors.accent + 'a6',
    colors.accent,
  ]

  const today    = new Date()
  const maxFuture = new Date(today.getFullYear(), today.getMonth() + 3)  // up to 3 months ahead
  const canPrev  = mesActual.year > regYear || (mesActual.year === regYear && mesActual.month > regMonth)
  const canNext  = mesActual.year < maxFuture.getFullYear() ||
                   (mesActual.year === maxFuture.getFullYear() && mesActual.month <= maxFuture.getMonth())

  const GAP      = 4
  const cellSize = Math.floor((containerW - GAP * 6) / 7)

  // Build event lookup: fecha → first event tipo (for dot color)
  const eventMap = new Map<string, CalendarEventData['tipo']>()
  for (const ev of eventos) {
    if (!eventMap.has(ev.fecha)) eventMap.set(ev.fecha, ev.tipo)
  }

  return (
    <>
      <View style={styles.consistHeaderRow}>
        <Text style={styles.blockLabel}>{t('stats_consistency_title').toUpperCase()}</Text>

        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={canPrev ? onPrev : undefined}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={canPrev ? 0.7 : 1}
          >
            <Text style={[styles.navArrow, !canPrev && styles.navArrowDisabled]}>←</Text>
          </TouchableOpacity>

          <Text style={styles.navMonth}>
            {MESES_I18N[mesActual.month - 1]} {mesActual.year}
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
              {DAY_LABELS_I18N.map(d => (
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
                      return <View key={ci} style={{ width: cellSize, height: cellSize + 8 }} />
                    }
                    const eventTipo = eventMap.get(cell.fecha)
                    const dayNum    = Number(cell.fecha.split('-')[2])
                    const fontSize  = Math.max(7, Math.floor(cellSize * 0.38))

                    // Color del número según fondo
                    const numColor = eventTipo
                      ? (eventTipo === 'descanso' ? '#fff' : '#000')
                      : cell.es_descanso
                        ? colors.inkFaint
                        : cell.intensidad >= 3 ? '#ffffff' : colors.inkMuted

                    // Estilo del recuadro
                    const cellStyle: object = eventTipo
                      ? {
                          width: cellSize, height: cellSize, borderRadius: 4,
                          backgroundColor: EVENT_COLORS[eventTipo],
                          alignItems: 'center', justifyContent: 'center',
                        }
                      : cell.es_descanso
                        ? {
                            width: cellSize, height: cellSize, borderRadius: 3,
                            borderWidth: 1, borderStyle: 'dashed',
                            borderColor: 'rgba(255,170,50,0.55)',
                            alignItems: 'center', justifyContent: 'center',
                          }
                        : {
                            width: cellSize, height: cellSize, borderRadius: 3,
                            backgroundColor: INTENSITY_BG[cell.intensidad] ?? INTENSITY_BG[0],
                            alignItems: 'center', justifyContent: 'center',
                          }

                    // Competición: celda con brillo en loop
                    if (eventTipo === 'competicion') {
                      return (
                        <CompetitionCell
                          key={ci}
                          cellSize={cellSize}
                          dayNum={dayNum}
                          onPress={() => onDayPress(cell.fecha)}
                        />
                      )
                    }

                    return (
                      <TouchableOpacity
                        key={ci}
                        onPress={() => onDayPress(cell.fecha)}
                        activeOpacity={0.7}
                        style={{ width: cellSize, height: cellSize + 8, alignItems: 'center' }}
                      >
                        <View style={cellStyle}>
                          <Text style={{
                            fontFamily: 'JetBrainsMono-Regular',
                            fontSize, color: numColor, lineHeight: cellSize,
                          }}>
                            {dayNum}
                          </Text>
                        </View>
                      </TouchableOpacity>
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
  const { t, ta }  = useTranslation()
  const styles     = React.useMemo(() => makeStyles(colors), [colors])
  const insets     = useSafeAreaInsets()
  const { width: screenW } = useWindowDimensions()

  const cardInnerW = screenW - 20 * 2 - 16 * 2  // screen pad + card pad

  // Event labels using translations
  const EVENT_LABELS: Record<CalendarEventData['tipo'], string> = {
    competicion: '🏆 Competición',
    descanso:    '😴 Descanso',
    otro:        '📌 Otro',
  }

  // ── Block 0 state (Radar) ─────────────────────────────────────────────────
  const [radarMetrics,   setRadarMetrics]   = useState<RadarMetric[] | null>(null)
  const [radarEnoughData, setRadarEnoughData] = useState(true)

  // ── Block 1 state ─────────────────────────────────────────────────────────
  const [filtro,       setFiltro]       = useState<Filtro>('todo')
  const [rpeData,      setRpeData]      = useState<RPEData | null>(null)
  const [rpeChartBusy, setRpeChartBusy] = useState(false)

  // ── Block 3 state ─────────────────────────────────────────────────────────
  const [cuerpoData, setCuerpoData] = useState<CuerpoData | null>(null)

  // ── Block 4 state ─────────────────────────────────────────────────────────
  const [ejerciciosData, setEjerciciosData] = useState<EjercicioTop[] | null>(null)

  // ── Block 2 state ─────────────────────────────────────────────────────────
  const now = new Date()
  const [mesActual,      setMesActual]      = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [consistData,    setConsistData]    = useState<ConsistData | null>(null)
  const [consistLoading, setConsistLoading] = useState(false)
  const [regDate, setRegDate] = useState({ year: 2000, month: 1 })

  // ── Events state ───────────────────────────────────────────────────────────
  const [eventos,        setEventos]        = useState<CalendarEventData[]>([])
  const [selectedDay,    setSelectedDay]    = useState<string | null>(null)
  const [newEventTitulo, setNewEventTitulo] = useState('')
  const [newEventTipo,   setNewEventTipo]   = useState<CalendarEventData['tipo']>('otro')
  const [savingEvent,    setSavingEvent]    = useState(false)

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true)
  const [error,          setError]          = useState<string | null>(null)

  // #9: tokens para descartar respuestas fuera de orden (mes/filtro cambian rápido)
  const rpeReqRef     = useRef(0)
  const consistReqRef = useRef(0)
  const eventosReqRef = useRef(0)
  // #8: refs espejo para refrescar al enfocar sin stale closure
  const filtroRef     = useRef(filtro);    filtroRef.current = filtro
  const mesRef        = useRef(mesActual); mesRef.current = mesActual
  const firstFocusRef = useRef(true)

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchRadar = useCallback(async (isInitial = false) => {
    try {
      const res = await apiGet('/api/stats/radar/')
      setRadarEnoughData(res.enough_data)
      if (res.enough_data) setRadarMetrics(res.metrics)
    } catch (e: any) {
      if (isInitial) setError(e.message ?? 'Error cargando estadísticas')
    }
  }, [])

  const fetchRPE = useCallback(async (f: Filtro, isInitial = false) => {
    const reqId = ++rpeReqRef.current
    if (!isInitial) setRpeChartBusy(true)
    try {
      const res: RPEData = await apiGet(`/api/stats/rpe-semanal/?filtro=${f}`)
      if (reqId !== rpeReqRef.current) return   // respuesta obsoleta (filtro cambió)
      setRpeData(res)
      setRegDate({ year: res.fecha_registro_year, month: res.fecha_registro_month })
    } catch (e: any) {
      if (reqId === rpeReqRef.current && isInitial) setError(e.message ?? 'Error cargando estadísticas')
    } finally {
      if (reqId === rpeReqRef.current) setRpeChartBusy(false)
    }
  }, [])

  const fetchEjercicios = useCallback(async (isInitial = false) => {
    try {
      const res: EjercicioTop[] = await apiGet('/api/stats/ejercicios-top/')
      setEjerciciosData(res)
    } catch (e: any) {
      if (isInitial) setError(e.message ?? 'Error cargando estadísticas')
    }
  }, [])

  const fetchCuerpo = useCallback(async (isInitial = false) => {
    try {
      const res: CuerpoData = await apiGet('/api/stats/cuerpo-contexto/')
      setCuerpoData(res)
    } catch (e: any) {
      if (isInitial) setError(e.message ?? 'Error cargando estadísticas')
    }
  }, [])

  const fetchConsist = useCallback(async (year: number, month: number, isInitial = false) => {
    const reqId = ++consistReqRef.current
    if (!isInitial) setConsistLoading(true)
    try {
      const res: ConsistData = await apiGet(`/api/stats/consistencia-mensual/?year=${year}&month=${month}`)
      if (reqId !== consistReqRef.current) return   // respuesta obsoleta (cambió de mes)
      setConsistData(res)
      setRegDate({ year: res.fecha_registro_year, month: res.fecha_registro_month })
    } catch (e: any) {
      if (reqId === consistReqRef.current && isInitial) setError(e.message ?? 'Error cargando estadísticas')
    } finally {
      if (reqId === consistReqRef.current) setConsistLoading(false)
    }
  }, [])

  const fetchEventos = useCallback(async (year: number, month: number) => {
    const reqId = ++eventosReqRef.current
    try {
      const res: CalendarEventData[] = await apiGet(`/api/eventos/?year=${year}&month=${month}`)
      if (reqId !== eventosReqRef.current) return   // respuesta obsoleta (cambió de mes)
      setEventos(res)
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    const { year, month } = mesActual
    Promise.all([
      fetchRadar(true),
      fetchRPE('todo', true),
      fetchConsist(year, month, true),
      fetchCuerpo(true),
      fetchEjercicios(true),
      fetchEventos(year, month),
    ]).finally(() => setInitialLoading(false))
  }, []) // eslint-disable-line

  // #8: refrescar al volver al tab (los datos cambian tras entrenar/crear evento).
  // El primer foco lo cubre el useEffect de arriba; del segundo en adelante,
  // refresco silencioso (isInitial=false → no toma la pantalla de error).
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) { firstFocusRef.current = false; return }
      const { year, month } = mesRef.current
      fetchRadar()
      fetchRPE(filtroRef.current)
      fetchConsist(year, month)
      fetchCuerpo()
      fetchEjercicios()
      fetchEventos(year, month)
    }, [fetchRadar, fetchRPE, fetchConsist, fetchCuerpo, fetchEjercicios, fetchEventos]),
  )

  // ── Month navigation ───────────────────────────────────────────────────────
  function goPrev() {
    const m = mesActual.month === 1
      ? { year: mesActual.year - 1, month: 12 }
      : { year: mesActual.year, month: mesActual.month - 1 }
    setMesActual(m)
    fetchConsist(m.year, m.month)
    fetchEventos(m.year, m.month)
  }

  function goNext() {
    const m = mesActual.month === 12
      ? { year: mesActual.year + 1, month: 1 }
      : { year: mesActual.year, month: mesActual.month + 1 }
    setMesActual(m)
    fetchConsist(m.year, m.month)
    fetchEventos(m.year, m.month)
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  function openDayModal(dateStr: string) {
    setSelectedDay(dateStr)
    setNewEventTitulo('')
    setNewEventTipo('otro')
  }

  function closeDayModal() {
    setSelectedDay(null)
    setNewEventTitulo('')
    setNewEventTipo('otro')
  }

  async function handleAddEvent() {
    if (!selectedDay || !newEventTitulo.trim()) return
    setSavingEvent(true)
    try {
      const ev: CalendarEventData = await apiPost('/api/eventos/', {
        fecha:  selectedDay,
        titulo: newEventTitulo.trim(),
        tipo:   newEventTipo,
      })
      setEventos(prev => [...prev, ev])
      setNewEventTitulo('')
      setNewEventTipo('otro')
    } catch (e: any) {
      // Antes fallaba en silencio → el usuario creía que se guardó. Ahora avisamos.
      Alert.alert('No se pudo guardar', e?.message ?? 'Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setSavingEvent(false)
    }
  }

  async function handleDeleteEvent(id: number) {
    try {
      await apiDelete(`/api/eventos/${id}/`)
      setEventos(prev => prev.filter(e => e.id !== id))
    } catch (e: any) {
      Alert.alert('No se pudo eliminar', e?.message ?? 'Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null)
              setInitialLoading(true)
              Promise.all([
                fetchRadar(true),
                fetchRPE(filtro, true),
                fetchConsist(mesActual.year, mesActual.month, true),
                fetchCuerpo(true),
                fetchEjercicios(true),
                fetchEventos(mesActual.year, mesActual.month),
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

  const dias              = rpeData?.dias ?? []
  const semanasEntrenando = rpeData?.semanas_entrenando ?? 0
  const hasEnoughData     = dias.length >= 2
  const trend             = trendText(dias)

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* ── Sticky Header ── */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.sectionLabel}>{t('stats_header')}</Text>
        <Text style={styles.pageTitle}>
          {semanasEntrenando}{' '}
          {semanasEntrenando === 1 ? 'semana' : 'semanas'} entrenando.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Bloque 0: Tu perfil atlético (Radar) ── */}
        {radarEnoughData && radarMetrics
          ? <RadarBlock metrics={radarMetrics} />
          : <RadarBlockEmpty />
        }

        {/* ── Bloque 1: Progreso del rendimiento ── */}
        <Text style={styles.blockLabel}>{t('stats_rpe_title').toUpperCase()}</Text>

        <View style={styles.card}>
          {/* Subtítulo de escala */}
          <Text style={[styles.cardMiniTitle, { marginBottom: 4 }]}>{t('stats_rpe_subtitle')}</Text>
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
                    ? t('stats_no_data_sub')
                    : t('stats_no_data')}
                </Text>
              </View>
            ) : (
              <RPELineChart
                dias={dias}
                containerW={cardInnerW}
                accent={colors.accent}
                grid={colors.borderDefault}
                label={colors.inkMuted}
                bg={colors.bg}
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
          onDayPress={openDayModal}
          eventos={eventos}
          containerW={cardInnerW}
          styles={styles}
        />

        {/* ── Bloque 3: Cuerpo y contexto ── */}
        <Text style={styles.blockLabel}>{t('stats_body_title').toUpperCase()}</Text>
        <View style={styles.card}>
          {!cuerpoData ? (
            <View style={[styles.chartCenter, { height: 80 }]}>
              <Text style={styles.emptyText}>{t('stats_loading')}</Text>
            </View>
          ) : (
            <>
              {/* Sección A: Estado físico + mental en grid 2 columnas */}
              <View style={styles.estadoGrid}>
                <EstadoMiniCard
                  title={t('stats_physical')}
                  dias={cuerpoData.dias_fisico}
                  color={colors.green}
                  containerW={(cardInnerW - 8) / 2}
                  label={colors.inkMuted}
                />
                <EstadoMiniCard
                  title={t('stats_mental')}
                  dias={cuerpoData.dias_mental}
                  color={colors.cyan}
                  containerW={(cardInnerW - 8) / 2}
                  label={colors.inkMuted}
                />
              </View>

              {/* Sección B: Intención de entrenamiento (solo si >= 5 checkins) */}
              {cuerpoData.total_checkins >= 5 && (
                <>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.cardMiniTitle}>{t('stats_intention_title')}</Text>
                  <DonutChart
                    counts={cuerpoData.intencion_counts}
                    containerW={cardInnerW}
                    ringBg={colors.borderDefault}
                    centerBg={colors.bg}
                    legendLabel={colors.inkSecondary}
                  />
                </>
              )}
            </>
          )}
        </View>

        {/* ── Bloque 4: Tus ejercicios más entrenados ── */}
        <Text style={styles.blockLabel}>{t('stats_top_ex_title').toUpperCase()}</Text>
        <View style={styles.card}>
          <EjercicioTopList
            ejercicios={ejerciciosData ?? []}
            styles={styles}
            colors={colors}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Event Modal ── */}
      <Modal
        visible={selectedDay !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDayModal}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeDayModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalKAV}
              >
                <View style={styles.modalCard}>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalEyebrow}>{t('stats_events_title')}</Text>
                      <Text style={styles.modalDate}>
                        {selectedDay ? formatModalDate(selectedDay, ta('stats_months')) : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={closeDayModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Existing events */}
                  {(() => {
                    const dayEvs = eventos.filter(e => e.fecha === selectedDay)
                    if (dayEvs.length === 0) return null
                    return (
                      <View style={styles.modalEventsList}>
                        {dayEvs.map(ev => (
                          <View key={ev.id} style={styles.modalEventRow}>
                            <View style={[styles.modalEventDot, { backgroundColor: EVENT_COLORS[ev.tipo] }]} />
                            <View style={styles.modalEventInfo}>
                              <Text style={styles.modalEventTitle} numberOfLines={1}>{ev.titulo}</Text>
                              <Text style={[styles.modalEventTipo, { color: EVENT_COLORS[ev.tipo] }]}>
                                {EVENT_LABELS[ev.tipo]}
                              </Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteEvent(ev.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Text style={styles.modalEventDelete}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                        <View style={styles.modalDivider} />
                      </View>
                    )
                  })()}

                  {/* Add new event */}
                  <Text style={styles.modalAddLabel}>{t('stats_add_event')}</Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('stats_event_note_placeholder')}
                    placeholderTextColor={colors.inkFaint}
                    value={newEventTitulo}
                    onChangeText={setNewEventTitulo}
                    maxLength={80}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  {/* Type selector */}
                  <View style={styles.modalTipoRow}>
                    {(['competicion', 'descanso', 'otro'] as const).map(tipo => {
                      const on = newEventTipo === tipo
                      return (
                        <TouchableOpacity
                          key={tipo}
                          onPress={() => setNewEventTipo(tipo)}
                          style={[
                            styles.modalTipoChip,
                            on && { backgroundColor: EVENT_COLORS[tipo] + '22', borderColor: EVENT_COLORS[tipo] },
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.modalTipoText, on && { color: EVENT_COLORS[tipo] }]}>
                            {EVENT_LABELS[tipo]}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Save button */}
                  <TouchableOpacity
                    onPress={handleAddEvent}
                    disabled={!newEventTitulo.trim() || savingEvent}
                    style={[styles.modalSaveBtn, (!newEventTitulo.trim() || savingEvent) && { opacity: 0.4 }]}
                    activeOpacity={0.82}
                  >
                    {savingEvent
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.modalSaveBtnText}>{t('stats_event_btn_save')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}

function formatModalDate(dateStr: string, monthNames: string[]): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return `${weekdays[d.getDay()]} ${day} de ${monthNames[month - 1]}, ${year}`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root:     { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
    scroll:   { flex: 1 },
    content:  { paddingHorizontal: 20, paddingTop: 16 },

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

    // Sticky header
    stickyHeader: {
      paddingHorizontal: 20,
      paddingBottom: 4,
      zIndex: 10,
    },

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
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: c.inkPrimary,
      letterSpacing: -0.4, textTransform: 'uppercase', marginBottom: 12,
    },

    // Card
    card: {
      backgroundColor: c.cardBg, borderWidth: 1,
      borderColor: c.borderDefault, borderRadius: 20,
      padding: 16, marginBottom: 20,
    },

    // Bloque 3 layout
    estadoGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: c.borderDefault,
      marginVertical: 16,
    },

    // Card mini title
    cardMiniTitle: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: c.inkMuted,
      marginBottom: 14, letterSpacing: 0.1,
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

    // Exercise top list
    exRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
    exDivider:     { height: 1, backgroundColor: c.borderDefault },
    exPos:         { fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color: c.inkFaint, width: 28, textAlign: 'center', letterSpacing: -0.5 },
    exCenter:      { flex: 1, gap: 3 },
    exNombre:      { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13, color: c.inkPrimary, letterSpacing: -0.2 },
    exMeta:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.3 },
    exRight:       { alignItems: 'flex-end', gap: 3, minWidth: 64 },
    exRpe:         { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 18, color: c.inkPrimary, letterSpacing: -0.4 },
    exVar:         { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 0.2 },
    exVarPrimeras: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkFaint, letterSpacing: 0.2 },

    // Event modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    modalKAV: { width: '100%' },
    modalCard: {
      backgroundColor: '#0d1117',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      borderWidth: 1, borderColor: c.borderBright,
      padding: 24, paddingBottom: 36,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 20,
    },
    modalEyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.inkMuted, letterSpacing: 2.5, textTransform: 'uppercase',
      marginBottom: 4,
    },
    modalDate: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15,
      color: c.inkPrimary, letterSpacing: -0.3,
    },
    modalClose: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 16,
      color: c.inkMuted, paddingTop: 4,
    },
    modalEventsList: { marginBottom: 16 },
    modalEventRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: 10, paddingVertical: 8,
    },
    modalEventDot: { width: 8, height: 8, borderRadius: 4 },
    modalEventInfo: { flex: 1 },
    modalEventTitle: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 13,
      color: c.inkPrimary, letterSpacing: -0.2,
    },
    modalEventTipo: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      letterSpacing: 0.5, marginTop: 2,
    },
    modalEventDelete: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 13,
      color: c.inkFaint,
    },
    modalDivider: { height: 1, backgroundColor: c.borderDefault, marginTop: 8, marginBottom: 4 },
    modalAddLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.inkMuted, letterSpacing: 2, textTransform: 'uppercase',
      marginBottom: 10,
    },
    modalInput: {
      backgroundColor: c.glassBg,
      borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkPrimary, marginBottom: 12,
    },
    modalTipoRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    modalTipoChip: {
      flex: 1, paddingVertical: 8, alignItems: 'center',
      borderRadius: 10, borderWidth: 1, borderColor: c.borderDefault,
    },
    modalTipoText: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 10,
      color: c.inkMuted, letterSpacing: 0.1,
    },
    modalSaveBtn: {
      backgroundColor: c.accent, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center',
    },
    modalSaveBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14,
      color: '#ffffff', letterSpacing: -0.2,
    },
  })
}
