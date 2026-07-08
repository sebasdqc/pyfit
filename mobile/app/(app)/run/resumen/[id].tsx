import React, { useEffect, useRef, useState } from 'react'
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
import { getShareUserLabel } from '../../../../lib/shareCard'
import WorkoutShareCard from '../../../../components/WorkoutShareCard'
import SessionPhotos from '../../../../components/SessionPhotos'

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

// Segundos/km → "M:SS".
function mmssPace(s: number): string {
  const x = Math.max(0, Math.round(s))
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`
}

// Región que encuadra TODA la traza (caja envolvente + margen), para que el mapa
// muestre el recorrido completo y no salga cortado. `fitToCoordinates` afina el
// encuadre exacto en onMapReady; esto es el initialRegion (ya centrado).
function boundingRegion(coords: { latitude: number; longitude: number }[]) {
  if (coords.length === 0) {
    return { latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.02, longitudeDelta: 0.02 }
  }
  let minLat = coords[0].latitude, maxLat = coords[0].latitude
  let minLng = coords[0].longitude, maxLng = coords[0].longitude
  for (const c of coords) {
    if (c.latitude < minLat) minLat = c.latitude
    if (c.latitude > maxLat) maxLat = c.latitude
    if (c.longitude < minLng) minLng = c.longitude
    if (c.longitude > maxLng) maxLng = c.longitude
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    // ×1.4 deja aire alrededor; mínimo para no sobre-acercar en rutas muy cortas.
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.004),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.004),
  }
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
  const mapRef = useRef<MapView>(null)

  useEffect(() => {
    getShareUserLabel().then(setUserLabel)
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

  const mapRegion = boundingRegion(polylineCoords)

  // Encuadra la traza completa una vez el mapa está listo (afina el initialRegion
  // teniendo en cuenta el tamaño real del view → evita que la ruta salga cortada).
  function fitRoute() {
    if (polylineCoords.length > 1) {
      mapRef.current?.fitToCoordinates(polylineCoords, {
        edgePadding: { top: 36, right: 36, bottom: 36, left: 36 },
        animated: false,
      })
    }
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

  // ── Adherencia (solo si la carrera vino de una sesión inteligente) ──
  const planned = session.planned
  let adh: null | {
    zona: string; paceTarget: string | null
    status: { label: string; color: string } | null
    pct: number | null; rpeTarget: number | null; rpeReal: number | null
  } = null
  if (planned) {
    const pr = planned.pace_objetivo
    const avg = session.avg_pace_s_per_km ?? 0
    let status: { label: string; color: string } | null = null
    if (pr && avg > 0) {
      if (avg < pr[0]) status = { label: 'MÁS RÁPIDO', color: colors.cyan }
      else if (avg > pr[1]) status = { label: 'MÁS LENTO', color: colors.orange }
      else status = { label: 'EN ZONA', color: colors.green }
    }
    let pct: number | null = null
    if (pr && session.points && session.points.length) {
      let inz = 0, tot = 0
      for (const p of session.points) {
        const sp = p.speed_m_s
        if (sp && sp > 0) { tot++; const pace = 1000 / sp; if (pace >= pr[0] && pace <= pr[1]) inz++ }
      }
      if (tot >= 5) pct = Math.round((inz / tot) * 100)
    }
    adh = {
      zona: planned.zona_principal,
      paceTarget: pr ? `${mmssPace(pr[0])}–${mmssPace(pr[1])} /km` : null,
      status, pct,
      rpeTarget: planned.rpe_target,
      rpeReal: session.rpe_real ?? null,
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* ── Mini map ── */}
      <View style={[styles.mapContainer, { backgroundColor: colors.bg }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={mapRegion}
          onMapReady={fitRoute}
          onLayout={fitRoute}
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
        <Text style={[styles.title, { color: colors.inkPrimary }]}>Tu Resumen</Text>

        {/* Adherencia al plan (sesión inteligente) */}
        {adh && (
          <View style={{ borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 1.2, color: colors.accent, marginBottom: 10 }}>
              ADHERENCIA AL PLAN{adh.zona ? `  ·  ${adh.zona}` : ''}
            </Text>
            {adh.paceTarget && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <Text style={{ fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: colors.inkMuted }}>Objetivo</Text>
                <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: colors.inkPrimary }}>{adh.paceTarget}</Text>
                {adh.status && (
                  <View style={{ marginLeft: 'auto', borderWidth: 1, borderColor: adh.status.color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 11, color: adh.status.color }}>{adh.status.label}</Text>
                  </View>
                )}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 28 }}>
              {adh.pct != null && (
                <View>
                  <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: colors.inkPrimary }}>{adh.pct}%</Text>
                  <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.inkMuted, marginTop: 2 }}>EN ZONA</Text>
                </View>
              )}
              <View>
                <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: colors.inkPrimary }}>
                  {adh.rpeReal ?? '--'}<Text style={{ color: colors.inkMuted, fontSize: 15 }}> / {adh.rpeTarget ?? '--'}</Text>
                </Text>
                <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.inkMuted, marginTop: 2 }}>RPE REAL / OBJ</Text>
              </View>
            </View>
          </View>
        )}

        {/* Metric grid (2 columns) */}
        <View style={styles.grid}>
          {metrics.map((m, i) => (
            <MetricCardItem key={i} label={m.label} value={m.value} colors={colors} />
          ))}
        </View>

        {/* Fotos de la sesión (se guardan y aparecen al volver a abrir la carrera) */}
        <SessionPhotos kind="run" sessionId={session.id} initialPhotos={session.photos ?? []} editable />

        {/* CTA → feedback de la carrera, luego dashboard */}
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.replace(`/(app)/run/feedback/${session.id}`)}
          activeOpacity={0.85}
        >
          <Text style={[styles.doneBtnText, { color: colors.white }]}>Continuar</Text>
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
              kicker={session.is_trail ? 'TRAIL RUNNING' : undefined}
              title={formatDistance(session.total_distance_m ?? 0)}
              metrics={[
                { label: 'TIEMPO', value: formatDuration(session.total_duration_s ?? 0) },
                { label: 'RITMO /KM', value: formatPace(session.avg_pace_s_per_km ?? 0).replace(' /km', '') },
                // En trail la elevación es el dato protagonista → reemplaza a calorías.
                session.is_trail
                  ? {
                      label: 'DESNIVEL +',
                      value: session.elevation_gain_m != null ? `${Math.round(session.elevation_gain_m)} m` : '-- m',
                    }
                  : {
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
