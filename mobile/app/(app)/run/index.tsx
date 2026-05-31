import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useRunTracking } from '../../../hooks/useRunTracking'
import { formatDistance, formatDuration, formatPace } from '../../../lib/runMetrics'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'

// ─── Back Arrow Icon (inline SVG-free) ───────────────────────────────────────

function BackArrow({ color }: { color: string }) {
  return (
    <Text style={{ color, fontSize: 22, lineHeight: 26 }}>{'‹'}</Text>
  )
}

// ─── Metric Column ────────────────────────────────────────────────────────────

function MetricColumn({
  label,
  value,
  colors,
}: {
  label: string
  value: string
  colors: Colors
}) {
  return (
    <View style={styles.metricCol}>
      <Text
        style={[styles.metricValue, { color: colors.inkPrimary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.inkMuted }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

// ─── Slide to Stop ──────────────────────────────────────────────────────────
// Mismo patrón que el SliderButton de ejecutar (PanResponder + Animated, sin
// gesture-handler). Umbral alto (85%) porque detener termina la carrera.

function SlideToStop({ onStop }: { onStop: () => void }) {
  const pan       = useRef(new Animated.Value(0)).current
  const trackWRef = useRef(0)
  const [trackW, setTrackW] = useState(0)
  const doneRef   = useRef(false)
  const HANDLE = 56, PAD = 4
  const maxX = Math.max(0, trackW - HANDLE - PAD * 2)

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !doneRef.current,
    onMoveShouldSetPanResponder:  () => !doneRef.current,
    onPanResponderMove: (_, gs) => {
      if (doneRef.current) return
      const max = trackWRef.current - HANDLE - PAD * 2
      if (max <= 0) return
      pan.setValue(Math.max(0, Math.min(gs.dx, max)))
    },
    onPanResponderRelease: (_, gs) => {
      if (doneRef.current) return
      const max = trackWRef.current - HANDLE - PAD * 2
      if (max <= 0) return
      const x = Math.max(0, Math.min(gs.dx, max))
      if (x >= max * 0.85) {
        doneRef.current = true
        Animated.timing(pan, { toValue: max, duration: 110, easing: Easing.out(Easing.ease), useNativeDriver: false })
          .start(() => onStop())
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: false, tension: 140, friction: 9 }).start()
      }
    },
  })).current

  const labelOpacity = pan.interpolate({
    inputRange: [0, Math.max(40, maxX * 0.5)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return (
    <View
      style={styles.slideTrack}
      onLayout={e => { const w = e.nativeEvent.layout.width; trackWRef.current = w; setTrackW(w) }}
    >
      <Animated.View pointerEvents="none" style={[styles.slideLabelWrap, { opacity: labelOpacity }]}>
        <Text style={styles.slideLabel}>DESLIZA PARA DETENER ›››</Text>
      </Animated.View>
      {trackW > 0 && (
        <Animated.View
          style={[styles.slideHandle, { transform: [{ translateX: pan }] }]}
          {...panResponder.panHandlers}
        >
          <Text style={styles.slideHandleIcon}>›</Text>
        </Animated.View>
      )}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RunScreen() {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const {
    sessionId,
    status,
    coordinates,
    totalDistance,
    currentPace,
    elapsedSeconds,
    backgroundActive,
    error,
    startRun,
    stopRun,
  } = useRunTracking()

  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)

  // Fetch real device location on mount so map centers correctly before run starts
  useEffect(() => {
    let cancelled = false
    async function fetchLocation() {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync()
        if (perm === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          if (!cancelled) {
            setDeviceLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
          }
        }
      } catch {
        // Permission denied or error — map will render without centering
      } finally {
        if (!cancelled) setLocationReady(true)
      }
    }
    fetchLocation()
    return () => { cancelled = true }
  }, [])

  // Navigate to summary when run completes
  useEffect(() => {
    if (status === 'completed') {
      if (sessionId !== null) {
        router.replace(`/(app)/run/resumen/${sessionId}`)
      } else {
        router.replace('/(app)/dashboard')
      }
    }
  }, [status, sessionId])

  // Show GPS/start errors (not stop errors — those navigate away)
  useEffect(() => {
    if (error && status !== 'completed') {
      Alert.alert('Error', error)
    }
  }, [error, status])

  // Map region: prefer live run coordinates → pre-fetched device location → null (don't render yet)
  const activeCoord = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null
  const centerCoord = activeCoord ?? deviceLocation

  const initialRegion = centerCoord
    ? {
        latitude: centerCoord.latitude,
        longitude: centerCoord.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : null

  const polylineCoords = coordinates.map(c => ({
    latitude: c.latitude,
    longitude: c.longitude,
  }))

  const lastCoord = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Full screen map — only render once we know the device location ── */}
      {!locationReady && (
        <View style={[styles.mapLoading, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.mapLoadingText, { color: colors.inkMuted }]}>Obteniendo ubicación...</Text>
        </View>
      )}
      {locationReady && initialRegion && (
        <MapView
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          showsUserLocation
          followsUserLocation={status !== 'completed'}
          mapType="standard"
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
      )}
      {locationReady && !initialRegion && (
        <View style={[styles.mapLoading, { backgroundColor: colors.bg }]}>
          <Text style={[styles.mapLoadingText, { color: colors.inkMuted }]}>No se pudo obtener la ubicación.{'\n'}Activa el GPS e intenta de nuevo.</Text>
        </View>
      )}

      {/* ── Header overlay ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.82)' }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.glassBg, borderColor: colors.borderDefault }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <BackArrow color={colors.inkPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.inkPrimary }]}>FREE RUN</Text>
        {/* Indicador de background GPS activo */}
        {status === 'active' && (
          <View style={[styles.bgBadge, backgroundActive ? styles.bgBadgeOn : styles.bgBadgeOff]}>
            <Text style={[styles.bgBadgeText, { color: colors.inkPrimary }]}>{backgroundActive ? '📡 BG' : '📍 FG'}</Text>
          </View>
        )}
        {status !== 'active' && <View style={styles.headerRight} />}
      </View>

      {/* ── Bottom metrics panel ── */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 20, backgroundColor: colors.sheetBg, borderTopColor: colors.borderDefault }]}>
        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <MetricColumn
            label="DISTANCIA"
            value={formatDistance(totalDistance)}
            colors={colors}
          />
          <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
          <MetricColumn
            label="TIEMPO"
            value={formatDuration(elapsedSeconds)}
            colors={colors}
          />
          <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
          <MetricColumn
            label="RITMO"
            value={formatPace(currentPace)}
            colors={colors}
          />
        </View>

        {/* Action button */}
        <View style={styles.btnWrap}>
          {status === 'idle' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.green }]}
              onPress={startRun}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, { color: colors.white }]}>EMPEZAR</Text>
            </TouchableOpacity>
          )}

          {status === 'active' && (
            <SlideToStop onStop={stopRun} />
          )}

          {status === 'completed' && (
            <View style={styles.completingWrap}>
              <Text style={[styles.completingText, { color: colors.inkMuted }]}>Guardando resultados...</Text>
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

  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    gap: 12,
  },
  mapLoadingText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 32,
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
    paddingHorizontal: 6,
  },
  metricValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 23,
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 28,
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginTop: 5,
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
  actionBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 1,
  },

  // Slide to stop
  slideTrack: {
    height: 60,
    width: '100%',
    borderRadius: 30,
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,68,68,0.45)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  slideLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  slideLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: '#ff4444',
    letterSpacing: 0.5,
  },
  slideHandle: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 56,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideHandleIcon: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'SpaceGrotesk-Bold',
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

  // Background GPS indicator badge
  bgBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  bgBadgeOn: {
    backgroundColor: 'rgba(50,200,150,0.15)',
    borderColor: 'rgba(50,200,150,0.4)',
  },
  bgBadgeOff: {
    backgroundColor: 'rgba(255,170,50,0.15)',
    borderColor: 'rgba(255,170,50,0.4)',
  },
  bgBadgeText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 1,
  },
})
