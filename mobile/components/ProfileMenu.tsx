/**
 * ProfileMenu — piezas compartidas para las pantallas de menú del Perfil.
 *
 * `MenuScreen` arma el andamiaje estándar (fondo + gradiente, navbar con botón
 * atrás y el nombre de la sección en la parte superior, y una card que envuelve
 * las filas con divisores automáticos). `MenuRow` es la fila tappable (icono +
 * título + subtítulo/badge opcional + chevron) que navega a cada sub-pantalla.
 *
 * Centraliza el look de las filas que antes vivían sueltas en perfil/index.tsx,
 * para que mi-cuenta / datos-entrenamiento / tus-dispositivos / evidencia
 * reutilicen exactamente el mismo estilo.
 */
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../lib/theme'
import type { Colors } from '../lib/colors'

// ─── Icons ──────────────────────────────────────────────────────────────────

export function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Menu Row ─────────────────────────────────────────────────────────────────

export function MenuRow({ icon, title, subtitle, badge, onPress }: {
  icon: string; title: string; subtitle?: string; badge?: string; onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowMid}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight color={colors.inkMuted} />
    </TouchableOpacity>
  )
}

// ─── Menu Screen scaffold ───────────────────────────────────────────────────

export function MenuScreen({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  // toArray descarta null/false (filas condicionales), así los divisores caen bien.
  const items = React.Children.toArray(children)
  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* ── Header: botón atrás + nombre de la sección ── */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft color={colors.inkSecondary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length > 0 && (
          <View style={styles.card}>
            {items.map((child, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.divider} />}
                {child}
              </React.Fragment>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
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
      flex: 1, textAlign: 'center',
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 17, letterSpacing: -0.4,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
    card: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, overflow: 'hidden',
    },
    divider: { height: 1, backgroundColor: c.borderDefault, marginHorizontal: 18 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
    rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    rowMid: { flex: 1, gap: 2 },
    rowTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    rowSub: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, letterSpacing: -0.1 },
    badge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
      backgroundColor: 'rgba(255,170,50,0.22)',
      borderWidth: 1, borderColor: 'rgba(255,170,50,0.5)',
    },
    badgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#b45309', letterSpacing: 0.5 },
  })
}
