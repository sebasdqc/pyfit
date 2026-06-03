import React, { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
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
// Tiene dos variantes — 'running' (verde) y 'gym' (púrpura).
//
// IMPORTANTE: por ahora TODOS los valores son placeholders hardcodeados. La prop
// `session` se recibe pero AÚN NO se conecta a datos reales — eso se hará en una
// fase posterior. El objetivo de este componente es dejar lista la maqueta visual
// y el pipeline de exportación a PNG (captura de vista + share sheet del SO).
//
// El área capturada es ÚNICAMENTE la tarjeta (cardRef). El botón "COMPARTIR
// RUTINA" vive fuera de ese View, por lo que nunca aparece en la imagen final.
// ─────────────────────────────────────────────────────────────────────────────

export type WorkoutSessionType = 'running' | 'gym'

export interface WorkoutShareCardProps {
  /** Determina la variante visual de la tarjeta. */
  sessionType: WorkoutSessionType
  /** Datos de la sesión. Reservado — todavía no se conecta (placeholders). */
  session?: unknown
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
  inkSecondary: 'rgba(255,255,255,0.6)',
  inkMuted: 'rgba(255,255,255,0.4)',
  inkFaint: 'rgba(255,255,255,0.25)',
  placeholderBg: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
}

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
}

const VARIANTS: Record<WorkoutSessionType, VariantConfig> = {
  running: {
    accent: CARD.green,
    glowCorner: 'left',
    kicker: 'CARRERA',
    btnText: '#06281A',
    placeholderLabel: '[ruta]',
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
    metrics: [
      { label: 'EJERCICIOS', value: '--' },
      { label: 'SERIES', value: '--' },
      { label: 'VOLUMEN', value: '--' },
    ],
  },
}

// ─── Glow de esquina (RadialGradient SVG) ────────────────────────────────────
function CornerGlow({ color, corner }: { color: string; corner: 'left' | 'right' }) {
  const cx = corner === 'left' ? '0%' : '100%'
  return (
    <Svg style={StyleSheet.absoluteFill} width={CARD_W} height={CARD_H} pointerEvents="none">
      <Defs>
        <RadialGradient id="cornerGlow" cx={cx} cy="0%" rx="80%" ry="55%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.38} />
          <Stop offset="50%" stopColor={color} stopOpacity={0.1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill="url(#cornerGlow)" />
    </Svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WorkoutShareCard({ sessionType }: WorkoutShareCardProps) {
  const v = VARIANTS[sessionType]
  const cardRef = useRef<View>(null)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    if (sharing) return
    setSharing(true)
    try {
      // Carga diferida del módulo nativo (ver nota arriba).
      const { captureRef } = await import('react-native-view-shot')
      const Sharing = await import('expo-sharing')

      // 1) Rasterizar la tarjeta a un PNG temporal a densidad nativa.
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      })

      // 2) Abrir el share sheet del SO (compartir en redes).
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartir entrenamiento',
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
      {/* ── Tarjeta capturable (360 × 640) ── */}
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <CornerGlow color={v.accent} corner={v.glowCorner} />

        {/* Header: logo Zyfit + punto verde */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>Zyfit</Text>
            <View style={styles.logoDot} />
          </View>
        </View>

        {/* Título: nombre de sesión / distancia (placeholder) */}
        <View style={styles.titleBlock}>
          <Text style={[styles.kicker, { color: v.accent }]}>{v.kicker}</Text>
          <Text style={styles.title}>— —</Text>
        </View>

        {/* Métricas */}
        <View style={styles.metricsRow}>
          {v.metrics.map((m, i) => (
            <View
              key={m.label}
              style={[styles.metric, i < v.metrics.length - 1 && styles.metricDivider]}
            >
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Área grande: ruta (running) o ejercicios (gym) */}
        <View style={styles.placeholderArea}>
          <Text style={styles.placeholderText}>{v.placeholderLabel}</Text>
        </View>

        {/* Zyfit Score */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>ZYFIT SCORE</Text>
          <Text style={[styles.scoreValue, { color: v.accent }]}>--</Text>
        </View>

        {/* Footer: usuario + fecha */}
        <View style={styles.footer}>
          <Text style={styles.footerUser}>@usuario</Text>
          <Text style={styles.footerDate}>-- --- ----</Text>
        </View>
      </View>

      {/* ── Botón fuera del área capturada ── */}
      <TouchableOpacity
        style={[styles.shareBtn, { backgroundColor: v.accent }]}
        onPress={handleShare}
        disabled={sharing}
        activeOpacity={0.85}
      >
        {sharing ? (
          <ActivityIndicator color={v.btnText} />
        ) : (
          <Text style={[styles.shareBtnText, { color: v.btnText }]}>COMPARTIR RUTINA</Text>
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
    backgroundColor: CARD.green,
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
  },
  placeholderText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    letterSpacing: 0.5,
    color: CARD.inkFaint,
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
