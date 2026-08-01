import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, accentAlpha, readableTextOn } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPatch } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const NIVELES = [
  { k: 'principiante', labelKey: 'ent_nivel_principiante' },
  { k: 'intermedio', labelKey: 'ent_nivel_intermedio' },
  { k: 'avanzado', labelKey: 'ent_nivel_avanzado' },
] as const
const ESTILOS_COACHING = [
  { k: 'directo', labelKey: 'onboarding_coach_directo_label' },
  { k: 'calido', labelKey: 'onboarding_coach_calido_label' },
  { k: 'tecnico', labelKey: 'onboarding_coach_tecnico_label' },
] as const
const HORARIOS = [
  { k: 'mañana', labelKey: 'ent_horario_manana' },
  { k: 'tarde', labelKey: 'ent_horario_tarde' },
  { k: 'noche', labelKey: 'ent_horario_noche' },
] as const
const DIAS = [1, 2, 3, 4, 5, 6, 7]

// Deja solo dígitos + separador decimal (el decimal-pad de Android igual admite letras).
const onlyNum = (v: string) => v.replace(/[^0-9.,]/g, '')

// "" → null (el 1RM es opcional); valida que sea numérico y esté en rango 1–500 kg.
// Lanza Error con mensaje legible si es inválido — evita mandar '' o texto al DecimalField.
// Los textos llegan ya traducidos desde el componente (parseRM es module-level, sin acceso a `t`).
function parseRM(raw: string, label: string, invalidMsg: string, tooHighMsg: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label}: ${invalidMsg}`)
  if (n > 500) throw new Error(`${label}: ${tooHighMsg}`)
  return n
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

function GlassInput({ label, value, onChangeText, placeholder, keyboardType = 'default', styles }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string
  keyboardType?: any; styles: ReturnType<typeof makeStyles>
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
        style={styles.input}
        autoCapitalize="none" autoCorrect={false}
      />
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EntrenamientoScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [nivel, setNivel] = useState('principiante')
  const [estiloCoaching, setEstiloCoaching] = useState('')
  const [diasSemana, setDiasSemana] = useState(3)
  const [horario, setHorario] = useState('')
  const [rmSentadilla, setRmSentadilla] = useState('')
  const [rmMuerto, setRmMuerto] = useState('')
  const [rmBanca, setRmBanca] = useState('')
  const [rmHombro, setRmHombro] = useState('')

  // Helpers que marcan el formulario como modificado
  const mark = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setIsDirty(true) }

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
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      setNivel(data.nivel ?? 'principiante')
      setEstiloCoaching(data.estilo_coaching ?? '')
      setDiasSemana(data.dias_semana ?? 3)
      setHorario(data.horario_preferido ?? '')
      setRmSentadilla(data.rm_sentadilla ? String(data.rm_sentadilla) : '')
      setRmMuerto(data.rm_peso_muerto ? String(data.rm_peso_muerto) : '')
      setRmBanca(data.rm_press_banca ? String(data.rm_press_banca) : '')
      setRmHombro(data.rm_press_hombro ? String(data.rm_press_hombro) : '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!fullProfile) return

    // Validar RMs ANTES de tocar el estado de guardado: número válido, rango y
    // vacío → null. Si algo falla, avisar y no enviar (evita un 400 mudo).
    let rmS: number | null, rmM: number | null, rmB: number | null, rmH: number | null
    const invalidMsg = t('ent_rm_invalid')
    const tooHighMsg = t('ent_rm_too_high')
    try {
      rmS = parseRM(rmSentadilla, t('ent_rm_squat'), invalidMsg, tooHighMsg)
      rmM = parseRM(rmMuerto, t('ent_rm_deadlift'), invalidMsg, tooHighMsg)
      rmB = parseRM(rmBanca, t('ent_rm_bench'), invalidMsg, tooHighMsg)
      rmH = parseRM(rmHombro, t('ent_rm_shoulder'), invalidMsg, tooHighMsg)
    } catch (e: any) {
      Alert.alert(t('ent_rm_alert_title'), e.message)
      return
    }

    setSaving(true)
    try {
      // PRF-3: sincronizar nivel_experiencia con el nivel editado — el motor
      // prioriza nivel_experiencia para el techo de dificultad técnica, así que
      // sin esto el cambio manual de nivel no afectaría la selección de ejercicios.
      const nivelExp = ({ principiante: 2, intermedio: 3, avanzado: 4 } as Record<string, number>)[nivel] ?? 3
      // PRF: PATCH parcial — solo campos de esta pantalla (evita lost update).
      await apiPatch('/api/profile/', {
        nivel, nivel_experiencia: nivelExp, estilo_coaching: estiloCoaching,
        dias_semana: diasSemana, horario_preferido: horario,
        rm_sentadilla: rmS, rm_peso_muerto: rmM,
        rm_press_banca: rmB, rm_press_hombro: rmH,
      })
      setIsDirty(false)
      router.back()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('ent_save_error'))
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
        <Text style={styles.headerTitle}>{t('perfil_row_training')}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {loading ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>{t('common_loading')}</Text>
            </View>
          ) : (
            <>
              <SectionLabel text={t('ent_level')} styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {NIVELES.map(({ k, labelKey }) => (
                  <Chip key={k} label={t(labelKey)} active={nivel === k} onPress={() => mark(setNivel)(k)} styles={styles} />
                ))}
              </View>

              <SectionLabel text={t('ent_coaching_style')} styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {ESTILOS_COACHING.map(({ k, labelKey }) => (
                  <Chip key={k} label={t(labelKey)} active={estiloCoaching === k} onPress={() => mark(setEstiloCoaching)(k)} styles={styles} />
                ))}
              </View>

              <SectionLabel text={t('ent_days_per_week')} styles={styles} />
              <View style={[styles.daysRow, { marginBottom: 20 }]}>
                {DIAS.map(d => (
                  <TouchableOpacity key={d} style={[styles.dayBtn, diasSemana === d && styles.dayBtnActive]}
                    onPress={() => mark(setDiasSemana)(d)} activeOpacity={0.7}>
                    <Text style={[styles.dayBtnText, diasSemana === d && styles.dayBtnTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionLabel text={t('ent_preferred_time')} styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {HORARIOS.map(({ k, labelKey }) => (
                  <Chip key={k} label={t(labelKey)} active={horario === k} onPress={() => mark(setHorario)(k)} styles={styles} />
                ))}
              </View>

              <Text style={styles.rmTitle}>{t('ent_rm_title')}</Text>
              <Text style={styles.rmSub}>{t('ent_rm_sub')}</Text>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <GlassInput label={t('ent_rm_squat')} value={rmSentadilla} onChangeText={v => mark(setRmSentadilla)(onlyNum(v))}
                    placeholder="100" keyboardType="decimal-pad" styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <GlassInput label={t('ent_rm_deadlift')} value={rmMuerto} onChangeText={v => mark(setRmMuerto)(onlyNum(v))}
                    placeholder="120" keyboardType="decimal-pad" styles={styles} />
                </View>
              </View>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <GlassInput label={t('ent_rm_bench')} value={rmBanca} onChangeText={v => mark(setRmBanca)(onlyNum(v))}
                    placeholder="80" keyboardType="decimal-pad" styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <GlassInput label={t('ent_rm_shoulder')} value={rmHombro} onChangeText={v => mark(setRmHombro)(onlyNum(v))}
                    placeholder="60" keyboardType="decimal-pad" styles={styles} />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={save} disabled={saving} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{saving ? t('ent_saving') : t('ent_save_changes')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    rowFields: { flexDirection: 'row' },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: accentAlpha(c.accent, 0.12) },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    dayBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center' },
    dayBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    dayBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: c.inkMuted },
    dayBtnTextActive: { color: readableTextOn(c.accent) },
    rmTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
    rmSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginBottom: 14 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: readableTextOn(c.accent), fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
