/**
 * Pantalla de búsqueda de dispositivos Bluetooth / wearables.
 *
 * Hoy no existe ningún SDK de emparejamiento BLE en la app (sin
 * react-native-ble-plx ni equivalente) ni un flujo de conexión real para
 * marcas como Polar/Suunto/Samsung. Apple Health y Garmin YA tienen su propio
 * flujo real (HealthKit / OAuth) en la pantalla anterior (`dispositivos.tsx`).
 * Por eso esta pantalla muestra el radar como cortesía visual y termina en un
 * estado honesto "todavía no disponible" — nunca simula un dispositivo
 * encontrado ni una conexión que no ocurrió.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
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
import { useTranslation } from '../../../lib/i18n'
import type { Colors } from '../../../lib/colors'
import { readableTextOn } from '../../../lib/colors'
import { useReduceMotion } from '../../../lib/useReduceMotion'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SCAN_TITLE_KEYS = ['bdv_scan_title_1', 'bdv_scan_title_2', 'bdv_scan_title_3'] as const
const SCAN_DURATION_MS = 3200   // tiempo de cortesía antes de mostrar el estado real

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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

// ─── Radar — anillos pulsantes ────────────────────────────────────────────────

function RadarRings({ color }: { color: string }) {
  const reduceMotion = useReduceMotion()
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]

  useEffect(() => {
    // Reduce-motion (WCAG 2.3.3): un anillo estático a mitad de camino en vez
    // del loop infinito de 3 anillos escaneando.
    if (reduceMotion) { rings.forEach(ring => ring.setValue(0.3)); return }
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
  }, [reduceMotion])

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

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function BuscarDispositivoScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [scanning, setScanning] = useState(true)
  const [titleIndex, setTitleIndex] = useState(0)
  const [dotIndex, setDotIndex] = useState(0)

  useEffect(() => {
    const done = setTimeout(() => setScanning(false), SCAN_DURATION_MS)
    return () => clearTimeout(done)
  }, [])

  useEffect(() => {
    if (!scanning) return
    const interval = setInterval(() => {
      setTitleIndex(prev => (prev + 1) % SCAN_TITLE_KEYS.length)
      setDotIndex(prev => (prev + 1) % 3)
    }, 900)
    return () => clearInterval(interval)
  }, [scanning])

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* Header */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.inkSecondary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('bdv_title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Zona de radar ── */}
        <View style={styles.radarZone}>
          {scanning && <RadarRings color={colors.green} />}
          <View style={[styles.centerCircle, { backgroundColor: `${colors.green}20`, borderColor: `${colors.green}50` }]}>
            <BluetoothIcon color={colors.green} size={24} />
          </View>
        </View>

        {scanning ? (
          <>
            <Text style={styles.scanTitle}>{t(SCAN_TITLE_KEYS[titleIndex])}</Text>
            <Text style={styles.scanSubtitle}>
              {t('bdv_scan_subtitle')}
            </Text>
            <View style={styles.dotsRow}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === dotIndex ? colors.green : colors.borderBright },
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.scanTitle}>{t('bdv_unavailable_title')}</Text>
            <Text style={styles.scanSubtitle}>
              {t('bdv_unavailable_msg_pre')}
              <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', color: colors.inkPrimary }}>Apple Health</Text>
              {t('bdv_unavailable_msg_post')}
            </Text>
          </>
        )}

        {/* ── Nota de privacidad ── */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            {t('bdv_privacy')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.green }]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>{t('common_back')}</Text>
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
      paddingHorizontal: 8, marginBottom: 16,
    },

    // Dots
    dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 32 },
    dot:     { width: 7, height: 7, borderRadius: 4 },

    // Privacy card
    privacyCard: {
      width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 16, marginBottom: 16, marginTop: 8,
    },
    privacyIcon: { fontSize: 18, marginTop: 1 },
    privacyText: {
      flex: 1, color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12, lineHeight: 18,
    },

    doneBtn: {
      width: '100%', borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    },
    doneBtnText: {
      color: readableTextOn(c.green), fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15, letterSpacing: -0.3,
    },
  })
}
