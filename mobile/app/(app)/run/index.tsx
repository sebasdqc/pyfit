import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useRunTracking } from '../../../hooks/useRunTracking'
import {
  estimateCalories,
  formatCalories,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
} from '../../../lib/runMetrics'
import { apiGet } from '../../../lib/api'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'

// Clave de consentimiento de la disclosure prominente de ubicación en segundo
// plano. Google Play exige mostrar este aviso ANTES de solicitar el permiso
// ACCESS_BACKGROUND_LOCATION, explicando qué dato se accede, para qué función y
// que se recopila incluso con la app cerrada. Persistimos la aceptación para no
// repetirla en cada carrera (basta mostrarla antes de la primera solicitud).
const BG_LOCATION_DISCLOSURE_KEY = '@zyfit/bgLocationDisclosureAccepted'

// ─── Back Arrow ───────────────────────────────────────────────────────────────

function BackArrow({ color }: { color: string }) {
  return <Text style={{ color, fontSize: 22, lineHeight: 26 }}>{'‹'}</Text>
}

// ─── Metric Column ────────────────────────────────────────────────────────────

function MetricColumn({
  label,
  value,
  valueColor,
  small,
  onPress,
  colors,
}: {
  label: string
  value: string
  valueColor?: string
  small?: boolean
  onPress?: () => void
  colors: Colors
}) {
  const content = (
    <View style={styles.metricCol}>
      <Text
        style={[
          small ? styles.metricValueSm : styles.metricValue,
          { color: valueColor ?? colors.inkPrimary },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.inkMuted }]} numberOfLines={1}>
        {label}
      </Text>
      {onPress && (
        <Text style={[styles.metricHint, { color: colors.accent }]}>toca</Text>
      )}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.metricColTouch}>
        {content}
      </TouchableOpacity>
    )
  }
  return content
}

// ─── RPE color ────────────────────────────────────────────────────────────────

function rpeColor(rpe: number, colors: Colors): string {
  if (rpe <= 0) return colors.inkMuted
  if (rpe <= 4) return colors.green
  if (rpe <= 7) return colors.orange
  return colors.red
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
    totalElevationGain,
    backgroundActive,
    error,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
  } = useRunTracking()

  const [isIndoor, setIsIndoor] = useState(false)
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [userWeightKg, setUserWeightKg] = useState(70)
  const [rpe, setRpe] = useState(0)

  // Indoor pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!isIndoor || status !== 'active') return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [isIndoor, status, pulseAnim])

  // Fetch user weight for calorie estimation
  useEffect(() => {
    apiGet('/api/profile/')
      .then((p: any) => {
        const w = parseFloat(p?.peso)
        if (w > 0) setUserWeightKg(w)
      })
      .catch(() => {})
  }, [])

  // GPS fetch — skip entirely for indoor mode
  useEffect(() => {
    if (isIndoor) {
      setLocationReady(true)
      setDeviceLocation(null)
      return
    }
    let cancelled = false
    setLocationReady(false)
    async function fetchLocation() {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync()
        if (perm === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          if (!cancelled) {
            setDeviceLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
          }
        } else {
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
        // error de hardware — el mapa renderiza sin centrar
      } finally {
        if (!cancelled) setLocationReady(true)
      }
    }
    fetchLocation()
    return () => { cancelled = true }
  }, [isIndoor])

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

  // Show GPS/start errors
  useEffect(() => {
    if (error && status !== 'completed') {
      Alert.alert('Error', error)
    }
  }, [error, status])

  const inProgress = status === 'active' || status === 'paused'

  // Disclosure prominente de ubicación en segundo plano (requisito de Google Play).
  // Se muestra una sola vez, ANTES de que `startRun` solicite el permiso de
  // background. Si el usuario acepta, persistimos el consentimiento y arrancamos;
  // si lo rechaza, no arrancamos (puede usar modo interior sin GPS).
  async function handleStartRun() {
    try {
      const accepted = await AsyncStorage.getItem(BG_LOCATION_DISCLOSURE_KEY)
      if (accepted === 'true' || isIndoor) {
        startRun()
        return
      }
    } catch {
      // Si AsyncStorage falla, mostramos la disclosure igualmente (más seguro).
    }
    Alert.alert(
      'Ubicación en segundo plano',
      'Para registrar tu carrera al completo, Zyfit recopila tu ubicación (GPS) también cuando la app está en segundo plano o con la pantalla apagada. La ubicación se usa exclusivamente para trazar tu recorrido y calcular distancia, ritmo y desnivel. Puedes revocar este permiso cuando quieras desde los ajustes del sistema.',
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            await AsyncStorage.setItem(BG_LOCATION_DISCLOSURE_KEY, 'true').catch(() => {})
            startRun()
          },
        },
      ],
    )
  }

  function handleExit() {
    if (inProgress) {
      Alert.alert(
        'Detener entrenamiento',
        '¿Terminar y guardar?',
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Detener', style: 'destructive', onPress: () => stopRun() },
        ],
      )
    } else {
      router.back()
    }
  }

  function handleFinish() {
    Alert.alert(
      'Finalizar entrenamiento',
      '¿Terminar y guardar?',
      [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Finalizar', style: 'destructive', onPress: () => stopRun() },
      ],
    )
  }

  function handleRpeTap() {
    if (status !== 'active') return
    Alert.alert(
      'Esfuerzo percibido (RPE)',
      '¿Qué tan duro estás trabajando?',
      [
        { text: '😴  1-2 — Muy fácil',  onPress: () => setRpe(2)  },
        { text: '🙂  3-4 — Fácil',      onPress: () => setRpe(4)  },
        { text: '😐  5-6 — Moderado',   onPress: () => setRpe(6)  },
        { text: '😤  7-8 — Duro',       onPress: () => setRpe(8)  },
        { text: '🔥  9-10 — Máximo',    onPress: () => setRpe(10) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    )
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'active' || status === 'paused') { handleExit(); return true }
      return false
    })
    return () => sub.remove()
  }, [status])

  // ── Derived values ──────────────────────────────────────────────────────────
  const activeCoord   = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null
  const centerCoord   = activeCoord ?? deviceLocation
  const initialRegion = centerCoord
    ? { latitude: centerCoord.latitude, longitude: centerCoord.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }
    : null
  const polylineCoords = coordinates.map(c => ({ latitude: c.latitude, longitude: c.longitude }))
  const caloriesEstimated = estimateCalories(elapsedSeconds, userWeightKg, isIndoor)

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>

      {/* ── Map / Indoor background ── */}
      {isIndoor ? (
        // Indoor: dark background with centered large timer
        <View style={[styles.indoorBg, { backgroundColor: colors.bg }]}>
          <Animated.View style={[styles.indoorTimerWrap, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={[styles.indoorTimerLabel, { color: colors.inkMuted }]}>TIEMPO</Text>
            <Text style={[styles.indoorTimerValue, { color: colors.inkPrimary }]}>
              {formatDuration(elapsedSeconds)}
            </Text>
          </Animated.View>
          <View style={[styles.indoorBadge, { borderColor: colors.accent + '44', backgroundColor: colors.accent + '11' }]}>
            <Text style={[styles.indoorBadgeText, { color: colors.accent }]}>🏋️  INTERIOR</Text>
          </View>
        </View>
      ) : (
        <>
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
                <Polyline coordinates={polylineCoords} strokeColor={colors.accent} strokeWidth={4} />
              )}
            </MapView>
          )}
          {locationReady && !initialRegion && (
            <View style={[styles.mapLoading, { backgroundColor: colors.bg }]}>
              <Text style={[styles.mapLoadingText, { color: colors.inkMuted }]}>
                No se pudo obtener la ubicación.{'\n'}Activa el GPS e intenta de nuevo.
              </Text>
            </View>
          )}
        </>
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
        {status === 'active' && (
          <View style={[styles.bgBadge, backgroundActive ? styles.bgBadgeOn : styles.bgBadgeOff]}>
            <Text style={[styles.bgBadgeText, { color: colors.inkPrimary }]}>
              {isIndoor ? '🏋️ INT' : backgroundActive ? '📡 BG' : '📍 FG'}
            </Text>
          </View>
        )}
        {status === 'paused' && (
          <View style={[styles.bgBadge, styles.bgBadgeOff]}>
            <Text style={[styles.bgBadgeText, { color: colors.inkPrimary }]}>⏸ PAUSA</Text>
          </View>
        )}
        {!inProgress && <View style={styles.headerRight} />}
      </View>

      {/* ── Bottom panel ── */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 20, backgroundColor: colors.sheetBg, borderTopColor: colors.borderDefault }]}>

        {/* Mode toggle — only when idle */}
        {status === 'idle' && (
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                !isIndoor && { backgroundColor: colors.accent + '22', borderColor: colors.accent },
                isIndoor  && { backgroundColor: 'transparent', borderColor: colors.borderDefault },
              ]}
              onPress={() => setIsIndoor(false)}
              activeOpacity={0.75}
            >
              <Text style={[styles.modeBtnText, { color: !isIndoor ? colors.accent : colors.inkMuted }]}>
                🌿  EXTERIOR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                isIndoor  && { backgroundColor: colors.accent + '22', borderColor: colors.accent },
                !isIndoor && { backgroundColor: 'transparent', borderColor: colors.borderDefault },
              ]}
              onPress={() => setIsIndoor(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.modeBtnText, { color: isIndoor ? colors.accent : colors.inkMuted }]}>
                🏋️  INTERIOR
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── OUTDOOR metrics ── */}
        {!isIndoor && (
          <>
            {/* Row 1: primary */}
            <View style={styles.metricsRow}>
              <MetricColumn label="DISTANCIA" value={formatDistance(totalDistance)} colors={colors} />
              <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
              <MetricColumn label="TIEMPO"    value={formatDuration(elapsedSeconds)} colors={colors} />
              <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
              <MetricColumn label="RITMO"     value={formatPace(currentPace)}        colors={colors} />
            </View>
            {/* Row 2: secondary (always visible so layout doesn't jump) */}
            <View style={[styles.metricsRow, styles.metricsRowSm]}>
              <MetricColumn label="VELOCIDAD"  value={formatSpeed(currentPace)}               small colors={colors} />
              <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
              <MetricColumn label="CALORÍAS"   value={formatCalories(caloriesEstimated)}      small colors={colors} />
              <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
              <MetricColumn label="DESNIVEL +" value={formatElevation(totalElevationGain)}    small colors={colors} />
            </View>
          </>
        )}

        {/* ── INDOOR metrics ── */}
        {isIndoor && (
          <View style={styles.metricsRow}>
            <MetricColumn label="TIEMPO"    value={formatDuration(elapsedSeconds)}  colors={colors} />
            <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
            <MetricColumn label="CALORÍAS"  value={formatCalories(caloriesEstimated)} colors={colors} />
            <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
            <MetricColumn label="FC (bpm)"  value="--"                             colors={colors} />
            <View style={[styles.metricDivider, { backgroundColor: colors.borderDefault }]} />
            <MetricColumn
              label="RPE"
              value={rpe > 0 ? `${rpe}/10` : '--'}
              valueColor={rpeColor(rpe, colors)}
              onPress={status === 'active' ? handleRpeTap : undefined}
              colors={colors}
            />
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.btnWrap}>
          {status === 'idle' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.green }]}
              onPress={handleStartRun}
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
  { elementType: 'geometry',            stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'road', elementType: 'geometry',        stylers: [{ color: '#1f2937' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'water', elementType: 'geometry',       stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Indoor background
  indoorBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  indoorTimerWrap: {
    alignItems: 'center',
    gap: 8,
  },
  indoorTimerLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  indoorTimerValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 64,
    letterSpacing: -2,
    lineHeight: 70,
  },
  indoorBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  indoorBadgeText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Map loading
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapLoadingText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
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
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerRight: { width: 40 },

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
    paddingTop: 20,
    paddingHorizontal: 24,
  },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricsRowSm: {
    marginBottom: 16,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricColTouch: {
    flex: 1,
  },
  metricValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 27,
    textAlign: 'center',
  },
  metricValueSm: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    letterSpacing: -0.3,
    lineHeight: 20,
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
  },
  metricHint: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 36,
  },

  // Buttons
  btnWrap: { width: '100%' },
  actionBtn: {
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    letterSpacing: 1,
  },
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
  },

  // Background GPS badge
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
    letterSpacing: 1,
  },
})
