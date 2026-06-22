import React, { forwardRef, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import Svg, { Defs, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg'
// NOTA: `react-native-view-shot` y `expo-sharing` se cargan de forma diferida
// (dynamic import dentro de handleShare) a propósito. `react-native-view-shot`
// llama a TurboModuleRegistry.getEnforcing('RNViewShot') en el top-level de su
// módulo, lo que LANZA si el módulo nativo no está compilado en el dev build.
// Importarlos arriba haría fallar la EVALUACIÓN de este archivo y, en cascada,
// la carga de cualquier ruta que lo importe (expo-router descartaría la ruta).
// Cargándolos solo al compartir, el componente se importa sin riesgo y el fallo
// (si el binario nativo aún no los incluye) queda contenido en esa acción.

// ─────────────────────────────────────────────────────────────────────────────
// WorkoutShareCard
//
// Tarjeta visual 9:16 (360 × 640) que se rasteriza a PNG para compartir en redes.
// Tiene dos variantes de CONTENIDO — 'running' y 'gym' — y, sobre cada una, un
// CARRUSEL de variantes de COLOR (misma información, distinto acento). En esta
// primera iteración los colores son: el de la variante (verde en running) + azul
// cielo + rosado. El usuario desliza para elegir el color y comparte el visible.
//
// Las tres variantes se alimentan con datos reales vía props: 'running' (título,
// métricas, ruta), 'gym' (lista de ejercicios + métricas) y 'descanso' (frase).
// Cualquier prop de datos omitida cae al placeholder correspondiente.
//
// El área capturada es ÚNICAMENTE la tarjeta visible (su cardRef). El botón
// "COMPARTIR RUTINA" y los puntos del carrusel viven fuera de ese View, por lo
// que nunca aparecen en la imagen final.
// ─────────────────────────────────────────────────────────────────────────────

export type WorkoutSessionType = 'running' | 'gym' | 'descanso'

export interface ShareCardMetric {
  label: string
  value: string
}

export interface ShareCardRouteCoord {
  latitude: number
  longitude: number
}

export interface ShareCardExercise {
  nombre: string
  series: number | string
  repeticiones: string
}

export interface WorkoutShareCardProps {
  /** Determina la variante visual de la tarjeta. */
  sessionType: WorkoutSessionType
  /** Número/dato protagonista (p. ej. la distancia "5.20 km"). */
  title?: string
  /** Métricas a mostrar; si se omite, usa los placeholders de la variante. */
  metrics?: ShareCardMetric[]
  /** Traza GPS para dibujar la ruta (running). >= 2 puntos para renderizar. */
  routeCoords?: ShareCardRouteCoord[]
  /** Lista de ejercicios realizados (gym). Se muestran hasta 6. */
  exercises?: ShareCardExercise[]
  /** Frase protagonista (variante 'descanso'); ocupa el área central de la tarjeta. */
  phrase?: string
  /** Fecha formateada para el footer (p. ej. "07 JUN 2026"). */
  dateLabel?: string
  /** Handle del usuario para el footer (p. ej. "@sebastian"). */
  userLabel?: string
  /** Zyfit Score; si se omite, la fila no se renderiza. */
  score?: string | number
}

// ─── Dimensiones fijas (ratio 9:16) ─────────────────────────────────────────
const CARD_W = 360
const CARD_H = 640

// ─── Paleta fija de la tarjeta (independiente del tema de la app) ────────────
// Una tarjeta para compartir debe verse idéntica sin importar el tema activo.
const CARD = {
  bg: '#0d0d0d',
  white: '#ffffff',
  green: '#1DDE82',
  purple: '#6366F1',
  violet: '#A78BFA',
  inkSecondary: 'rgba(255,255,255,0.6)',
  inkMuted: 'rgba(255,255,255,0.4)',
  inkFaint: 'rgba(255,255,255,0.25)',
  placeholderBg: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
}

// ─── Opciones de color del carrusel ──────────────────────────────────────────
// `accent` pinta todo lo coloreado de la tarjeta (glow, kicker, ruta, score,
// punto del logo y botón). `btnText` es el color de texto legible sobre el botón.
interface ColorOption {
  key: string
  accent: string
  btnText: string
}
// Los 2 colores NUEVOS de esta iteración (el primero del carrusel es el de la
// variante: verde en running). Se anteponen en `buildColorOptions`.
const EXTRA_COLORS: ColorOption[] = [
  { key: 'sky',  accent: '#5AC8FA', btnText: '#05293B' }, // azul cielo
  { key: 'pink', accent: '#FF73B3', btnText: '#3A0A20' }, // rosado
]

// ─── Configuración por variante ──────────────────────────────────────────────
interface VariantConfig {
  accent: string
  glowCorner: 'left' | 'right'
  kicker: string
  /** Color de texto legible sobre el botón con fondo `accent`. */
  btnText: string
  /** Etiqueta del bloque visual grande (ruta de carrera o lista de ejercicios). */
  placeholderLabel: string
  /** Métricas mostradas (tiempo, ritmo, series, etc.). */
  metrics: { label: string; value: string }[]
  /** Texto del botón de compartir (fuera de la captura). */
  shareLabel: string
}

const VARIANTS: Record<WorkoutSessionType, VariantConfig> = {
  running: {
    accent: CARD.green,
    glowCorner: 'left',
    kicker: 'CARRERA',
    btnText: '#06281A',
    placeholderLabel: '[ruta]',
    shareLabel: 'COMPARTIR RUTINA',
    metrics: [
      { label: 'TIEMPO', value: '--' },
      { label: 'RITMO', value: '--' },
      { label: 'DISTANCIA', value: '--' },
    ],
  },
  gym: {
    accent: CARD.purple,
    glowCorner: 'right',
    kicker: 'FUERZA',
    btnText: '#ffffff',
    placeholderLabel: '[ejercicios]',
    shareLabel: 'COMPARTIR RUTINA',
    metrics: [
      { label: 'EJERCICIOS', value: '--' },
      { label: 'SERIES', value: '--' },
      { label: 'VOLUMEN', value: '--' },
    ],
  },
  // Día de descanso: sin métricas ni bloque de ruta/ejercicios. El protagonista es
  // la frase (prop `phrase`), que ocupa el área central. Acento violeta calmo.
  descanso: {
    accent: CARD.violet,
    glowCorner: 'right',
    kicker: 'DÍA DE DESCANSO',
    btnText: '#1b1340',
    placeholderLabel: '',
    shareLabel: 'COMPARTIR',
    metrics: [],
  },
}

// ─── Glow de esquina (RadialGradient SVG) ────────────────────────────────────
function CornerGlow({ color, corner }: { color: string; corner: 'left' | 'right' }) {
  const cx = corner === 'left' ? '0%' : '100%'
  // El id del gradiente incluye el color para que cada tarjeta del carrusel use
  // su propio gradiente (ids duplicados en SVG comparten definición).
  const gid = `cornerGlow-${color.replace('#', '')}`
  return (
    <Svg style={StyleSheet.absoluteFill} width={CARD_W} height={CARD_H} pointerEvents="none">
      <Defs>
        <RadialGradient id={gid} cx={cx} cy="0%" rx="80%" ry="55%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.38} />
          <Stop offset="50%" stopColor={color} stopOpacity={0.1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill={`url(#${gid})`} />
    </Svg>
  )
}

// ─── Ruta (polilínea SVG normalizada al área disponible) ─────────────────────
// Se dibuja con react-native-svg (NO con react-native-maps) porque el SVG se
// rasteriza de forma fiable en la captura a PNG. Mide su contenedor con onLayout
// y proyecta lat/lng preservando proporción (corrección de longitud por cos lat).
function RoutePath({ coords, color }: { coords: ShareCardRouteCoord[]; color: string }) {
  const [size, setSize] = useState({ w: 0, h: 0 })

  let points = ''
  if (size.w > 0 && size.h > 0 && coords.length > 1) {
    const pad = 18
    const w = size.w - pad * 2
    const h = size.h - pad * 2
    const lats = coords.map(c => c.latitude)
    const lngs = coords.map(c => c.longitude)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const midLat = (minLat + maxLat) / 2
    const kx = Math.cos((midLat * Math.PI) / 180) || 1   // metros por grado de lng ≈ cos(lat)
    const spanX = Math.max((maxLng - minLng) * kx, 1e-9)
    const spanY = Math.max(maxLat - minLat, 1e-9)
    const scale = Math.min(w / spanX, h / spanY)
    const offX = pad + (w - spanX * scale) / 2
    const offY = pad + (h - spanY * scale) / 2
    points = coords
      .map(c => {
        const x = offX + (c.longitude - minLng) * kx * scale
        const y = offY + (maxLat - c.latitude) * scale   // y invertido (norte arriba)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {points !== '' && (
        <Svg width={size.w} height={size.h}>
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      )}
    </View>
  )
}

// ─── Cara capturable de la tarjeta (una por color del carrusel) ──────────────
// Es el View que se rasteriza a PNG. El `ref` apunta a este View (lo usa
// captureRef). Recibe el `accent` del color elegido; el resto de props es la
// MISMA información para todas las caras del carrusel.
interface ShareCardFaceProps {
  accent: string
  kicker: string
  glowCorner: 'left' | 'right'
  title?: string
  metrics: ShareCardMetric[]
  routeCoords?: ShareCardRouteCoord[]
  exercises?: ShareCardExercise[]
  phrase?: string
  placeholderLabel: string
  score?: string | number
  userLabel?: string
  dateLabel?: string
}

const ShareCardFace = forwardRef<View, ShareCardFaceProps>(function ShareCardFace(
  { accent, kicker, glowCorner, title, metrics, routeCoords, exercises, phrase, placeholderLabel, score, userLabel, dateLabel },
  ref,
) {
  const hasRoute = !!(routeCoords && routeCoords.length > 1)
  const hasExercises = !!(exercises && exercises.length > 0)
  const visibleExercises = hasExercises ? exercises!.slice(0, 6) : []
  const extraCount = hasExercises && exercises!.length > 6 ? exercises!.length - 6 : 0

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <CornerGlow color={accent} corner={glowCorner} />

      {/* Header: logo Zyfit + punto de color */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Zyfit</Text>
          <View style={[styles.logoDot, { backgroundColor: accent }]} />
        </View>
      </View>

      {/* Título: dato protagonista (distancia en running) */}
      <View style={styles.titleBlock}>
        <Text style={[styles.kicker, { color: accent }]}>{kicker}</Text>
        <Text style={styles.title}>{title ?? '— —'}</Text>
      </View>

      {/* Métricas (se omiten en variantes sin métricas, p. ej. descanso) */}
      {metrics.length > 0 && (
        <View style={styles.metricsRow}>
          {metrics.map((m, i) => (
            <View
              key={`${m.label}-${i}`}
              style={[styles.metric, i < metrics.length - 1 && styles.metricDivider]}
            >
              <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {m.value}
              </Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Área grande: frase (descanso) · ruta (running) · ejercicios (gym) */}
      <View style={styles.placeholderArea}>
        {phrase ? (
          <View style={styles.phraseBlock}>
            <Text style={[styles.phraseQuote, { color: accent }]}>“</Text>
            <Text style={styles.phraseText}>{phrase}</Text>
          </View>
        ) : hasRoute ? (
          <RoutePath coords={routeCoords!} color={accent} />
        ) : hasExercises ? (
          <View style={styles.exerciseList}>
            {visibleExercises.map((ex, i) => (
              <View key={i} style={[styles.exerciseRow, i > 0 && styles.exerciseRowBorder]}>
                <View style={[styles.exerciseDot, { backgroundColor: accent }]} />
                <Text style={styles.exerciseName} numberOfLines={1}>{ex.nombre}</Text>
                <Text style={styles.exerciseMeta}>
                  {ex.series}×{ex.repeticiones}
                </Text>
              </View>
            ))}
            {extraCount > 0 && (
              <Text style={styles.exerciseMore}>+{extraCount} más</Text>
            )}
          </View>
        ) : (
          <Text style={styles.placeholderText}>{placeholderLabel}</Text>
        )}
      </View>

      {/* Zyfit Score (solo si se aporta) */}
      {score != null && (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>ZYFIT SCORE</Text>
          <Text style={[styles.scoreValue, { color: accent }]}>{String(score)}</Text>
        </View>
      )}

      {/* Footer: usuario + fecha */}
      <View style={styles.footer}>
        <Text style={styles.footerUser}>{userLabel ?? '@usuario'}</Text>
        <Text style={styles.footerDate}>{dateLabel ?? '-- --- ----'}</Text>
      </View>
    </View>
  )
})

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WorkoutShareCard({
  sessionType,
  title,
  metrics,
  routeCoords,
  exercises,
  phrase,
  dateLabel,
  userLabel,
  score,
}: WorkoutShareCardProps) {
  const v = VARIANTS[sessionType]
  const { width: screenW } = useWindowDimensions()

  // Carrusel de colores: el de la variante primero, luego los nuevos (azul/rosa).
  const colorOptions: ColorOption[] = [
    { key: 'default', accent: v.accent, btnText: v.btnText },
    ...EXTRA_COLORS,
  ]

  // Un ref por cada cara para capturar SOLO la visible.
  const cardRefs = useRef<(View | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [sharing, setSharing] = useState(false)

  const displayMetrics = metrics && metrics.length > 0 ? metrics : v.metrics
  const active = colorOptions[activeIndex] ?? colorOptions[0]

  async function handleShare() {
    if (sharing) return
    const node = cardRefs.current[activeIndex]
    if (!node) return
    setSharing(true)
    try {
      // Carga diferida del módulo nativo (ver nota arriba).
      const { captureRef } = await import('react-native-view-shot')
      const Sharing = await import('expo-sharing')

      // 1) Rasterizar la tarjeta VISIBLE a un PNG temporal a densidad nativa.
      const uri = await captureRef(node, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      })

      // 2) Abrir el share sheet del SO (compartir en redes).
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: sessionType === 'descanso' ? 'Compartir descanso' : 'Compartir entrenamiento',
          UTI: 'public.png',
        })
      } else {
        Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.')
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar la imagen para compartir.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <View style={styles.wrapper}>
      {/* ── Carrusel horizontal paginado (una cara por color) ── */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: screenW }}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / screenW)
          setActiveIndex(Math.max(0, Math.min(colorOptions.length - 1, i)))
        }}
      >
        {colorOptions.map((opt, i) => (
          <View key={opt.key} style={[styles.page, { width: screenW }]}>
            <ShareCardFace
              ref={el => { cardRefs.current[i] = el }}
              accent={opt.accent}
              kicker={v.kicker}
              glowCorner={v.glowCorner}
              title={title}
              metrics={displayMetrics}
              routeCoords={routeCoords}
              exercises={exercises}
              phrase={phrase}
              placeholderLabel={v.placeholderLabel}
              score={score}
              userLabel={userLabel}
              dateLabel={dateLabel}
            />
          </View>
        ))}
      </ScrollView>

      {/* ── Puntos del carrusel (cada uno con su color) ── */}
      <View style={styles.dotsRow}>
        {colorOptions.map((opt, i) => {
          const on = i === activeIndex
          return (
            <View
              key={opt.key}
              style={[
                styles.dot,
                { backgroundColor: opt.accent, opacity: on ? 1 : 0.4, width: on ? 22 : 7 },
              ]}
            />
          )
        })}
      </View>

      {/* ── Botón fuera del área capturada (color de la cara activa) ── */}
      <TouchableOpacity
        style={[styles.shareBtn, { backgroundColor: active.accent }]}
        onPress={handleShare}
        disabled={sharing}
        activeOpacity={0.85}
      >
        {sharing ? (
          <ActivityIndicator color={active.btnText} />
        ) : (
          <Text style={[styles.shareBtnText, { color: active.btnText }]}>{v.shareLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ─── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 16,
  },

  // Página del carrusel (centra la tarjeta en el ancho de pantalla)
  page: {
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Puntos del carrusel
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },

  // Tarjeta
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: CARD.bg,
    borderRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },

  // Header / logo
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logoText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: CARD.white,
    letterSpacing: -0.6,
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 3,
    marginBottom: 4,
  },

  // Título
  titleBlock: {
    marginTop: 40,
    gap: 8,
  },
  kicker: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 44,
    color: CARD.white,
    letterSpacing: -1.2,
    lineHeight: 48,
  },

  // Métricas
  metricsRow: {
    flexDirection: 'row',
    marginTop: 28,
  },
  metric: {
    flex: 1,
    gap: 6,
  },
  metricDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: CARD.border,
  },
  metricValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: CARD.white,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: CARD.inkMuted,
  },

  // Área grande (ruta / ejercicios)
  placeholderArea: {
    flex: 1,
    marginTop: 28,
    borderRadius: 20,
    backgroundColor: CARD.placeholderBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    letterSpacing: 0.5,
    color: CARD.inkFaint,
  },

  // Frase protagonista (variante descanso)
  phraseBlock: {
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phraseQuote: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 60,
    lineHeight: 52,
    marginBottom: 8,
  },
  phraseText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 23,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: CARD.white,
    textAlign: 'center',
  },

  // Lista de ejercicios (gym)
  exerciseList: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 0,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 10,
  },
  exerciseRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD.border,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  exerciseName: {
    flex: 1,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
    color: CARD.white,
    letterSpacing: -0.2,
  },
  exerciseMeta: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    color: CARD.inkSecondary,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  exerciseMore: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    color: CARD.inkFaint,
    letterSpacing: 0.5,
    marginTop: 6,
    textAlign: 'center',
  },

  // Zyfit Score
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  scoreLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: CARD.inkMuted,
  },
  scoreValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD.border,
  },
  footerUser: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
    color: CARD.inkSecondary,
  },
  footerDate: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 0.8,
    color: CARD.inkMuted,
  },

  // Botón compartir (fuera de la captura)
  shareBtn: {
    width: CARD_W,
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
})
