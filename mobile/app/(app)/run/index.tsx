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
import { router, useLocalSearchParams } from 'expo-router'
import { useRunTracking } from '../../../hooks/useRunTracking'
import { isIndoorFromMode, isTrailFromParam } from '../../../lib/runMode'
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
import { Colors, readableTextOn } from '../../../lib/colors'
import { useReduceMotion } from '../../../lib/useReduceMotion'
import { BgLocationDisclosure } from '../../../components/BgLocationDisclosure'
import { completePlannedRun, getRunSessionToday } from '../../../lib/runningApi'
import { expandirPasos, progresoPaso, pasoCompletado, type Paso } from '../../../lib/runSteps'
import * as Haptics from 'expo-haptics'
import { useKeepAwake } from 'expo-keep-awake'

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

// Formatea segundos/km como "M:SS".
function mmss(s: number): string {
  const x = Math.max(0, Math.round(s))
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`
}

// Color del bloque en curso — sigue el código de fases del producto
// (calentamiento naranja, principal azul, vuelta a la calma verde).
function pasoColor(paso: Paso, colors: Colors): string {
  if (paso.tipo === 'calentamiento') return colors.orange
  if (paso.tipo === 'enfriamiento') return colors.green
  if (paso.tipo === 'recuperacion') return colors.inkMuted
  return colors.accent
}

// Cuánto falta para cerrar el bloque, en su propia unidad (metros o tiempo).
function restanteTexto(paso: Paso, distanciaEnPasoM: number, tiempoEnPasoS: number): string {
  if (paso.metaDistanciaM) {
    const falta = Math.max(0, paso.metaDistanciaM - distanciaEnPasoM)
    return falta >= 1000
      ? `Faltan ${(falta / 1000).toFixed(2)} km de ${(paso.metaDistanciaM / 1000).toFixed(2)} km`
      : `Faltan ${Math.round(falta)} m de ${Math.round(paso.metaDistanciaM)} m`
  }
  if (paso.metaDuracionS) {
    const falta = Math.max(0, paso.metaDuracionS - tiempoEnPasoS)
    return `Faltan ${mmss(falta)} de ${mmss(paso.metaDuracionS)}`
  }
  return ''
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RunScreen() {
  useKeepAwake() // la pantalla no debe apagarse durante la carrera
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const reduceMotion = useReduceMotion()
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
    stopSyncFailed,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
  } = useRunTracking()

  // El modo interior/exterior viene del check-in (pantalla anterior) vía el
  // parámetro `modo`. Es fijo durante la sesión: no se puede cambiar aquí.
  const { modo, planned, trail } = useLocalSearchParams<{ modo?: string; planned?: string; trail?: string }>()
  const [isIndoor] = useState(() => isIndoorFromMode(modo))
  // Trail Running (siempre exteriores) llega del check-in vía `?trail=1`. Fijo
  // durante la sesión; se envía al crear la RunSession para el card "TRAIL RUNNING".
  const [isTrail] = useState(() => isTrailFromParam(trail))
  // Guía de la sesión inteligente (presente solo si venimos de una PlannedRunSession).
  // `pasos` es la sesión desplegada en bloques ejecutables (ver lib/runSteps.ts);
  // `pasoIdx` es el bloque en curso y `pasoOffset` guarda distancia/tiempo
  // acumulados al empezarlo, para medir el avance DENTRO del paso.
  const [pasos, setPasos] = useState<Paso[]>([])
  const [pasoIdx, setPasoIdx] = useState(0)
  const [pasoOffset, setPasoOffset] = useState({ distanciaM: 0, tiempoS: 0 })
  const [zonaSesion, setZonaSesion] = useState('')
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [userWeightKg, setUserWeightKg] = useState(70)
  const [rpe, setRpe] = useState(0)
  const [disclosureVisible, setDisclosureVisible] = useState(false)

  // Indoor pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!isIndoor || status !== 'active') return
    // Reduce-motion (WCAG 2.3.3): sin el pulso en loop.
    if (reduceMotion) { pulseAnim.setValue(1); return }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [isIndoor, status, pulseAnim, reduceMotion])

  // Fetch user weight for calorie estimation
  useEffect(() => {
    apiGet('/api/profile/')
      .then((p: any) => {
        const w = parseFloat(p?.peso)
        if (w > 0) setUserWeightKg(w)
      })
      .catch(() => {})
  }, [])

  // Cargar la sesión inteligente y desplegarla en pasos ejecutables. Solo si
  // llegamos con ?planned=<id>. El Free Run normal no la usa.
  useEffect(() => {
    if (!planned) return
    getRunSessionToday()
      .then((d: any) => {
        const expandidos = expandirPasos(d?.estructura_fases?.segmentos)
        if (!expandidos.length) return
        setPasos(expandidos)
        setZonaSesion(d?.respuesta_ia?.zona_principal || d?.zona_principal || '')
      })
      .catch(() => {})
  }, [planned])

  // ── Guía paso a paso ───────────────────────────────────────────────────────
  const pasoActual: Paso | null = pasos[pasoIdx] ?? null
  const pasoSiguiente: Paso | null = pasos[pasoIdx + 1] ?? null
  const sesionGuiadaCompleta = pasos.length > 0 && pasoIdx >= pasos.length
  // Avance DENTRO del paso en curso = total acumulado − lo que ya había al empezarlo.
  const distanciaEnPaso = Math.max(0, totalDistance - pasoOffset.distanciaM)
  const tiempoEnPaso = Math.max(0, elapsedSeconds - pasoOffset.tiempoS)
  const progresoActual = pasoActual ? progresoPaso(pasoActual, distanciaEnPaso, tiempoEnPaso) : 0

  // Cierra el paso en curso y arranca el siguiente desde los totales de AHORA.
  // Sirve tanto al avance automático como al botón de los pasos manuales.
  const avanzarPaso = React.useCallback(() => {
    setPasoOffset({ distanciaM: totalDistance, tiempoS: elapsedSeconds })
    setPasoIdx(i => i + 1)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [totalDistance, elapsedSeconds])

  // Avance automático al cumplirse la meta del paso. Solo con la carrera en
  // marcha: en pausa el reloj no corre y no debe consumirse el bloque.
  useEffect(() => {
    if (status !== 'active' || !pasoActual) return
    if (pasoCompletado(pasoActual, distanciaEnPaso, tiempoEnPaso)) avanzarPaso()
  }, [status, pasoActual, distanciaEnPaso, tiempoEnPaso, avanzarPaso])

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
        // F6: si era una sesión inteligente, vincula la RunSession a la
        // PlannedRunSession (cierra el loop de readiness/umbral). Fire-and-forget:
        // el enlace es server-side y no debe bloquear la navegación al resumen.
        const pid = Number(planned)
        if (planned && !Number.isNaN(pid)) {
          completePlannedRun(pid, sessionId).catch(() => {})
        }
        router.replace(`/(app)/run/resumen/${sessionId}`)
      } else {
        router.replace('/(app)/dashboard')
      }
    }
  }, [status, sessionId, planned])

  // Show GPS/start errors
  useEffect(() => {
    if (error && status !== 'completed') {
      Alert.alert('Error', error)
    }
  }, [error, status])

  // Avisar si no se pudo sincronizar el final de la carrera (tras reintentar) —
  // se navega al resumen igual, pero el usuario debe saber que algunos datos
  // finales podrían faltar, en vez de festejar en silencio.
  useEffect(() => {
    if (status === 'completed' && stopSyncFailed) {
      Alert.alert(
        'No pudimos sincronizar el final de tu carrera',
        'Tu carrera se detuvo, pero algunos datos finales podrían no haberse guardado por un problema de conexión.',
      )
    }
  }, [status, stopSyncFailed])

  // Mostrar el aviso de ubicación automáticamente 1.5 s después de entrar a la
  // pantalla (solo en exterior y si el usuario no lo aceptó antes). Evita tener
  // que pulsar EMPEZAR para que aparezca; al aceptar, la carrera arranca sola.
  useEffect(() => {
    if (isIndoor) return
    let cancelled = false
    const t = setTimeout(async () => {
      let accepted: string | null = null
      try {
        accepted = await AsyncStorage.getItem(BG_LOCATION_DISCLOSURE_KEY)
      } catch {}
      if (!cancelled && accepted !== 'true') setDisclosureVisible(true)
    }, 1500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [isIndoor])

  const inProgress = status === 'active' || status === 'paused'

  // Disclosure prominente de ubicación en segundo plano (requisito de Google Play).
  // Se muestra una sola vez, ANTES de que `startRun` solicite el permiso de
  // background. Si el usuario acepta, persistimos el consentimiento y arrancamos;
  // si lo rechaza, no arrancamos (puede usar modo interior sin GPS).
  async function handleStartRun() {
    try {
      const accepted = await AsyncStorage.getItem(BG_LOCATION_DISCLOSURE_KEY)
      if (accepted === 'true' || isIndoor) {
        startRun(isTrail)
        return
      }
    } catch {
      // Si AsyncStorage falla, mostramos la disclosure igualmente (más seguro).
    }
    setDisclosureVisible(true)
  }

  // Aceptar el aviso: persistimos el consentimiento (basta mostrarlo una vez) y
  // arrancamos la carrera, que es quien solicita el permiso de ubicación.
  async function handleDisclosureAccept() {
    setDisclosureVisible(false)
    await AsyncStorage.setItem(BG_LOCATION_DISCLOSURE_KEY, 'true').catch(() => {})
    startRun(isTrail)
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
      handleAbandon()
    }
  }

  // Abandona el Free Run cuando aún no ha empezado (status idle). Llega aquí por
  // router.replace desde el check-in, así que volvemos al inicio de forma
  // explícita (no dependemos del back stack) para que el usuario pueda elegir
  // otro entrenamiento, p. ej. pesas.
  function handleAbandon() {
    router.replace('/(app)/dashboard')
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

  // Estado de ritmo en vivo vs el objetivo DEL PASO EN CURSO (solo exterior).
  let paceStatus: { label: string; color: string } | null = null
  if (inProgress && !isIndoor && pasoActual?.objetivo.paceRange && currentPace > 0) {
    const [lo, hi] = pasoActual.objetivo.paceRange
    if (currentPace < lo) paceStatus = { label: 'MUY RÁPIDO', color: colors.red }
    else if (currentPace > hi) paceStatus = { label: 'MUY LENTO', color: colors.orange }
    else paceStatus = { label: 'EN ZONA', color: colors.green }
  }

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
          accessibilityRole="button"
          accessibilityLabel="Volver"
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

        {/* El modo (interior/exterior) se hereda del check-in y se muestra como
            etiqueta fija — ya no es seleccionable aquí. */}
        {status === 'idle' && (
          <View style={styles.modePill}>
            <Text style={[styles.modePillText, { color: colors.inkSecondary }]}>
              {isIndoor ? '🏋️  INTERIOR' : '🌿  EXTERIOR'}
            </Text>
          </View>
        )}

        {/* Guía paso a paso de la sesión inteligente: bloque en curso, su avance,
            los objetivos de ESE bloque y qué viene después. */}
        {pasoActual && (
          <View style={{
            borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.glassBg,
            borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
          }}>
            {/* Cabecera: nombre del bloque + estado de ritmo en vivo. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{
                fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 1,
                color: pasoColor(pasoActual, colors), flex: 1,
              }} numberOfLines={1}>
                {pasoActual.etiqueta.toUpperCase()}
                {zonaSesion && pasoActual.tipo === 'trabajo' ? `  ·  ${zonaSesion}` : ''}
              </Text>
              {paceStatus && (
                <View style={{
                  borderWidth: 1, borderColor: paceStatus.color,
                  borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 11, color: paceStatus.color }}>
                    {paceStatus.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Avance del bloque: barra + cuánto falta. Los pasos manuales no
                tienen contra qué medirse, así que muestran su botón de cierre. */}
            {pasoActual.manual ? (
              <TouchableOpacity
                onPress={avanzarPaso}
                activeOpacity={0.85}
                style={{
                  borderWidth: 1, borderColor: colors.borderBright, borderRadius: 10,
                  paddingVertical: 9, alignItems: 'center', marginBottom: 8,
                }}>
                <Text style={{ fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: colors.accent }}>
                  Listo — siguiente bloque
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 8 }}>
                <View style={{
                  height: 6, borderRadius: 999, overflow: 'hidden',
                  backgroundColor: colors.borderDefault, marginBottom: 5,
                }}>
                  <View style={{
                    width: `${Math.round(progresoActual * 100)}%`, height: '100%',
                    borderRadius: 999, backgroundColor: pasoColor(pasoActual, colors),
                  }} />
                </View>
                <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: colors.inkMuted }}>
                  {restanteTexto(pasoActual, distanciaEnPaso, tiempoEnPaso)}
                </Text>
              </View>
            )}

            {/* Objetivos del bloque. RPE siempre; ritmo y FC solo si el motor
                pudo derivarlos (en cold-start no hay umbral todavía). */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              {!isIndoor && pasoActual.objetivo.paceRange && (
                <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: colors.inkPrimary }}>
                  {mmss(pasoActual.objetivo.paceRange[0])}–{mmss(pasoActual.objetivo.paceRange[1])} /km
                </Text>
              )}
              {pasoActual.objetivo.hrRange && (
                <Text style={{ fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: colors.red }}>
                  {pasoActual.objetivo.hrRange[0]}–{pasoActual.objetivo.hrRange[1]} ppm
                </Text>
              )}
              {pasoActual.objetivo.rpe > 0 && (
                <Text style={{ fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: colors.inkSecondary }}>
                  RPE {pasoActual.objetivo.rpe}
                </Text>
              )}
            </View>

            {pasoSiguiente && (
              <Text style={{
                fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: colors.inkMuted, marginTop: 8,
              }} numberOfLines={1}>
                Luego: {pasoSiguiente.etiqueta}
              </Text>
            )}
          </View>
        )}

        {/* Sesión guiada terminada: la carrera puede seguir, pero ya no hay
            bloques que prescribir. */}
        {sesionGuiadaCompleta && (
          <View style={{
            borderWidth: 1, borderColor: colors.green, backgroundColor: colors.glassBg,
            borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
          }}>
            <Text style={{
              fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 1, color: colors.green,
            }}>
              SESIÓN COMPLETADA
            </Text>
            <Text style={{
              fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: colors.inkMuted, marginTop: 5,
            }}>
              Cumpliste todos los bloques. Puedes seguir a ritmo libre o finalizar.
            </Text>
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
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.green }]}
                onPress={handleStartRun}
                activeOpacity={0.85}
              >
                <Text style={[styles.actionBtnText, { color: readableTextOn(colors.green) }]}>EMPEZAR</Text>
              </TouchableOpacity>
              {/* Salida explícita por si el usuario eligió Free Run por error y
                  prefiere otro entrenamiento. Como aún no empezó, no hay datos
                  que perder: sale directo al inicio. */}
              <TouchableOpacity
                style={styles.abandonBtn}
                onPress={handleAbandon}
                activeOpacity={0.7}
              >
                <Text style={[styles.abandonBtnText, { color: colors.inkMuted }]}>ABANDONAR</Text>
              </TouchableOpacity>
            </>
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
                  <Text style={[styles.actionBtnText, { color: readableTextOn(colors.green) }]}>REANUDAR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.rowBtn, { backgroundColor: colors.red }]}
                onPress={handleFinish}
                activeOpacity={0.85}
              >
                <Text style={[styles.actionBtnText, { color: readableTextOn(colors.red) }]}>FINALIZAR</Text>
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

      {/* Aviso prominente de ubicación en segundo plano (requisito de Google Play).
          Se muestra una sola vez, antes de que `startRun` solicite el permiso. */}
      <BgLocationDisclosure
        visible={disclosureVisible}
        onAccept={handleDisclosureAccept}
        onDismiss={() => setDisclosureVisible(false)}
      />
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

  // Mode pill — etiqueta fija (heredada del check-in), no seleccionable
  modePill: {
    alignSelf: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 50,
    marginBottom: 16,
  },
  modePillText: {
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
  abandonBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonBtnText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
