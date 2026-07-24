import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { LinearGradient } from 'expo-linear-gradient'
import { Redirect, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, accentAlpha, readableTextOn } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPatch, apiPost, localDateStr } from '../../../lib/api'

const DATE_LOCALE: Record<string, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR' }

function formatDate(d: Date, lang: string): string {
  return d.toLocaleDateString(DATE_LOCALE[lang] ?? 'es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CicloScreen() {
  const { colors } = useTheme()
  const { t, lang } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [usaCiclo, setUsaCiclo] = useState(false)
  const [duracion, setDuracion] = useState('28')
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null)
  const [showPicker, setShowPicker] = useState(false)

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

  useEffect(() => {
    Promise.all([
      apiGet('/api/profile/'),
      apiGet('/api/menstrual-cycle/').catch(() => null),
    ]).then(([prof, ciclo]) => {
      setFullProfile(prof)
      setUsaCiclo(prof.usa_ciclo_menstrual ?? false)
      if (ciclo) {
        if (ciclo.fecha_inicio)   setFechaInicio(new Date(ciclo.fecha_inicio + 'T00:00:00'))
        if (ciclo.duracion_ciclo) setDuracion(String(ciclo.duracion_ciclo))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!fullProfile) return
    if (usaCiclo && !fechaInicio) {
      Alert.alert(t('cic_alert_date_title'), t('cic_alert_date_msg'))
      return
    }
    // #11: validar la duración en vez de recortarla en silencio. Vacío = 28
    // (el placeholder lo muestra); un valor explícito fuera de 20–45 se avisa.
    let dur = 28
    if (usaCiclo && duracion.trim() !== '') {
      const parsed = parseInt(duracion, 10)
      if (isNaN(parsed) || parsed < 20 || parsed > 45) {
        Alert.alert(t('cic_alert_dur_title'), t('cic_alert_dur_msg'))
        return
      }
      dur = parsed
    }
    setSaving(true)
    try {
      // PRF: PATCH parcial — solo este campo (evita lost update).
      await apiPatch('/api/profile/', { usa_ciclo_menstrual: usaCiclo })
      if (usaCiclo && fechaInicio) {
        await apiPost('/api/menstrual-cycle/', {
          fecha_inicio: localDateStr(fechaInicio),
          duracion_ciclo: dur,
        })
      }
      setIsDirty(false)
      router.back()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('cic_save_error'))
    } finally { setSaving(false) }
  }

  // Pantalla accesible solo para sexo=femenino (gateado también en mi-cuenta.tsx,
  // pero esta pantalla es alcanzable por deep-link directo — no confiar solo en eso).
  if (!loading && fullProfile && fullProfile.sexo !== 'femenino') {
    return <Redirect href={'/(app)/perfil/mi-cuenta' as any} />
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
        <Text style={styles.headerTitle}>{t('perfil_row_cycle')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>{t('common_loading')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.description}>
              {t('cic_description')}
            </Text>

            {/* Toggle */}
            <TouchableOpacity style={styles.toggleRow} onPress={() => { setUsaCiclo(prev => !prev); setIsDirty(true) }} activeOpacity={0.7}>
              <View>
                <Text style={styles.toggleTitle}>{t('cic_toggle_title')}</Text>
                <Text style={styles.toggleSub}>
                  {usaCiclo ? t('cic_toggle_on') : t('cic_toggle_off')}
                </Text>
              </View>
              <View style={[styles.toggleSwitch, usaCiclo && styles.toggleSwitchOn]}>
                <View style={[styles.toggleKnob, usaCiclo && styles.toggleKnobOn]} />
              </View>
            </TouchableOpacity>

            {usaCiclo && (
              <>
                <Text style={styles.fieldLabel}>{t('cic_label_start')}</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                  <Text style={fechaInicio ? styles.inputText : styles.inputPlaceholder}>
                    {fechaInicio ? formatDate(fechaInicio, lang) : t('cic_select_date')}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>{t('cic_label_duration')}</Text>
                <TextInput
                  style={styles.input}
                  value={duracion}
                  onChangeText={txt => { setDuracion(txt.replace(/[^0-9]/g, '').slice(0, 2)); setIsDirty(true) }}
                  keyboardType="number-pad"
                  placeholder="28"
                  placeholderTextColor={colors.inkMuted}
                />

                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    🌙 {t('cic_info')}
                  </Text>
                </View>
              </>
            )}

            {showPicker && (
              <DateTimePicker
                value={fechaInicio ?? new Date()}
                mode="date"
                maximumDate={new Date()}
                onChange={(_e, d) => {
                  setShowPicker(Platform.OS === 'ios')
                  if (d) { setFechaInicio(d); setIsDirty(true) }
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={save} disabled={saving} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? t('cic_saving') : t('cic_save_changes')}</Text>
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
    description: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 22, marginBottom: 28 },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 18, marginBottom: 16,
    },
    toggleTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
    toggleSub: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, marginTop: 2 },
    toggleSwitch: {
      width: 48, height: 28, borderRadius: 14,
      backgroundColor: c.borderDefault,
      justifyContent: 'center', paddingHorizontal: 3,
    },
    toggleSwitchOn: { backgroundColor: c.accent },
    toggleKnob: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: c.white,
    },
    toggleKnobOn: { alignSelf: 'flex-end' },
    fieldLabel: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
    },
    input: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkPrimary,
    },
    inputText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkPrimary },
    inputPlaceholder: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkMuted },
    infoCard: {
      backgroundColor: accentAlpha(c.accent, 0.06),
      borderWidth: 1, borderColor: accentAlpha(c.accent, 0.2),
      borderRadius: 14, padding: 16, marginBottom: 24,
    },
    infoText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, lineHeight: 20 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: readableTextOn(c.accent), fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
