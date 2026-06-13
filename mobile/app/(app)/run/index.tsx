import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
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
    pauseRun,
    resumeRun,
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
        } else {
          // Permiso denegado — mostrar Alert accionable con acceso directo a Ajustes
          if (!cancelled) {
            Alert.alert(
              'GPS no disponible',
              'Free Run necesita acceso a tu ubicación para registrar la carrera. Actívalo en Ajustes.',
              [
                { text: 'Más tarde', style: 'cancel' },
                { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
              ]
            )
          }
        }
      } catch {
        // Error de hardware — el mapa renderiza sin centrar
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

  // Salir con carrera activa: confirmar y detener correctamente (stopRun completa
  // la sesión y para el GPS de fondo). `run` es un tab, así que NO podemos confiar
  // en el desmontaje: hay que interceptar el botón y el back de hardware.
  const inProgress = status === 'active' || status === 'paused'

  function handleExit() {
    if (inProgress) {
      Alert.alert(
        'Detener carrera',
        '¿Terminar y guardar tu carrera?',
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Detener', style: 'destructive', onPress: () => stopRun() },
        ],
      )
    } else {
      router.back()
    }
  }

  // Confirmación al finalizar (antes el slider evitaba el toque accidental)
  function handleFinish() {
    Alert.alert(
      'Finalizar carrera',
      '¿Terminar y guardar tu carrera?',
      [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Finalizar', style: 'destructive', onPress: () => stopRun() },
      ],
    )
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'active' || status === 'paused') { handleExit(); return true }  // consumir, no salir
      return false
    })
    return () => sub.remove()
    // handleExit cierra sobre status/stopRun de este render; re-suscribe al cambiar status
  }, [status])

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
          onPress={handleExit}
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
        {status === 'paused' && (
          <View style={[styles.bgBadge, styles.bgBadgeOff]}>
            <Text style={[styles.bgBadgeText, { color: colors.inkPrimary }]}>⏸ PAUSA</Text>
          </View>
        )}
        {!inProgress && <View style={styles.headerRight} />}
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

        {/* Action buttons */}
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

          {inProgress && (
            <View style={styles.btnRow}>
              {status === 'active' ? (
                <TouchableOpacity
                  style={[styles.rowBtn, { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.borderBright }]}
                  onPress={pauseRun}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionBtnText, { color: colors.inkPrimary }]}>PAUSA</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.rowBtn, { backgroundColor: colors.green }]}
                  onPress={resumeRun}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionBtnText, { color: colors.white }]}>REANUDAR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.rowBtn, { backgroundColor: colors.red }]}
                onPress={handleFinish}
                activeOpacity={0.85}
              >
                <Text style={[styles.actionBtnText, { color: colors.white }]}>FINALIZAR</Text>
              </TouchableOpacity>
            </View>
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

  // Botones en fila (pausa/reanudar + finalizar)
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  rowBtn: {
    flex: 1,
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
