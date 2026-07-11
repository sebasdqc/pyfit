/**
 * Pantalla Dispositivos Conectados
 *
 * Muestra el estado de Apple Health (iOS) y Garmin (pendiente de aprobación).
 * Permite conectar, sincronizar manualmente y desconectar cada dispositivo.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiDelete, apiGet, apiPost } from '../../../lib/api'
import AppleHealthService from '../../../lib/appleHealth'
import type { Colors } from '../../../lib/colors'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviceState {
  status: 'connected' | 'disconnected'
  last_synced_at: string | null
  metrics: {
    hrv: number | null
    sleep_score: number | null
    resting_hr: number | null
    stress_level: number | null
    body_battery: number | null
  } | null
}

const DISCONNECTED: DeviceState = {
  status: 'disconnected',
  last_synced_at: null,
  metrics: null,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Nunca sincronizado'
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'Hace un momento'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH}h`
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function MetricPill({ label, value, color }: { label: string; value: string | null; color: string }) {
  const { colors } = useTheme()
  if (value === null) return null
  return (
    <View style={[metricPillStyle.pill, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <Text style={[metricPillStyle.label, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[metricPillStyle.value, { color }]}>{value}</Text>
    </View>
  )
}
const metricPillStyle = StyleSheet.create({
  pill: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 72 },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  value: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, letterSpacing: -0.3 },
})

// ─── Device Card ─────────────────────────────────────────────────────────────

interface DeviceCardProps {
  icon: string
  name: string
  description: string
  state: DeviceState
  loading: boolean
  syncing: boolean
  available: boolean          // false → no mostrar la tarjeta (Android para Apple Health)
  comingSoon?: boolean        // true → badge "Próximamente"
  onConnect: () => void
  onDisconnect: () => void
  onSync?: () => void
  styles: ReturnType<typeof makeStyles>
}

function DeviceCard({
  icon, name, description, state, loading, syncing,
  available, comingSoon, onConnect, onDisconnect, onSync, styles,
}: DeviceCardProps) {
  const { colors } = useTheme()

  if (!available) return null

  const connected = state.status === 'connected'
  const metrics = state.metrics

  return (
    <View style={styles.deviceCard}>
      {/* Header */}
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceIcon}>{icon}</Text>
        <View style={styles.deviceHeaderMid}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.deviceName}>{name}</Text>
            {comingSoon && (
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>PRÓXIMO</Text>
              </View>
            )}
            {connected && !comingSoon && (
              <View style={[styles.statusDot, { backgroundColor: colors.green }]} />
            )}
          </View>
          <Text style={styles.deviceDesc}>{description}</Text>
        </View>
      </View>

      {/* Métricas (solo si conectado y hay datos) */}
      {connected && metrics && (
        <View style={styles.metricsRow}>
          <MetricPill label="HRV" value={metrics.hrv ? `${Math.round(metrics.hrv)} ms` : null} color={colors.accent} />
          <MetricPill label="Sueño" value={metrics.sleep_score ? `${Math.round(metrics.sleep_score)}/100` : null} color={colors.cyan} />
          <MetricPill label="FC rep." value={metrics.resting_hr ? `${Math.round(metrics.resting_hr)} bpm` : null} color={colors.green} />
          <MetricPill label="Estrés" value={metrics.stress_level ? `${Math.round(metrics.stress_level)}/100` : null} color={colors.orange} />
        </View>
      )}

      {/* Footer */}
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 12 }} />
      ) : comingSoon ? (
        <Text style={styles.comingSoonText}>
          Disponible próximamente cuando obtengamos acceso al programa de partners de Garmin.
        </Text>
      ) : connected ? (
        <View style={styles.connectedFooter}>
          <Text style={styles.syncLabel}>{formatSyncTime(state.last_synced_at)}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {onSync && (
              <TouchableOpacity
                style={[styles.btnSecondary, syncing && { opacity: 0.5 }]}
                onPress={onSync}
                disabled={syncing}
                activeOpacity={0.7}
              >
                {syncing
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <Text style={styles.btnSecondaryText}>Sincronizar</Text>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.btnDanger}
              onPress={onDisconnect}
              activeOpacity={0.7}
            >
              <Text style={styles.btnDangerText}>Desconectar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.btnConnect} onPress={onConnect} activeOpacity={0.85}>
          <Text style={styles.btnConnectText}>Conectar {name}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DispositivosScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [ahAvailable, setAhAvailable]         = useState(false)
  const [ahState, setAhState]                  = useState<DeviceState>(DISCONNECTED)
  const [ahLoading, setAhLoading]              = useState(true)
  const [ahSyncing, setAhSyncing]              = useState(false)
  const [garminState, setGarminState]          = useState<DeviceState>(DISCONNECTED)
  const [garminLoading, setGarminLoading]      = useState(true)
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // ── Verificar disponibilidad de HealthKit ─────────────────────────────────
  useEffect(() => {
    AppleHealthService.isAvailable().then(setAhAvailable)
  }, [])

  // ── Cargar estados desde el backend ──────────────────────────────────────
  const fetchStates = useCallback(async () => {
    setAhLoading(true)
    setGarminLoading(true)
    try {
      const [ah, garmin] = await Promise.allSettled([
        apiGet('/api/integrations/apple-health/status/'),
        apiGet('/api/integrations/garmin/status/'),
      ])
      if (ah.status === 'fulfilled')     setAhState(ah.value)
      if (garmin.status === 'fulfilled') setGarminState(garmin.value)
    } catch {
      // fail silently
    } finally {
      setAhLoading(false)
      setGarminLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { fetchStates() }, [fetchStates]))

  // ── Apple Health — Conectar ───────────────────────────────────────────────
  async function handleAhConnect() {
    try {
      setAhLoading(true)
      await AppleHealthService.requestPermissions()
      await apiPost('/api/integrations/apple-health/connect/', {})
      // Sincronizar inmediatamente tras conectar
      await _doAhSync()
      await fetchStates()
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo conectar Apple Health.')
    } finally {
      setAhLoading(false)
    }
  }

  // ── Apple Health — Sincronizar ────────────────────────────────────────────
  async function _doAhSync() {
    const result = await AppleHealthService.syncData()
    if (!mountedRef.current) return
    setAhState(prev => ({ ...prev, last_synced_at: result.last_synced_at }))
    // Recargar métricas desde backend para reflejar los nuevos datos
    try {
      const fresh = await apiGet('/api/integrations/apple-health/status/')
      if (mountedRef.current) setAhState(fresh)
    } catch { /* ignore */ }
  }

  async function handleAhSync() {
    if (ahSyncing) return
    try {
      setAhSyncing(true)
      await _doAhSync()
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo sincronizar con Apple Health.')
    } finally {
      setAhSyncing(false)
    }
  }

  // ── Apple Health — Desconectar ────────────────────────────────────────────
  async function handleAhDisconnect() {
    Alert.alert(
      'Desconectar Apple Health',
      '¿Estás seguro? Tus datos de salud actuales se eliminarán de Zyfit. Puedes volver a conectar cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete('/api/integrations/apple-health/')
              setAhState(DISCONNECTED)
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo desconectar.')
            }
          },
        },
      ],
    )
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* ── Header ── */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.inkSecondary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Dispositivos</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionDesc}>
          Conecta tus wearables para que Zyfit use tus datos de sueño, HRV y recuperación
          al diseñar cada sesión.
        </Text>

        {/* ── Apple Health ── */}
        <DeviceCard
          icon="🍎"
          name="Apple Health"
          description="Lee HRV, sueño y FC directamente desde tu iPhone o Apple Watch."
          state={ahState}
          loading={ahLoading}
          syncing={ahSyncing}
          available={Platform.OS === 'ios' && ahAvailable}
          onConnect={handleAhConnect}
          onDisconnect={handleAhDisconnect}
          onSync={handleAhSync}
          styles={styles}
        />

        {/* La integración nativa con HealthKit todavía no está implementada
            (ver lib/appleHealth.ts) — el aviso es honesto sobre el estado del
            desarrollo, no sugiere un problema del dispositivo del usuario. */}
        {Platform.OS === 'ios' && !ahAvailable && !ahLoading && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              La integración con Apple Health está en desarrollo — todavía no
              disponible en esta versión, independientemente de tu dispositivo.
            </Text>
          </View>
        )}

        {/* ── Garmin ── */}
        <DeviceCard
          icon="⌚"
          name="Garmin"
          description="Sincroniza métricas de tu reloj Garmin: HRV, sueño, estrés y Body Battery."
          state={garminState}
          loading={garminLoading}
          syncing={false}
          available={true}
          comingSoon={true}
          onConnect={() => {}}
          onDisconnect={() => {}}
          styles={styles}
        />

        {/* ── Buscar nuevo dispositivo ── */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push('/(app)/perfil/buscar-dispositivo')}
          activeOpacity={0.8}
        >
          <Text style={styles.scanButtonText}>Buscar dispositivo Bluetooth</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root:          { flex: 1, backgroundColor: c.bg },
    gradient:      { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
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
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
    sectionDesc: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 20, marginBottom: 24,
    },

    // Device card
    deviceCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 22, padding: 20, marginBottom: 16,
    },
    deviceHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
    deviceIcon:      { fontSize: 28, lineHeight: 34 },
    deviceHeaderMid: { flex: 1, gap: 4 },
    deviceName: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16, letterSpacing: -0.3,
    },
    deviceDesc: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 19,
    },
    statusDot:       { width: 7, height: 7, borderRadius: 4, marginTop: 2 },

    // Metrics
    metricsRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
    },

    // Buttons
    btnConnect: {
      backgroundColor: c.accent, borderRadius: 14,
      paddingVertical: 13, alignItems: 'center',
    },
    btnConnectText: {
      color: c.white, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14, letterSpacing: -0.2,
    },
    connectedFooter: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', gap: 10,
    },
    syncLabel: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10, letterSpacing: 0.3, flex: 1,
    },
    btnSecondary: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
      borderWidth: 1, borderColor: c.accent,
      minWidth: 90, alignItems: 'center', justifyContent: 'center',
      height: 34,
    },
    btnSecondaryText: {
      color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13,
    },
    btnDanger: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
      borderWidth: 1, borderColor: `${c.red}60`,
      backgroundColor: `${c.red}10`,
    },
    btnDangerText: {
      color: c.red, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13,
    },

    // Coming soon
    soonBadge: {
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
      backgroundColor: 'rgba(255,170,50,0.15)',
      borderWidth: 1, borderColor: 'rgba(255,170,50,0.4)',
    },
    soonBadgeText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 7,
      color: '#b45309', letterSpacing: 0.8,
    },
    comingSoonText: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12, lineHeight: 18, fontStyle: 'italic',
    },

    // Scan button
    scanButton: {
      borderRadius: 16, paddingVertical: 14, alignItems: 'center',
      borderWidth: 1.5, borderColor: c.accent,
      marginBottom: 16,
    },
    scanButtonText: {
      color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14, letterSpacing: -0.2,
    },

    // Info box
    infoBox: {
      backgroundColor: c.cardBg, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: c.borderDefault, marginBottom: 16,
    },
    infoText: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 20,
    },
  })
}
