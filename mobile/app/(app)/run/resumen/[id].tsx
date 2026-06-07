import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { getRunSession, RunSession } from '../../../../lib/runsApi'
import {
  formatDistance,
  formatDuration,
  formatPace,
} from '../../../../lib/runMetrics'
import { useTheme } from '../../../../lib/theme'
import { Colors } from '../../../../lib/colors'
import { getUser } from '../../../../lib/storage'
import WorkoutShareCard from '../../../../components/WorkoutShareCard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricCard {
  label: string
  value: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function formatShareDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (isNaN(d.getTime())) return undefined
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

function handleFromUser(u: { nombre?: string; email?: string } | null): string | undefined {
  if (!u) return undefined
  const base = (u.nombre || u.email?.split('@')[0] || '').trim().toLowerCase().replace(/\s+/g, '')
  return base ? `@${base}` : undefined
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCardItem({ label, value, colors }: MetricCard & { colors: Colors }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.cardBg, borderColor: colors.borderDefault }]}>
      <Text style={[styles.metricCardValue, { color: colors.inkPrimary }]}>{value}</Text>
      <Text style={[styles.metricCardLabel, { color: colors.inkMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RunResumenScreen() {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [session, setSession] = useState<RunSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [userLabel, setUserLabel] = useState<string | undefined>(undefined)

  useEffect(() => {
    getUser().then(u => setUserLabel(handleFromUser(u))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    const sessionId = parseInt(id, 10)
    if (isNaN(sessionId)) {
      setError('ID de sesión inválido')
      setLoading(false)
      return
    }
    getRunSession(sessionId)
      .then(data => {
        setSession(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message ?? 'Error al cargar resultados')
        setLoading(false)
      })
  }, [id])

  // Build polyline from points if available (backend devuelve lat/lng)
  const polylineCoords = session?.points?.map(p => ({
    latitude: p.lat,
    longitude: p.lng,
  })) ?? []

  const mapRegion = polylineCoords.length > 0
    ? {
        latitude: polylineCoords[0].latitude,
        longitude: polylineCoords[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 19.4326,
        longitude: -99.1332,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }

  // Build metric cards
  const metrics: MetricCard[] = session
    ? [
        {
          label: 'DISTANCIA',
          value: formatDistance(session.total_distance_m ?? 0),
        },
        {
          label: 'TIEMPO',
          value: formatDuration(session.total_duration_s ?? 0),
        },
        {
          label: 'RITMO PROM.',
          value: formatPace(session.avg_pace_s_per_km ?? 0),
        },
        {
          label: 'MEJOR RITMO',
          value: formatPace(session.best_pace_s_per_km ?? 0),
        },
        {
          label: 'DESNIVEL +',
          value:
            session.elevation_gain_m != null
              ? `${Math.round(session.elevation_gain_m)} m`
              : '-- m',
        },
        {
          label: 'CALORÍAS',
          value:
            session.calories_burned != null
              ? `${Math.round(session.calories_burned)} kcal`
              : '-- kcal',
        },
      ]
    : []

  // ── Loading state
  if (loading) {
    return (
      <View style={[styles.root, styles.centerContent, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.inkMuted }]}>Calculando resultados...</Text>
      </View>
    )
  }

  // ── Error state
  if (error || !session) {
    return (
      <View style={[styles.root, styles.centerContent, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.red }]}>{error ?? 'Error desconocido'}</Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.replace('/(app)/dashboard')}
        >
          <Text style={[styles.doneBtnText, { color: colors.white }]}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* ── Mini map ── */}
      <View style={[styles.mapContainer, { backgroundColor: colors.bg }]}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          customMapStyle={isDark ? darkMapStyle : []}
        >
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={colors.accent}
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Gradient overlay at bottom of map */}
        <View style={styles.mapGradientOverlay} />
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.inkPrimary }]}>Resumen</Text>

        {/* Metric grid (2 columns) */}
        <View style={styles.grid}>
          {metrics.map((m, i) => (
            <MetricCardItem key={i} label={m.label} value={m.value} colors={colors} />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.replace('/(app)/dashboard')}
          activeOpacity={0.85}
        >
          <Text style={[styles.doneBtnText, { color: colors.white }]}>Listo</Text>
        </TouchableOpacity>

        {/* Compartir en redes sociales */}
        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: colors.borderBright }]}
          onPress={() => setShareOpen(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.shareBtnText, { color: colors.inkMuted }]}>↗ Compartir en redes sociales</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modal: tarjeta para compartir ── */}
      <Modal
        visible={shareOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShareOpen(false)}
      >
        <View style={styles.shareModalRoot}>
          <View style={[styles.shareModalClose, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => setShareOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
            >
              <Text style={styles.shareModalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.shareModalContent}
            showsVerticalScrollIndicator={false}
          >
            <WorkoutShareCard
              sessionType="running"
              title={formatDistance(session.total_distance_m ?? 0)}
              metrics={[
                { label: 'TIEMPO', value: formatDuration(session.total_duration_s ?? 0) },
                { label: 'RITMO /KM', value: formatPace(session.avg_pace_s_per_km ?? 0).replace(' /km', '') },
                {
                  label: 'CALORÍAS',
                  value: session.calories_burned != null ? `${Math.round(session.calories_burned)}` : '--',
                },
              ]}
              routeCoords={polylineCoords}
              dateLabel={formatShareDate(session.ended_at ?? session.started_at)}
              userLabel={userLabel}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

// ─── Dark map style ───────────────────────────────────────────────────────────

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1f2937' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#111827' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  // Map
  mapContainer: {
    height: 220,
    width: '100%',
    backgroundColor: '#0a0a0a',
  },
  mapGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'transparent',
    // Simulated fade using a semi-transparent overlay
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Title
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: -0.7,
    marginBottom: 24,
  },

  // Metric grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  metricCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  metricCardValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metricCardLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Done button
  doneBtn: {
    backgroundColor: '#4f8cff',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Compartir
  shareBtn: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  shareBtnText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },

  // Share card modal
  shareModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  shareModalClose: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  shareModalCloseText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 32,
    color: '#ffffff',
    lineHeight: 36,
  },
  shareModalContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },

  // Loading / error
  loadingText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    color: '#ff4444',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
