import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation, type ScalarKey } from '../../../lib/i18n'

// ─── Data ─────────────────────────────────────────────────────────────────────

const TERMINOS: { terminoKey: ScalarKey; definicionKey: ScalarKey }[] = [
  { terminoKey: 'glo_descanso_activo_term', definicionKey: 'glo_descanso_activo_def' },
  { terminoKey: 'glo_fase_folicular_term', definicionKey: 'glo_fase_folicular_def' },
  { terminoKey: 'glo_fase_lutea_term', definicionKey: 'glo_fase_lutea_def' },
  { terminoKey: 'glo_fatiga_neuromuscular_term', definicionKey: 'glo_fatiga_neuromuscular_def' },
  { terminoKey: 'glo_frecuencia_reserva_term', definicionKey: 'glo_frecuencia_reserva_def' },
  { terminoKey: 'glo_hiit_term', definicionKey: 'glo_hiit_def' },
  { terminoKey: 'glo_periodizacion_term', definicionKey: 'glo_periodizacion_def' },
  { terminoKey: 'glo_rpe_term', definicionKey: 'glo_rpe_def' },
  { terminoKey: 'glo_sobrecarga_term', definicionKey: 'glo_sobrecarga_def' },
  { terminoKey: 'glo_volumen_term', definicionKey: 'glo_volumen_def' },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GlosarioScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TERMINOS
    return TERMINOS.filter(item =>
      t(item.terminoKey).toLowerCase().includes(q) || t(item.definicionKey).toLowerCase().includes(q)
    )
  }, [query, t])

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
        <Text style={styles.headerTitle}>{t('glo_header')}</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={styles.searchIcon}>
          <Path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            stroke={colors.inkMuted} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('glo_search_placeholder')}
          placeholderTextColor={colors.inkMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>{t('glo_no_results_prefix')} "{query}"</Text>
        ) : (
          filtered.map((item, i) => (
            <View key={item.terminoKey} style={[styles.termCard, i === filtered.length - 1 && { marginBottom: 0 }]}>
              <Text style={styles.termNombre}>{t(item.terminoKey)}</Text>
              <Text style={styles.termDef}>{t(item.definicionKey)}</Text>
            </View>
          ))
        )}
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
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginHorizontal: 20, marginVertical: 12,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    },
    searchIcon: { flexShrink: 0 },
    searchInput: {
      flex: 1, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    },
    empty: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, textAlign: 'center', marginTop: 32,
    },
    termCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 18, marginBottom: 10, gap: 8,
    },
    termNombre: {
      color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15, letterSpacing: -0.3,
    },
    termDef: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 21,
    },
  })
}
