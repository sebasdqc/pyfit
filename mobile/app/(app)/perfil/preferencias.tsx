import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, accentAlpha } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPatch } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTILOS = [
  { k: 'musculacion', tkey: 'pref_style_strength' },
  { k: 'running',     tkey: 'pref_style_running' },
  { k: 'libre',       tkey: 'pref_style_free' },
] as const

const LISTA_EJERCICIOS = [
  'Sentadilla con barra', 'Sentadilla frontal', 'Sentadilla sumo', 'Sentadilla goblet',
  'Sentadilla búlgara', 'Peso muerto convencional', 'Peso muerto rumano', 'Peso muerto sumo',
  'Press banca plano', 'Press banca inclinado', 'Press banca con mancuernas',
  'Aperturas con mancuernas', 'Fondos en paralelas', 'Press militar con barra',
  'Press hombro con mancuernas', 'Elevaciones laterales', 'Elevaciones frontales', 'Face pull',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna', 'Remo en polea',
  'Curl de bíceps con barra', 'Curl de bíceps con mancuernas', 'Curl martillo',
  'Extensión de tríceps en polea', 'Press francés', 'Patada de tríceps', 'Hip thrust',
  'Puente de glúteos', 'Zancadas', 'Prensa de piernas', 'Extensión de cuádriceps',
  'Curl femoral', 'Elevación de gemelos', 'Plancha', 'Crunch', 'Rueda abdominal',
  'Swing con kettlebell', 'Burpees', 'Mountain climbers', 'Saltos al cajón',
]

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

// ─── Exercise Selector ────────────────────────────────────────────────────────

function ExerciseSelector({ label, value, onChange, styles }: {
  label: string; value: string; onChange: (v: string) => void; styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = value ? value.split(',').map(x => x.trim()).filter(Boolean) : []
  const filtered = query.length > 0
    ? LISTA_EJERCICIOS.filter(e => e.toLowerCase().includes(query.toLowerCase()) && !selected.includes(e)).slice(0, 6)
    : []

  return (
    <View style={styles.fieldGroup}>
      <SectionLabel text={label} styles={styles} />
      {selected.length > 0 && (
        <View style={[styles.chipsRow, { marginBottom: 8 }]}>
          {selected.map(ex => (
            <TouchableOpacity key={ex} style={styles.exChip}
              onPress={() => onChange(selected.filter(e => e !== ex).join(', '))} activeOpacity={0.7}>
              <Text style={styles.exChipText}>{ex}</Text>
              <Text style={styles.exChipRemove}>×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ zIndex: 10 }}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={v => { setQuery(v); setOpen(v.length > 0) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('pref_search_avoid')}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none" autoCorrect={false}
        />
        {open && filtered.length > 0 && (
          <View style={styles.dropdown}>
            {filtered.map(ex => (
              <TouchableOpacity key={ex} style={styles.dropdownItem}
                onPress={() => { onChange([...selected, ex].join(', ')); setQuery(''); setOpen(false) }}
                activeOpacity={0.7}>
                <Text style={styles.dropdownText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PreferenciasScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [estilos, setEstilos] = useState<string[]>([])
  const [evitar, setEvitar] = useState('')

  useEffect(() => {
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      const estilo = data.estilo_entrenamiento ?? ''
      setEstilos(estilo ? [estilo] : [])
      setEvitar(data.ejercicios_evitar ?? '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function toggleEstilo(k: string) {
    // Single-select: el backend guarda un solo estilo (estilo_entrenamiento es
    // string). Antes la UI permitía marcar varios pero solo se guardaba el 1º.
    setEstilos(prev => prev.includes(k) ? [] : [k])
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
    setSaving(true)
    try {
      // PRF: PATCH parcial — solo campos de esta pantalla (evita lost update).
      await apiPatch('/api/profile/', {
        estilo_entrenamiento: estilos[0] ?? '',
        ejercicios_evitar: evitar,
      })
      setIsDirty(false)
      router.back()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('pref_save_error'))
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
        <Text style={styles.headerTitle}>{t('perfil_row_preferences')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>{t('common_loading')}</Text>
          </View>
        ) : (
          <>
            <SectionLabel text={t('pref_style_label')} styles={styles} />
            <View style={[styles.chipsRow, { marginBottom: 24 }]}>
              {ESTILOS.map(({ k, tkey }) => (
                <Chip key={k} label={t(tkey)} active={estilos.includes(k)}
                  onPress={() => toggleEstilo(k)} styles={styles} />
              ))}
            </View>

            <ExerciseSelector label={t('pref_avoid_label')} value={evitar}
              onChange={v => { setEvitar(v); setIsDirty(true) }} styles={styles} />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={save} disabled={saving} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? t('pref_saving') : t('pref_save_changes')}</Text>
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
    sectionLabel: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
    fieldGroup: { marginBottom: 24 },
    input: { backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: accentAlpha(c.accent, 0.12) },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    exChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: accentAlpha(c.accent, 0.15), borderWidth: 1, borderColor: c.accent },
    exChipText: { color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 },
    exChipRemove: { color: c.accent, fontFamily: 'SpaceGrotesk-Bold', fontSize: 14 },
    dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: c.sheetBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
    dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    dropdownText: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
