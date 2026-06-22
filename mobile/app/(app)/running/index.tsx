import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '../../../lib/theme'
import { RADII } from '../../../lib/colors'
import { isIndoorFromMode } from '../../../lib/runMode'
import { generateRunSession, type GeneratedRun, type RunFase } from '../../../lib/runningApi'

const FASE_COLOR: Record<string, { color: string; bg: string }> = {
  Calentamiento: { color: '#ffaa32', bg: 'rgba(255,160,50,0.12)' },
  Principal:     { color: '#4f8cff', bg: 'rgba(79,140,255,0.12)' },
  Enfriamiento:  { color: '#32c896', bg: 'rgba(50,200,150,0.12)' },
}

// Etiqueta legible del ajuste que aplicó el motor (cuando la sesión se adaptó).
const AJUSTE_LABEL: Record<string, string> = {
  dolor_a_easy: 'Suavizada por molestia',
  dolor_a_descanso: 'Convertida en descanso por molestia',
  checkin_descanso: 'Día de descanso',
  acwr_alto_degradado: 'Suavizada por carga acumulada alta',
  acwr_alto_recorta: 'Recortada por carga acumulada',
  readiness_baja_suaviza: 'Suavizada por tu estado de hoy',
  readiness_baja_recorta: 'Recortada por tu estado de hoy',
  animo_bajo_suaviza: 'Suavizada por ánimo bajo',
  infracarga_ok: 'Con margen para progresar',
}

export default function RunningSessionScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { modo } = useLocalSearchParams<{ modo?: string }>()
  const indoor = isIndoorFromMode(modo)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GeneratedRun | null>(null)

  const generar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await generateRunSession(indoor))
    } catch (e: any) {
      if (e?.code === 'daily_limit' || e?.status === 429) {
        router.replace('/(app)/dashboard')
        Alert.alert('Alcanzaste tu límite diario', 'Generaste 5 sesiones hoy. Vuelve mañana para crear nuevas.')
        return
      }
      setError(e?.message ?? 'No se pudo generar la sesión.')
    } finally {
      setLoading(false)
    }
  }, [indoor])

  useEffect(() => { generar() }, [generar])

  // ── Loading ──
  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[s.loadingText, { color: colors.inkSecondary }]}>
          Diseñando tu sesión de hoy…
        </Text>
      </View>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg, paddingHorizontal: 28 }]}>
        <Text style={[s.errTitle, { color: colors.inkPrimary }]}>Algo salió mal</Text>
        <Text style={[s.errMsg, { color: colors.inkSecondary }]}>{error}</Text>
        <TouchableOpacity onPress={generar} style={[s.retryBtn, { borderColor: colors.borderBright }]}>
          <Text style={[s.retryText, { color: colors.accent }]}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(app)/dashboard')} style={{ marginTop: 16 }}>
          <Text style={[s.linkText, { color: colors.inkMuted }]}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const w = data?.respuesta_ia
  const esRest = data?.es_rest || w?.tipo_sesion === 'rest'

  // ── Día de descanso ──
  if (esRest || !w) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg, paddingHorizontal: 28 }]}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>😴</Text>
        <Text style={[s.restTitle, { color: colors.inkPrimary }]}>
          {w?.titulo || 'Día de descanso'}
        </Text>
        <Text style={[s.restNote, { color: colors.inkSecondary }]}>
          {w?.nota_del_coach || 'Hoy toca descansar. El descanso es parte del plan.'}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(app)/dashboard')} style={{ marginTop: 28 }}>
          <Text style={[s.linkText, { color: colors.accent }]}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const ajusteLabel = data?.estado === 'ajustada' && data?.ajuste_aplicado
    ? (AJUSTE_LABEL[data.ajuste_aplicado] || 'Adaptada a tu estado de hoy')
    : null

  const stats: { label: string; value: string }[] = [
    { label: 'DURACIÓN', value: `${w.duracion_total_min} min` },
    ...(!indoor && w.distancia_total_km ? [{ label: 'DISTANCIA', value: `${w.distancia_total_km} km` }] : []),
    { label: 'ZONA', value: w.zona_principal || '—' },
    { label: 'RPE', value: `${w.rpe_target}/10` },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[s.eyebrow, { color: colors.accent }]}>TU SESIÓN DE HOY</Text>
        <Text style={[s.title, { color: colors.inkPrimary }]}>{w.titulo}</Text>
        <Text style={[s.objetivo, { color: colors.inkSecondary }]}>{w.objetivo_sesion}</Text>

        {ajusteLabel && (
          <View style={[s.ajusteBadge, { backgroundColor: colors.glassBg, borderColor: colors.borderDefault }]}>
            <Text style={[s.ajusteText, { color: colors.orange }]}>↻ {ajusteLabel}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {stats.map(st => (
            <View key={st.label} style={[s.statCard, { backgroundColor: colors.glassBg, borderColor: colors.borderDefault }]}>
              <Text style={[s.statValue, { color: colors.inkPrimary }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: colors.inkMuted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Nota del coach */}
        {!!w.nota_del_coach && (
          <View style={[s.coachCard, { backgroundColor: 'rgba(79,140,255,0.07)', borderColor: colors.borderDefault }]}>
            <Text style={[s.coachText, { color: colors.inkPrimary }]}>🧠 {w.nota_del_coach}</Text>
          </View>
        )}

        {/* Fases */}
        {w.fases.map((fase, i) => (
          <FaseBlock key={`${fase.nombre}-${i}`} fase={fase} indoor={indoor} colors={colors} defaultOpen={i === 1} />
        ))}

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.replace(`/(app)/run?modo=${modo || 'exterior'}&planned=${data?.id ?? ''}`)}
          activeOpacity={0.88}
          style={{ marginTop: 20 }}>
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.cta}>
            <Text style={s.ctaText}>Empezar carrera</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(app)/dashboard')} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={[s.linkText, { color: colors.inkMuted }]}>Volver al inicio</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function FaseBlock({ fase, indoor, colors, defaultOpen }: {
  fase: RunFase; indoor: boolean; colors: any; defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const fc = FASE_COLOR[fase.nombre] || { color: colors.accent, bg: colors.glassBg }

  return (
    <View style={[s.faseCard, { backgroundColor: fc.bg, borderColor: colors.borderDefault }]}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} activeOpacity={0.8} style={s.faseHeader}>
        <Text style={[s.faseName, { color: fc.color }]}>{fase.nombre.toUpperCase()}</Text>
        <Text style={[s.faseMeta, { color: colors.inkMuted }]}>
          {fase.segmentos.length} {fase.segmentos.length === 1 ? 'bloque' : 'bloques'}  {open ? '▾' : '▸'}
        </Text>
      </TouchableOpacity>

      {open && fase.segmentos.map((seg, j) => (
        <View key={j} style={[s.segRow, { borderTopColor: colors.borderDefault }]}>
          <Text style={[s.segMain, { color: colors.inkPrimary }]}>
            {seg.repeticiones > 1 ? `${seg.repeticiones}× ` : ''}{seg.trabajo}
            {seg.recuperacion ? `  ·  rec ${seg.recuperacion}` : ''}
          </Text>
          <View style={s.chipsRow}>
            {!indoor && seg.pace_objetivo && (
              <Chip text={seg.pace_objetivo} color={colors.cyan} colors={colors} />
            )}
            {seg.fc_objetivo && <Chip text={seg.fc_objetivo} color={colors.red} colors={colors} />}
            <Chip text={`RPE ${seg.rpe}`} color={fc.color} colors={colors} />
          </View>
          {!!seg.cue && <Text style={[s.cue, { color: colors.inkSecondary }]}>{seg.cue}</Text>}
        </View>
      ))}
    </View>
  )
}

function Chip({ text, color, colors }: { text: string; color: string; colors: any }) {
  return (
    <View style={[s.chip, { borderColor: colors.borderBright }]}>
      <Text style={[s.chipText, { color }]}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 18, fontFamily: 'SpaceGrotesk-Medium', fontSize: 15 },
  errTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, marginBottom: 8 },
  errMsg: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, textAlign: 'center', marginBottom: 22 },
  retryBtn: { borderWidth: 1, borderRadius: RADII.pill, paddingHorizontal: 28, paddingVertical: 12 },
  retryText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  linkText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 },
  restTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, marginBottom: 10, textAlign: 'center' },
  restNote: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  eyebrow: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  title: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 28, letterSpacing: -0.7, marginBottom: 6 },
  objetivo: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, lineHeight: 21, marginBottom: 16 },
  ajusteBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: RADII.sm, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 16 },
  ajusteText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.4 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  statCard: { flexGrow: 1, minWidth: '22%', borderWidth: 1, borderRadius: RADII.md, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 18 },
  statLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, marginTop: 4 },

  coachCard: { borderWidth: 1, borderRadius: RADII.md, padding: 16, marginBottom: 18 },
  coachText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, lineHeight: 21 },

  faseCard: { borderWidth: 1, borderRadius: RADII.lg, marginBottom: 12, overflow: 'hidden' },
  faseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  faseName: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 13, letterSpacing: 0.5 },
  faseMeta: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11 },
  segRow: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  segMain: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: RADII.xs, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11 },
  cue: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, lineHeight: 19, marginTop: 8, fontStyle: 'italic' },

  cta: { borderRadius: RADII.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#fff', letterSpacing: 0.3 },
})
