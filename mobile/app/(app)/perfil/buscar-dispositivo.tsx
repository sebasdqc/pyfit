/**
 * Pantalla de búsqueda y conexión de dispositivos Bluetooth / wearables.
 *
 * Vista 1 — Escaneo activo: radar pulsante, lista de dispositivos que aparecen
 *            progresivamente, botones "Conectar" por fila.
 * Vista 2 — Éxito: resumen del dispositivo conectado con permisos autorizados.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../lib/theme'
import { apiPost } from '../../../lib/api'
import AppleHealthService from '../../../lib/appleHealth'
import type { Colors } from '../../../lib/colors'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SCAN_TITLES = ['Buscando dispositivos...', 'Escaneando Bluetooth...', 'Detectando señales...']

// Dispositivos simulados (en producción, reemplazar con callbacks de SDK)
const SIMULATED_DEVICES: DeviceInfo[] = [
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    subtitle: 'Series 9 / Ultra 2',
    brand: 'apple',
    signalBars: 3,
    brandColor: '#e8efff',
    brandBg: 'rgba(232,239,255,0.12)',
    icon: '⌚',
  },
  {
    id: 'galaxy-watch',
    name: 'Galaxy Watch',
    subtitle: 'Galaxy Watch 6',
    brand: 'samsung',
    signalBars: 2,
    brandColor: '#6ce5ff',
    brandBg: 'rgba(108,229,255,0.12)',
    icon: '🟦',
  },
  {
    id: 'polar',
    name: 'Polar',
    subtitle: 'Polar Vantage V3',
    brand: 'polar',
    signalBars: 2,
    brandColor: '#ff4444',
    brandBg: 'rgba(255,68,68,0.12)',
    icon: '🔴',
  },
  {
    id: 'suunto',
    name: 'Suunto',
    subtitle: 'Suunto Race S',
    brand: 'suunto',
    signalBars: 1,
    brandColor: '#ffaa32',
    brandBg: 'rgba(255,170,50,0.12)',
    icon: '🟠',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    subtitle: 'Forerunner 965',
    brand: 'garmin',
    signalBars: 3,
    brandColor: '#32c896',
    brandBg: 'rgba(50,200,150,0.12)',
    icon: '🟢',
  },
]

// Permisos mostrados por dispositivo tras conectar
const DEVICE_PERMISSIONS: Record<string, string[]> = {
  'apple-watch':   ['Sueño', 'HRV', 'FC en reposo', 'Nivel de estrés'],
  'galaxy-watch':  ['Sueño', 'FC en reposo', 'Nivel de estrés'],
  'polar':         ['FC en sesión', 'Nightly Recharge', 'Zonas de entrenamiento'],
  'suunto':        ['FC en sesión', 'Sueño', 'Índice de recuperación'],
  'garmin':        ['HRV', 'Nivel de estrés', 'Sueño', 'Body Battery'],
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviceInfo {
  id: string
  name: string
  subtitle: string
  brand: string
  signalBars: number   // 1–3 barras activas
  brandColor: string
  brandBg: string
  icon: string
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M21 21l-4.35-4.35M16.5 10.5a6 6 0 11-12 0 6 6 0 0112 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function BluetoothIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 7L17 17l-5 5V2l5 5L6.5 17" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function CheckIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Radar — anillos pulsantes ────────────────────────────────────────────────

function RadarRings({ color }: { color: string }) {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]

  useEffect(() => {
    const delays = [0, 600, 1200]
    const anims = rings.map((ring, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delays[i]),
          Animated.parallel([
            Animated.timing(ring, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    )
    anims.forEach(a => a.start())
    return () => anims.forEach(a => a.stop())
  }, [])

  return (
    <View style={radarStyles.container}>
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            radarStyles.ring,
            {
              borderColor: `${color}40`,
              opacity: ring.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.7, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
            },
          ]}
        />
      ))}
    </View>
  )
}

const radarStyles = StyleSheet.create({
  container: {
    position: 'absolute', width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, borderWidth: 1.5,
  },
})

// ─── Indicador de señal ───────────────────────────────────────────────────────

function SignalBars({ active, color, mutedColor }: { active: number; color: string; mutedColor: string }) {
  const heights = [8, 12, 16, 20]
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 4, height: h, borderRadius: 2,
            backgroundColor: i < active ? color : mutedColor,
          }}
        />
      ))}
    </View>
  )
}

// ─── Fila de dispositivo ──────────────────────────────────────────────────────

interface DeviceRowProps {
  device: DeviceInfo
  status: ConnectionStatus
  disabled: boolean
  onConnect: () => void
  colors: Colors
  styles: ReturnType<typeof makeStyles>
  fadeAnim: Animated.Value
}

function DeviceRow({ device, status, disabled, onConnect, colors, styles, fadeAnim }: DeviceRowProps) {
  const isConnecting = status === 'connecting'
  const isConnected  = status === 'connected'
  const isError      = status === 'error'

  return (
    <Animated.View
      style={[
        styles.deviceRow,
        isConnecting && { backgroundColor: `${colors.green}10` },
        isConnected  && { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}30` },
        { opacity: fadeAnim },
        { transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      {/* Ícono de marca */}
      <View style={[styles.brandIcon, { backgroundColor: device.brandBg }]}>
        <Text style={{ fontSize: 16 }}>{device.icon}</Text>
      </View>

      {/* Nombre y subtítulo */}
      <View style={{ flex: 1 }}>
        <Text style={styles.deviceName}>{device.name}</Text>
        <Text style={styles.deviceSubtitle}>{device.subtitle}</Text>
      </View>

      {/* Señal */}
      {!isConnected && !isError && (
        <SignalBars active={device.signalBars} color={colors.green} mutedColor={colors.borderBright} />
      )}

      {/* Estado / botón */}
      {isConnecting ? (
        <View style={styles.connectingSlot}>
          <ActivityIndicator size="small" color={colors.green} />
        </View>
      ) : isConnected ? (
        <View style={[styles.connectedBadge, { backgroundColor: `${colors.green}20`, borderColor: `${colors.green}50` }]}>
          <CheckIcon color={colors.green} size={12} />
          <Text style={[styles.connectedBadgeText, { color: colors.green }]}>Conectado</Text>
        </View>
      ) : isError ? (
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.errorText, { color: colors.red }]}>Error</Text>
          <TouchableOpacity onPress={onConnect} activeOpacity={0.7}>
            <Text style={[styles.retryText, { color: colors.accent }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.connectBtn, disabled && { opacity: 0.4 }]}
          onPress={onConnect}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text style={styles.connectBtnText}>Conectar</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

// ─── Vista 2 — Éxito ──────────────────────────────────────────────────────────

interface SuccessViewProps {
  device: DeviceInfo
  onBack: () => void
  onDone: () => void
  colors: Colors
  styles: ReturnType<typeof makeStyles>
  insetTop: number
}

function SuccessView({ device, onBack, onDone, colors, styles, insetTop }: SuccessViewProps) {
  const permissions = DEVICE_PERMISSIONS[device.id] ?? []
  const successAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(successAnim, { toValue: 1, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true }).start()
  }, [])

  return (
    <Animated.View style={{ flex: 1, opacity: successAnim }}>
      {/* Header */}
      <View style={[styles.navBar, { paddingTop: insetTop + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.inkSecondary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Dispositivo conectado</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Icono de check grande */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={[styles.successCircle, { backgroundColor: `${colors.green}20`, borderColor: `${colors.green}40` }]}>
            <CheckIcon color={colors.green} size={40} />
          </View>
          <Text style={styles.successTitle}>{device.name} conectado</Text>
          <Text style={styles.successSubtitle}>
            Tu entrenador ya puede leer datos de este dispositivo cada mañana para mejorar tus rutinas.
          </Text>
        </View>

        {/* Card de permisos */}
        <View style={styles.permissionsCard}>
          <Text style={styles.permissionsHeader}>Permisos autorizados</Text>
          {permissions.map((perm) => (
            <View key={perm} style={styles.permissionRow}>
              <View style={[styles.permCheckCircle, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}35` }]}>
                <CheckIcon color={colors.green} size={10} />
              </View>
              <Text style={styles.permissionName}>{perm}</Text>
              <Text style={styles.permissionNote}>Lectura solamente</Text>
            </View>
          ))}
        </View>

        {/* Botón listo */}
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.green }]} onPress={onDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Listo</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  )
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function BuscarDispositivoScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  // ── Estado global de vista ────────────────────────────────────────────────
  const [view, setView] = useState<'scan' | 'success'>('scan')
  const [connectedDevice, setConnectedDevice] = useState<DeviceInfo | null>(null)

  // ── Estado de escaneo ────────────────────────────────────────────────────
  const [visibleDevices, setVisibleDevices] = useState<DeviceInfo[]>([])
  const [titleIndex, setTitleIndex] = useState(0)
  const [dotIndex, setDotIndex] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({})
  const [connectingId, setConnectingId] = useState<string | null>(null)

  // Animaciones de fade por fila de dispositivo
  const rowAnims = useRef<Record<string, Animated.Value>>({})
  function getRowAnim(id: string) {
    if (!rowAnims.current[id]) {
      rowAnims.current[id] = new Animated.Value(0)
    }
    return rowAnims.current[id]
  }

  // ── Aparición progresiva de dispositivos (simulación) ───────────────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    SIMULATED_DEVICES.forEach((dev, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleDevices(prev => [...prev, dev])
          Animated.timing(getRowAnim(dev.id), {
            toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true,
          }).start()
        }, 1200 + i * 800),
      )
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  // ── Rotación de título y puntos ──────────────────────────────────────────
  useEffect(() => {
    if (view !== 'scan' || connectingId) return
    const interval = setInterval(() => {
      setTitleIndex(prev => (prev + 1) % SCAN_TITLES.length)
      setDotIndex(prev => (prev + 1) % 3)
    }, 900)
    return () => clearInterval(interval)
  }, [view, connectingId])

  // ── Lógica de conexión ───────────────────────────────────────────────────
  const handleConnect = useCallback(async (device: DeviceInfo) => {
    if (connectingId) return
    setConnectingId(device.id)
    setConnectionStatus(prev => ({ ...prev, [device.id]: 'connecting' }))

    try {
      // ── Paso real de conexión según tipo de dispositivo ─────────────────
      if (device.id === 'apple-watch' && Platform.OS === 'ios') {
        await AppleHealthService.requestPermissions()
        await apiPost('/api/integrations/apple-health/connect/', {})
        // Sincronizar datos iniciales en background (no bloqueante)
        AppleHealthService.syncData().catch(() => {})
      } else {
        // Garmin / Polar / Samsung / Suunto: simulación hasta que los SDKs
        // OAuth estén disponibles — reemplazar con el flujo real de cada uno.
        await new Promise<void>(resolve => setTimeout(resolve, 1800))
        await apiPost(`/api/integrations/${device.id}/connect/`, {}).catch(() => {
          // Si el endpoint no existe aún, no bloquear la UI
        })
      }

      setConnectionStatus(prev => ({ ...prev, [device.id]: 'connected' }))

      // Transición a Vista 2 tras 700 ms
      setTimeout(() => {
        setConnectedDevice(device)
        setView('success')
      }, 700)
    } catch (e: any) {
      setConnectionStatus(prev => ({ ...prev, [device.id]: 'error' }))
      setConnectingId(null)
      Alert.alert('Error al conectar', e?.message ?? 'No se pudo establecer la conexión. Inténtalo de nuevo.')
    }
  }, [connectingId])

  // ── Volver a la Vista 1 reiniciando el escaneo ───────────────────────────
  function resetScan() {
    setView('scan')
    setConnectedDevice(null)
    setConnectingId(null)
    setConnectionStatus({})
    setVisibleDevices([])
    Object.keys(rowAnims.current).forEach(id => rowAnims.current[id].setValue(0))
    // Re-lanzar aparición progresiva
    SIMULATED_DEVICES.forEach((dev, i) => {
      setTimeout(() => {
        setVisibleDevices(prev => (prev.find(d => d.id === dev.id) ? prev : [...prev, dev]))
        Animated.timing(getRowAnim(dev.id), {
          toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true,
        }).start()
      }, 600 + i * 800)
    })
  }

  // ── Vista 2 ──────────────────────────────────────────────────────────────
  if (view === 'success' && connectedDevice) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <SuccessView
          device={connectedDevice}
          onBack={resetScan}
          onDone={() => router.back()}
          colors={colors}
          styles={styles}
          insetTop={insets.top}
        />
      </View>
    )
  }

  // ── Vista 1 — Escaneo ────────────────────────────────────────────────────
  const scanTitle = connectingId
    ? 'Conectando...'
    : SCAN_TITLES[titleIndex]

  const scanSubtitle = connectingId
    ? 'Estableciendo comunicación con el dispositivo.'
    : 'Asegúrate de que tu dispositivo esté encendido y cerca.'

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* Header */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.inkSecondary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Buscar dispositivo</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Zona de radar ── */}
        <View style={styles.radarZone}>
          <RadarRings color={colors.green} />
          {/* Círculo central con ícono Bluetooth */}
          <View style={[styles.centerCircle, { backgroundColor: `${colors.green}20`, borderColor: `${colors.green}50` }]}>
            <BluetoothIcon color={colors.green} size={24} />
          </View>
        </View>

        {/* Título y subtítulo */}
        <Text style={styles.scanTitle}>{scanTitle}</Text>
        <Text style={styles.scanSubtitle}>{scanSubtitle}</Text>

        {/* Tres puntos animados */}
        {!connectingId && (
          <View style={styles.dotsRow}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === dotIndex ? colors.green : colors.borderBright,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* ── Lista de dispositivos ── */}
        {visibleDevices.length > 0 && (
          <View style={styles.deviceListSection}>
            <Text style={styles.sectionLabel}>Dispositivos encontrados</Text>
            <View style={styles.deviceListCard}>
              {visibleDevices.map((device, index) => (
                <React.Fragment key={device.id}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />}
                  <DeviceRow
                    device={device}
                    status={connectionStatus[device.id] ?? 'idle'}
                    disabled={!!connectingId && connectingId !== device.id}
                    onConnect={() => handleConnect(device)}
                    colors={colors}
                    styles={styles}
                    fadeAnim={getRowAnim(device.id)}
                  />
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* ── Nota de privacidad ── */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Zyfit usa los datos de tu dispositivo internamente para personalizar tus rutinas. No los compartimos con terceros.
          </Text>
        </View>

        {/* ── Botón de ayuda ── */}
        <TouchableOpacity
          style={styles.helpBtn}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              'No encuentro mi dispositivo',
              '1. Asegúrate de que el Bluetooth del teléfono esté activado.\n\n2. Abre la app del reloj y confirma que está encendido y en modo visible.\n\n3. Mantén el reloj cerca del teléfono (menos de 1 metro).\n\n4. Si el dispositivo ya estaba emparejado con otro teléfono, desvinculalo primero desde la app del fabricante.\n\n5. Reinicia el Bluetooth del teléfono y vuelve a intentarlo.',
              [{ text: 'Entendido', style: 'cancel' }],
            )
          }
        >
          <View style={{ marginRight: 8 }}>
            <SearchIcon color={colors.inkMuted} />
          </View>
          <Text style={styles.helpBtnText}>No encuentro mi dispositivo</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root:      { flex: 1, backgroundColor: c.bg },
    gradient:  { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
    navBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingBottom: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    navTitle: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 17, letterSpacing: -0.4,
    },
    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 12, alignItems: 'center' },

    // Radar
    radarZone: {
      width: 220, height: 220,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 24,
    },
    centerCircle: {
      width: 64, height: 64, borderRadius: 32,
      borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },

    // Scan text
    scanTitle: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 17, letterSpacing: -0.3, textAlign: 'center', marginBottom: 8,
    },
    scanSubtitle: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 19, textAlign: 'center',
      paddingHorizontal: 24, marginBottom: 16,
    },

    // Dots
    dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 32 },
    dot:     { width: 7, height: 7, borderRadius: 4 },

    // Device list
    deviceListSection: { width: '100%', marginBottom: 20 },
    sectionLabel: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase',
      marginBottom: 10,
    },
    deviceListCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, overflow: 'hidden',
    },
    deviceRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    divider:     { height: 1, marginHorizontal: 16 },
    brandIcon: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    deviceName: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14, letterSpacing: -0.2,
    },
    deviceSubtitle: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
    },
    connectingSlot: { width: 72, alignItems: 'center' },
    connectedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 10, borderWidth: 1,
    },
    connectedBadgeText: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 11, letterSpacing: -0.1,
    },
    errorText:  { color: c.red, fontFamily: 'SpaceGrotesk-Medium', fontSize: 11 },
    retryText:  { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 12 },
    connectBtn: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
      borderWidth: 1.5, borderColor: c.green,
    },
    connectBtnText: {
      color: c.green, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 12, letterSpacing: -0.1,
    },

    // Privacy card
    privacyCard: {
      width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 16, marginBottom: 16,
    },
    privacyIcon: { fontSize: 18, marginTop: 1 },
    privacyText: {
      flex: 1, color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12, lineHeight: 18,
    },

    // Help button
    helpBtn: {
      width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 13, borderRadius: 14,
      borderWidth: 1, borderColor: c.borderBright,
    },
    helpBtnText: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13, letterSpacing: -0.1,
    },

    // ── Vista 2 — Éxito ──
    successCircle: {
      width: 100, height: 100, borderRadius: 50,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
    },
    successTitle: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22, letterSpacing: -0.5, textAlign: 'center', marginBottom: 10,
    },
    successSubtitle: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, lineHeight: 21, textAlign: 'center', paddingHorizontal: 12,
    },
    permissionsCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 20, marginBottom: 28, width: '100%',
    },
    permissionsHeader: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13, letterSpacing: -0.2, marginBottom: 16,
    },
    permissionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: c.borderDefault,
    },
    permCheckCircle: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    permissionName: {
      flex: 1, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13, letterSpacing: -0.1,
    },
    permissionNote: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase',
    },
    doneBtn: {
      borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    },
    doneBtnText: {
      color: '#fff', fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15, letterSpacing: -0.3,
    },
  })
}
