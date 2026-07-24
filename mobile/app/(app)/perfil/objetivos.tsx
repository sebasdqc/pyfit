import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, accentAlpha } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPatch, apiPost } from '../../../lib/api'
import { useTranslation } from '../../../lib/i18n'

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJETIVOS_LIST = [
  'Perder grasa', 'Ganar músculo', 'Rendimiento deportivo', 'Resistencia', 'Salud general',
]

// Label i18n por objetivo — el valor (id) que se guarda/envía al backend
// sigue siendo el string en español; solo se traduce el texto mostrado.
const OBJETIVO_LABELS: Record<string, string> = {
  'Perder grasa':          'obj_lose_fat',
  'Ganar músculo':         'obj_gain_muscle',
  'Rendimiento deportivo': 'obj_sport_performance',
  'Resistencia':           'obj_endurance',
  'Salud general':         'obj_general_health',
}

const OBJETIVO_TO_GOAL: Record<string, string> = {
  'Perder grasa':          'perdida_grasa',
  'Ganar músculo':         'hipertrofia',
  'Rendimiento deportivo': 'potencia',
  'Resistencia':           'salud',
  'Salud general':         'salud',
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ObjetivosScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [objetivos, setObjetivos] = useState<string[]>([])

  useEffect(() => {
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      setObjetivos(Array.isArray(data.objetivos_multiples) ? data.objetivos_multiples : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function toggleObjetivo(obj: string) {
    setObjetivos(prev => prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj])
    setIsDirty(true)
  }

  function goBack() {
    if (isDirty) {
      Alert.alert(
        t('dp_unsaved_title'),
        t('dp_unsaved_msg'),
        [
          { text: t('dp_unsaved_keep'), style: 'cancel' },
          { text: t('dp_unsaved_leave'), style: 'destructive', onPress: () => router.back() },
        ]
      )
      return
    }
    router.back()
  }

  async function save() {
    if (!fullProfile) return
    if (objetivos.length === 0) {
      Alert.alert(t('obj_select_at_least_one'))
      return
    }
    setSaving(true)
    try {
      // PRF: PATCH parcial — solo campos de esta pantalla (evita lost update).
      await apiPatch('/api/profile/', {
        objetivo: objetivos[0],
        objetivos_multiples: objetivos,
      })
      const goal = OBJETIVO_TO_GOAL[objetivos[0]]
      if (goal) {
        await apiPost('/api/training-cycle/', { goal })
      }
      setIsDirty(false)
      router.back()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('obj_save_error'))
    } finally { setSaving(false) }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('perfil_row_objectives')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>{t('common_loading')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>
              {t('obj_hint')}
            </Text>

            <View style={styles.objectivesGrid}>
              {OBJETIVOS_LIST.map(obj => {
                const active = objetivos.includes(obj)
                const rank = active ? objetivos.indexOf(obj) + 1 : null
                return (
                  <TouchableOpacity
                    key={obj}
                    style={[styles.objCard, active && styles.objCardActive]}
                    onPress={() => toggleObjetivo(obj)}
                    activeOpacity={0.7}
                  >
                    {rank === 1 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>{t('obj_primary_badge')}</Text>
                      </View>
                    )}
                    <Text style={[styles.objText, active && styles.objTextActive]}>{t(OBJETIVO_LABELS[obj] as any)}</Text>
                    {active && (
                      <View style={styles.checkCircle}>
                        <Text style={{ color: colors.accent, fontSize: 12, fontFamily: 'SpaceGrotesk-Bold' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (saving || objetivos.length === 0) && { opacity: 0.5 }]}
              onPress={save} disabled={saving || objetivos.length === 0} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? t('obj_saving') : t('obj_save_changes')}</Text>
            </TouchableOpacity>
          </>
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
    hint: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, lineHeight: 20, marginBottom: 20 },
    objectivesGrid: { gap: 10, marginBottom: 28 },
    objCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 18,
    },
    objCardActive: { borderColor: c.accent, backgroundColor: accentAlpha(c.accent, 0.08) },
    primaryBadge: {
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
      backgroundColor: accentAlpha(c.accent, 0.15),
    },
    primaryBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: c.accent, letterSpacing: 1, textTransform: 'uppercase' },
    objText: { flex: 1, color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    objTextActive: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold' },
    checkCircle: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: accentAlpha(c.accent, 0.15),
      borderWidth: 1, borderColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
