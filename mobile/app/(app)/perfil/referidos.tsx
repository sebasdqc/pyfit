import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReferidosScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referidos</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}>

        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 40 }}>🎁</Text>
        </View>

        <Text style={styles.title}>Invita a tus amigos</Text>
        <Text style={styles.description}>
          Pronto podrás compartir un código personal y conseguir beneficios cuando tus amigos comiencen a entrenar con Zyfit.
        </Text>

        {/* Coming soon badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PRÓXIMAMENTE</Text>
        </View>

        {/* Benefits preview */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Lo que viene</Text>
          {[
            'Código personal de referido',
            'Semana gratis por cada amigo que entrene',
            'Panel de seguimiento de tus referidos',
            'Recompensas en racha para ti y tus amigos',
          ].map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitDot}>·</Text>
              <Text style={styles.benefitText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => Linking.openURL('mailto:hola@pyfit.app?subject=Programa de referidos')}
          activeOpacity={0.85}>
          <Text style={styles.contactBtnText}>Quiero ser de los primeros</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, letterSpacing: -0.5, flex: 1 },
    iconCircle: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: 'rgba(79,140,255,0.1)',
      borderWidth: 1, borderColor: 'rgba(79,140,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
      marginTop: 24, marginBottom: 20,
    },
    title: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22, letterSpacing: -0.7, marginBottom: 12, textAlign: 'center',
    },
    description: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, lineHeight: 22, textAlign: 'center',
      marginBottom: 20, paddingHorizontal: 8,
    },
    badge: {
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
      backgroundColor: 'rgba(255,170,50,0.12)',
      borderWidth: 1, borderColor: 'rgba(255,170,50,0.3)',
      marginBottom: 32,
    },
    badgeText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: '#ffaa32', letterSpacing: 1.5, textTransform: 'uppercase',
    },
    benefitsCard: {
      width: '100%',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, padding: 20, gap: 10, marginBottom: 24,
    },
    benefitsTitle: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
    },
    benefitRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    benefitDot: { color: c.accent, fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, lineHeight: 22 },
    benefitText: { flex: 1, color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 22 },
    contactBtn: {
      width: '100%', backgroundColor: c.accent, borderRadius: 14,
      paddingVertical: 15, alignItems: 'center',
    },
    contactBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
