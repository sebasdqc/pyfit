import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'

// ─── Data ─────────────────────────────────────────────────────────────────────
// `fuente` (autores/año) no se traduce — es una cita bibliográfica, se mantiene igual en los 4 idiomas.

const PRINCIPIOS = [
  {
    id: 'rpe',
    tituloKey: 'cie_rpe_title', textoKey: 'cie_rpe_text',
    fuente: 'Borg, 1982 · Zourdos et al., 2016',
    color: '#4f8cff',
  },
  {
    id: 'periodizacion',
    tituloKey: 'cie_periodizacion_title', textoKey: 'cie_periodizacion_text',
    fuente: 'Schoenfeld, 2010 · Haff & Triplett, 2016',
    color: '#6ce5ff',
  },
  {
    id: 'fatiga',
    tituloKey: 'cie_fatiga_title', textoKey: 'cie_fatiga_text',
    fuente: 'Meeusen et al., 2013',
    color: '#ffaa32',
  },
  {
    id: 'cortisol',
    tituloKey: 'cie_cortisol_title', textoKey: 'cie_cortisol_text',
    fuente: 'Kraemer & Ratamess, 2005',
    color: '#ff4444',
  },
  {
    id: 'ciclo',
    tituloKey: 'cie_ciclo_title', textoKey: 'cie_ciclo_text',
    fuente: 'Janse de Jonge, 2003 · McNulty et al., 2020',
    color: '#c084fc',
  },
  {
    id: 'sueno',
    tituloKey: 'cie_sueno_title', textoKey: 'cie_sueno_text',
    fuente: 'Dattilo et al., 2011 · Fullagar et al., 2015',
    color: '#32c896',
  },
] as const

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CienciaScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
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
        <Text style={styles.headerTitle}>{t('cie_header')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {t('cie_intro')}
        </Text>

        {PRINCIPIOS.map((p, i) => (
          <View key={p.id} style={[styles.card, i === PRINCIPIOS.length - 1 && { marginBottom: 0 }]}>
            <View style={[styles.cardBar, { backgroundColor: p.color }]} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{t(p.tituloKey)}</Text>
              <Text style={styles.cardText}>{t(p.textoKey)}</Text>
              <View style={styles.fuenteRow}>
                <Text style={styles.fuenteLabel}>{t('cie_fuente_label')}</Text>
                <Text style={styles.fuenteText}>{p.fuente}</Text>
              </View>
            </View>
          </View>
        ))}
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
    intro: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, lineHeight: 22, marginBottom: 24,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, overflow: 'hidden', marginBottom: 14,
    },
    cardBar: { width: 3 },
    cardContent: { flex: 1, padding: 18, gap: 10 },
    cardTitle: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15, letterSpacing: -0.3,
    },
    cardText: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 21,
    },
    fuenteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    fuenteLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 8,
      color: c.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase',
    },
    fuenteText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.inkMuted, letterSpacing: 0.2, flex: 1,
    },
  })
}
