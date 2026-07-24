import React, { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, accentAlpha, readableTextOn } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPatch } from '../../../lib/api'
import { COUNTRIES, normalizeCountry } from '../../../lib/countries'
import { useUnits } from '../../../lib/units'
import { useTranslation } from '../../../lib/i18n'

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTRES = [
  { k: 'bajo', labelKey: 'onboarding_estres_bajo' },
  { k: 'moderado', labelKey: 'onboarding_estres_moderado' },
  { k: 'alto', labelKey: 'onboarding_estres_alto' },
] as const
const TRABAJOS = [
  { k: 'sedentario', labelKey: 'onboarding_trabajo_sedentario' },
  { k: 'mixto', labelKey: 'onboarding_trabajo_mixto' },
  { k: 'activo', labelKey: 'onboarding_trabajo_activo' },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function capitalizeFirst(s: string) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.sectionLabel}>{text}</Text>
}

function Chip({ label, active, onPress, styles }: {
  label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles>
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function GlassInput({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, styles }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string
  keyboardType?: any; multiline?: boolean; styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.fieldGroup}>
      <SectionLabel text={label} styles={styles} />
      <TextInput
        value={value} onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.inkMuted}
        keyboardType={keyboardType}
        multiline={multiline} numberOfLines={multiline ? 3 : 1}
        style={[styles.input, multiline && styles.inputMulti]}
        autoCapitalize="none" autoCorrect={false}
      />
    </View>
  )
}

function ReadOnlyField({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.fieldGroup}>
      <SectionLabel text={label} styles={styles} />
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{value || '—'}</Text>
        <Text style={{ fontSize: 12 }}>🔒</Text>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DatosPersonalesScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const { weightLabel, heightLabel, toInputWeight, toInputHeight, fromInputWeight, fromInputHeight } = useUnits()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [pais, setPais] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [nivelEstres, setNivelEstres] = useState('')
  const [tipoTrabajo, setTipoTrabajo] = useState('')
  const [experiencia, setExperiencia] = useState('')

  // Helpers que marcan el formulario como modificado
  const mark = (setter: (v: string) => void) => (v: string) => { setter(v); setIsDirty(true) }
  const markChip = (setter: (v: string) => void) => (v: string) => { setter(v); setIsDirty(true) }

  React.useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])

  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [countryQuery, setCountryQuery] = useState('')

  const filteredCountries = useMemo(() => {
    const q = normalizeCountry(countryQuery.trim())
    if (!q) return COUNTRIES
    return COUNTRIES.filter(cn => normalizeCountry(cn).includes(q))
  }, [countryQuery])

  useEffect(() => {
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      setNombre(data.nombre ?? '')
      setUsuario(data.usuario ?? '')
      setPais(data.pais ?? '')
      setPeso(data.peso ? toInputWeight(Number(data.peso)) : '')
      setAltura(data.altura ? toInputHeight(Number(data.altura)) : '')
      setNivelEstres(data.nivel_estres ?? '')
      setTipoTrabajo(data.tipo_trabajo ?? '')
      setExperiencia(data.experiencia_deportiva ?? '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!fullProfile) return
    if (usuario && !/^[a-z0-9_]{3,20}$/.test(usuario)) {
      Alert.alert(t('dp_usuario_invalido_title'), t('dp_usuario_invalido_msg'))
      return
    }
    // Convertir a métrico antes de validar y guardar
    const pesoMetric = fromInputWeight(peso)
    const alturaMetric = fromInputHeight(altura)
    const p = Number(pesoMetric.replace(',', '.'))
    if (peso && (isNaN(p) || p < 30 || p > 300)) {
      Alert.alert(t('dp_peso_invalido_title'), weightLabel === 'lb'
        ? t('dp_peso_invalido_msg_lb')
        : t('dp_peso_invalido_msg_kg'))
      return
    }
    const a = Number(alturaMetric.replace(',', '.'))
    if (altura && (isNaN(a) || a < 100 || a > 250)) {
      Alert.alert(t('dp_altura_invalido_title'), heightLabel === 'in'
        ? t('dp_altura_invalido_msg_in')
        : t('dp_altura_invalido_msg_cm'))
      return
    }
    setSaving(true)
    try {
      // PRF: PATCH parcial — solo los campos de esta pantalla, para no pisar
      // datos editados en otras pantallas (lost update).
      await apiPatch('/api/profile/', {
        nombre, usuario, pais, peso: pesoMetric, altura: alturaMetric,
        nivel_estres: nivelEstres,
        tipo_trabajo: tipoTrabajo,
        experiencia_deportiva: experiencia,
      })
      setIsDirty(false)
      setSaved(true)
      savedTimer.current = setTimeout(() => { setSaved(false); router.back() }, 1400)
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('dp_no_se_pudo_guardar'))
    } finally { setSaving(false) }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => {
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
          }}
          style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('perfil_row_personal')}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {loading ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>
                {t('common_loading')}
              </Text>
            </View>
          ) : (
            <>
              {/* Read-only fields */}
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <ReadOnlyField label={t('onboarding_birth_label')}
                    value={formatDate(fullProfile?.fecha_nacimiento ?? '')} styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <ReadOnlyField label={t('dp_sexo_label')}
                    value={capitalizeFirst(fullProfile?.sexo ?? '')} styles={styles} />
                </View>
              </View>

              <ReadOnlyField label={t('dp_correo_label')} value={fullProfile?.email ?? ''} styles={styles} />

              <GlassInput label={t('dp_nombre_label')} value={nombre} onChangeText={mark(setNombre)}
                placeholder={t('dp_nombre_placeholder')} styles={styles} />

              {/* Usuario — handle público para el footer de las tarjetas compartibles */}
              <View style={styles.fieldGroup}>
                <SectionLabel text={t('dp_usuario_label')} styles={styles} />
                <View style={[styles.input, styles.usuarioRow]}>
                  <Text style={styles.usuarioAt}>@</Text>
                  <TextInput
                    value={usuario}
                    onChangeText={(v) => { setUsuario(v.toLowerCase().replace(/[^a-z0-9_]/g, '')); setIsDirty(true) }}
                    placeholder={t('dp_usuario_placeholder')}
                    placeholderTextColor={colors.inkMuted}
                    style={styles.usuarioInput}
                    autoCapitalize="none" autoCorrect={false}
                    maxLength={20}
                  />
                </View>
                <Text style={styles.fieldHint}>{t('dp_usuario_hint')}</Text>
              </View>

              {/* País — selector buscable (mismo catálogo que el onboarding) */}
              <View style={styles.fieldGroup}>
                <SectionLabel text={t('onboarding_country_label')} styles={styles} />
                <TouchableOpacity style={[styles.input, styles.inputTouch]} activeOpacity={0.7}
                  onPress={() => { setCountryQuery(''); setShowCountryPicker(true) }}>
                  <Text style={pais ? styles.inputText : styles.inputPlaceholder}>
                    {pais || t('onboarding_country_placeholder')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <GlassInput label={`${t('onboarding_weight_label')} (${weightLabel})`} value={peso} onChangeText={mark(setPeso)}
                    placeholder={weightLabel === 'lb' ? '154' : '70'} keyboardType="decimal-pad" styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <GlassInput label={`${t('onboarding_height_label')} (${heightLabel})`} value={altura} onChangeText={mark(setAltura)}
                    placeholder={heightLabel === 'in' ? '69' : '175'} keyboardType="numeric" styles={styles} />
                </View>
              </View>

              <SectionLabel text={t('dp_estres_label')} styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {ESTRES.map(({ k, labelKey }) => (
                  <Chip key={k} label={t(labelKey)} active={nivelEstres === k}
                    onPress={() => markChip(setNivelEstres)(k)} styles={styles} />
                ))}
              </View>

              <SectionLabel text={t('onboarding_trabajo_label')} styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {TRABAJOS.map(({ k, labelKey }) => (
                  <Chip key={k} label={t(labelKey)} active={tipoTrabajo === k}
                    onPress={() => markChip(setTipoTrabajo)(k)} styles={styles} />
                ))}
              </View>

              <GlassInput label={t('dp_experiencia_label')} value={experiencia}
                onChangeText={mark(setExperiencia)}
                placeholder={t('dp_experiencia_placeholder')}
                multiline styles={styles} />

              {saved && (
                <View style={styles.savedToast}>
                  <Text style={styles.savedToastText}>✓ {t('dp_guardado')}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, (saving || saved) && { opacity: 0.5 }]}
                onPress={save} disabled={saving || saved} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{saving ? t('dp_guardando') : t('dp_guardar_cambios')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker */}
      <Modal transparent animationType="slide" visible={showCountryPicker}
        onRequestClose={() => setShowCountryPicker(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCountryPicker(false)} />
          <View style={styles.countrySheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.sheetCancel}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{t('onboarding_country_picker_title')}</Text>
              <View style={{ width: 64 }} />
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <TextInput style={styles.countrySearch}
                placeholder={t('onboarding_country_search_placeholder')} placeholderTextColor={colors.inkMuted}
                value={countryQuery} onChangeText={setCountryQuery}
                autoCorrect={false} autoCapitalize="none" />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.countryList}
              renderItem={({ item }) => {
                const on = pais === item
                return (
                  <TouchableOpacity style={styles.countryRow} activeOpacity={0.7}
                    onPress={() => { setPais(item); setShowCountryPicker(false) }}>
                    <Text style={[styles.countryRowText, on && styles.countryRowTextOn]}>{item}</Text>
                    {on && <Text style={styles.countryCheck}>✓</Text>}
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={<Text style={styles.countryEmpty}>{t('onboarding_country_empty')}</Text>}
            />
          </View>
        </View>
      </Modal>
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
    fieldGroup: { marginBottom: 16 },
    sectionLabel: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
    input: { backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
    inputTouch: { justifyContent: 'center', minHeight: 44 },
    inputText: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    inputPlaceholder: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    usuarioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 },
    usuarioAt: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, marginRight: 2 },
    usuarioInput: { flex: 1, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, paddingVertical: 12 },
    fieldHint: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, marginTop: 6 },

    // Country picker
    sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    countrySheet: {
      backgroundColor: c.sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderWidth: 1, borderColor: c.borderDefault, paddingBottom: 24, height: '72%',
    },
    sheetHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: c.borderDefault,
    },
    sheetCancel: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkMuted },
    sheetTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary },
    countrySearch: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    },
    countryList: { flex: 1, paddingHorizontal: 16, marginTop: 6 },
    countryRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderDefault,
    },
    countryRowText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: c.inkPrimary },
    countryRowTextOn: { color: c.accent },
    countryCheck: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: c.accent },
    countryEmpty: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: c.inkMuted,
      textAlign: 'center', paddingVertical: 30,
    },
    rowFields: { flexDirection: 'row' },
    readOnlyBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    readOnlyText: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: accentAlpha(c.accent, 0.12) },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: readableTextOn(c.accent), fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
    savedToast: {
      backgroundColor: 'rgba(50,200,150,0.15)', borderWidth: 1, borderColor: 'rgba(50,200,150,0.4)',
      borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 8, marginBottom: 4,
    },
    savedToastText: { color: c.green, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14 },
  })
}
