import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
} from 'react-native'
import Svg, { G, Polygon, Line, Circle, Text as SvgText } from 'react-native-svg'
import { scaleLinear } from '@visx/scale'
import { useTheme } from '../lib/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RadarMetric = {
  key: string
  label: string
  value: number
  prev: number
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const NUM = 6
const STEP = (Math.PI * 2) / NUM
const LEVELS = 5

function genPoints(radius: number): { x: number; y: number }[] {
  return Array.from({ length: NUM }, (_, i) => ({
    x: radius * Math.sin(i * STEP),
    y: -radius * Math.cos(i * STEP),
  }))
}

function genPolygonString(
  data: RadarMetric[],
  yScale: (v: number) => number,
  getValue: (d: RadarMetric) => number,
): string {
  return data
    .map((d, i) => {
      const r = yScale(getValue(d))
      return `${(r * Math.sin(i * STEP)).toFixed(2)},${(-r * Math.cos(i * STEP)).toFixed(2)}`
    })
    .join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RadarBlock({ metrics }: { metrics: RadarMetric[] }) {
  const { colors } = useTheme()
  const { width: screenW } = useWindowDimensions()
  const [showPrev, setShowPrev] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)

  const PAD_H = 72
  const PAD_V = 56
  const svgW = screenW - 20 * 2 - 16 * 2
  const svgH = svgW
  const radius = (svgW - PAD_H * 2) / 2
  const cx = svgW / 2
  const cy = svgH / 2

  const yScale = useMemo(
    () => scaleLinear({ range: [0, radius], domain: [0, 100] }),
    [radius],
  )

  const gridPolygons = useMemo(() => {
    return Array.from({ length: LEVELS }, (_, i) => {
      const r = ((i + 1) * radius) / LEVELS
      const pts = Array.from({ length: NUM }, (_, j) => ({
        x: r * Math.sin(j * STEP),
        y: -r * Math.cos(j * STEP),
      }))
      return pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    })
  }, [radius])

  const axisPoints = useMemo(() => genPoints(radius), [radius])
  const labelPoints = useMemo(() => genPoints(radius + 22), [radius])
  const dataPoints  = useMemo(() => genPoints(1), [])  // dummy — actual computed below

  const currPolygon = useMemo(
    () => genPolygonString(metrics, yScale, d => d.value),
    [metrics, yScale],
  )
  const prevPolygon = useMemo(
    () => genPolygonString(metrics, yScale, d => d.prev),
    [metrics, yScale],
  )

  const currPoints = useMemo(() =>
    metrics.map((d, i) => {
      const r = yScale(d.value)
      return { x: r * Math.sin(i * STEP), y: -r * Math.cos(i * STEP) }
    }),
    [metrics, yScale],
  )

  const styles = makeStyles(colors)

  return (
    <View>
      <Text style={styles.blockLabel}>TU PERFIL ATLÉTICO</Text>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.title}>Forma de entrenamiento</Text>
            <Text style={styles.subtitle}>6 dimensiones · Últimas 4 semanas</Text>
          </View>
          <TouchableOpacity
            style={[styles.prevBtn, showPrev && styles.prevBtnActive]}
            onPress={() => setShowPrev(v => !v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.prevBtnText, showPrev && { color: colors.accent }]}>
              {showPrev ? 'Ocultar anterior' : 'Ver anterior'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SVG Radar */}
        <Svg width={svgW} height={svgH}>
          <G transform={`translate(${cx},${cy})`}>
            {/* Grid polygons */}
            {gridPolygons.map((pts, i) => (
              <Polygon
                key={i}
                points={pts}
                fill="none"
                stroke={colors.borderDefault}
                strokeWidth={i === LEVELS - 1 ? 1 : 0.5}
              />
            ))}

            {/* Axis lines */}
            {axisPoints.map((pt, i) => (
              <Line
                key={i}
                x1={0} y1={0}
                x2={pt.x} y2={pt.y}
                stroke={colors.borderDefault}
                strokeWidth={0.75}
              />
            ))}

            {/* Previous polygon */}
            {showPrev && (
              <Polygon
                points={prevPolygon}
                fill={`${colors.accent}18`}
                stroke={`${colors.accent}55`}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            )}

            {/* Current polygon */}
            <Polygon
              points={currPolygon}
              fill={`${colors.accent}22`}
              stroke={colors.accent}
              strokeWidth={1.5}
            />

            {/* Data points con brillo */}
            {currPoints.map((pt, i) => (
              <G key={i} onPress={() => setHovered(hovered === i ? null : i)}>
                {/* Halo exterior */}
                <Circle cx={pt.x} cy={pt.y} r={hovered === i ? 16 : 12} fill={`${colors.accent}14`} />
                {/* Halo medio */}
                <Circle cx={pt.x} cy={pt.y} r={hovered === i ? 10 : 7}  fill={`${colors.accent}2e`} />
                {/* Punto sólido */}
                <Circle cx={pt.x} cy={pt.y} r={hovered === i ? 5.5 : 4} fill={colors.accent} />
              </G>
            ))}

            {/* Value tooltip on hover */}
            {hovered !== null && (() => {
              const pt = currPoints[hovered]
              const m  = metrics[hovered]
              const delta = m.value - m.prev
              const sign  = delta >= 0 ? '+' : ''
              return (
                <SvgText
                  x={pt.x}
                  y={pt.y - 12}
                  fontSize={9}
                  fontFamily="JetBrainsMono-Medium"
                  fill={delta >= 0 ? colors.accent : colors.orange}
                  textAnchor="middle"
                >
                  {m.value} ({sign}{Math.round(delta)})
                </SvgText>
              )
            })()}

            {/* Axis labels */}
            {labelPoints.map((pt, i) => {
              const isHovered = hovered === i
              const anchor =
                Math.abs(pt.x) < 10 ? 'middle' : pt.x > 0 ? 'start' : 'end'
              return (
                <SvgText
                  key={i}
                  x={pt.x}
                  y={pt.y + 4}
                  fontSize={9}
                  fontFamily={isHovered ? 'JetBrainsMono-Medium' : 'JetBrainsMono-Regular'}
                  fontWeight={isHovered ? '600' : '400'}
                  fill={isHovered ? colors.inkPrimary : colors.inkMuted}
                  textAnchor={anchor}
                >
                  {metrics[i].label.toUpperCase()}
                </SvgText>
              )
            })}
          </G>
        </Svg>

        {/* Metric cards grid */}
        <View style={styles.grid}>
          {metrics.map((m, i) => {
            const delta    = m.value - m.prev
            const sign     = delta >= 0 ? '+' : ''
            const isActive = hovered === i
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.metricCard, isActive && styles.metricCardActive]}
                onPress={() => setHovered(isActive ? null : i)}
                activeOpacity={0.75}
              >
                <View style={styles.metricCardTop}>
                  <Text style={styles.metricCardLabel}>{m.label.toUpperCase()}</Text>
                  <Text style={[
                    styles.metricCardDelta,
                    { color: delta >= 0 ? colors.accent : colors.orange },
                  ]}>
                    {sign}{Math.round(delta)}
                  </Text>
                </View>
                <View style={styles.metricCardBottom}>
                  <Text style={styles.metricCardValue}>{m.value}</Text>
                  <Text style={styles.metricCardUnit}> / 100</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${m.value}%`, backgroundColor: colors.accent }]} />
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

      </View>
    </View>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function RadarBlockEmpty() {
  const { colors } = useTheme()
  const styles = makeStyles(colors)
  return (
    <View>
      <Text style={styles.blockLabel}>TU PERFIL ATLÉTICO</Text>
      <View style={[styles.card, styles.emptyCard]}>
        <Text style={styles.emptyText}>
          Completa al menos 7 sesiones para ver tu perfil atlético.
        </Text>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    blockLabel: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.inkPrimary,
      letterSpacing: -0.4,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    card: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 16,
      marginBottom: 20,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      color: c.inkPrimary,
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    subtitle: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    metricCard: {
      width: '47.5%',
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 12,
      padding: 10,
      gap: 4,
    },
    metricCardActive: {
      borderColor: c.accent,
      backgroundColor: `${c.accent}12`,
    },
    metricCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metricCardLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 8,
      color: c.inkMuted,
      letterSpacing: 0.8,
    },
    metricCardDelta: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 10,
    },
    metricCardBottom: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    metricCardValue: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      color: c.inkPrimary,
      letterSpacing: -0.6,
    },
    metricCardUnit: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      marginLeft: 2,
    },
    progressBg: {
      height: 3,
      backgroundColor: c.borderDefault,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
    },
    prevBtn: {
      alignSelf: 'flex-end',
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    prevBtnActive: {
      borderColor: c.accent,
      backgroundColor: `${c.accent}12`,
    },
    prevBtnText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.inkMuted,
      letterSpacing: 0.8,
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 16,
    },
  })
}
