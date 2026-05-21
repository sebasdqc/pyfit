import React, { useEffect } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useRunTracking } from '../../../hooks/useRunTracking'
import { formatDistance, formatDuration, formatPace } from '../../../lib/runMetrics'

// ─── Back Arrow Icon (inline SVG-free) ───────────────────────────────────────

function BackArrow() {
  return (
    <Text style={{ color: '#ffffff', fontSize: 22, lineHeight: 26 }}>{'‹'}</Text>
  )
}

// ─── Metric Column ────────────────────────────────────────────────────────────

function MetricColumn({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.metricCol}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RunScreen() {
  const insets = useSafeAreaInsets()
  const {
    sessionId,
    status,
    coordinates,
    totalDistance,
    currentPace,
    elapsedSeconds,
    error,
    startRun,
    stopRun,
  } = useRunTracking()

  // Navigate to summary when run completes
  useEffect(() => {
    if (status === 'completed' && sessionId !== null) {
      router.replace(`/(app)/run/resumen/${sessionId}`)
    }
  }, [status, sessionId])

  // Show errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error)
    }
  }, [error])

  function handleStop() {
    Alert.alert(
      'Detener carrera',
      '¿Estás seguro de que quieres terminar la carrera?',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: () => stopRun(),
        },
      ],
    )
  }

  // Map region centered on first coordinate or default
  const initialRegion = coordinates.length > 0
    ? {
        latitude: coordinates[0].latitude,
        longitude: coordinates[0].longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : {
        latitude: 19.4326,
        longitude: -99.1332,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }

  const polylineCoords = coordinates.map(c => ({
    latitude: c.latitude,
    longitude: c.longitude,
  }))

  const lastCoord = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null

  return (
    <View style={styles.root}>
      {/* ── Full screen map ── */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        followsUserLocation={status === 'active'}
        mapType="standard"
        customMapStyle={darkMapStyle}
      >
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#4f8cff"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* ── Header overlay ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <BackArrow />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FREE RUN</Text>
        <View style={styles.headerRight} />
      </View>

      {/* ── Bottom metrics panel ── */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <MetricColumn
            label="DISTANCIA"
            value={formatDistance(totalDistance)}
          />
          <View style={styles.metricDivider} />
          <MetricColumn
            label="TIEMPO"
            value={formatDuration(elapsedSeconds)}
          />
          <View style={styles.metricDivider} />
          <MetricColumn
            label="RITMO"
            value={formatPace(currentPace)}
          />
        </View>

        {/* Action button */}
        <View style={styles.btnWrap}>
          {status === 'idle' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn]}
              onPress={startRun}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>EMPEZAR</Text>
            </TouchableOpacity>
          )}

          {status === 'active' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.stopBtn]}
              onPress={handleStop}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>DETENER</Text>
            </TouchableOpacity>
          )}

          {status === 'completed' && (
            <View style={styles.completingWrap}>
              <Text style={styles.completingText}>Guardando resultados...</Text>
            </View>
          )}
        </View>
      </View>
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
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerRight: {
    width: 40,
  },

  // Bottom panel
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 24,
    paddingHorizontal: 24,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  metricLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Buttons
  btnWrap: {
    width: '100%',
  },
  actionBtn: {
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    backgroundColor: '#32c896',
  },
  stopBtn: {
    backgroundColor: '#ff4444',
  },
  actionBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 1,
  },
  completingWrap: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  completingText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
})
