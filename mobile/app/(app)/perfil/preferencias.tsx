import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPut } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTILOS = [
  { k: 'fuerza', l: 'Fuerza' }, { k: 'hipertrofia', l: 'Hipertrofia' },
  { k: 'hiit', l: 'HIIT' }, { k: 'funcional', l: 'Funcional' },
  { k: 'cardio', l: 'Cardio' }, { k: 'mixto', l: 'Mixto' },
]

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

const TONOS = [
  { k: 'directo', l: 'Directo', desc: 'Instrucciones precisas y al punto' },
  { k: 'motivacional', l: 'Motivacional', desc: 'Energético y alentador' },
  { k: 'tecnico', l: 'Técnico', desc: 'Explicaciones detalladas con base científica' },
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
          placeholder="Buscar ejercicio a evitar..."
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
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [estilos, setEstilos] = useState<string[]>([])
  const [evitar, setEvitar] = useState('')
  const [tono, setTono] = useState('directo')

  useEffect(() => {
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      const estilo = data.estilo_entrenamiento ?? ''
      setEstilos(estilo ? [estilo] : [])
      setEvitar(data.ejercicios_evitar ?? '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function toggleEstilo(k: string) {
    setEstilos(prev => prev.includes(k) ? prev.filter(e => e !== k) : [...prev, k])
  }

  async function save() {
    if (!fullProfile) return
    setSaving(true)
    try {
      await apiPut('/api/profile/', {
        ...fullProfile,
        estilo_entrenamiento: estilos[0] ?? '',
        ejercicios_evitar: evitar,
      })
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
  }

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
        <Text style={styles.headerTitle}>Preferencias de entrenamiento</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>Cargando...</Text>
          </View>
        ) : (
          <>
            <SectionLabel text="ESTILO DE ENTRENAMIENTO" styles={styles} />
            <View style={[styles.chipsRow, { marginBottom: 24 }]}>
              {ESTILOS.map(({ k, l }) => (
                <Chip key={k} label={l} active={estilos.includes(k)}
                  onPress={() => toggleEstilo(k)} styles={styles} />
              ))}
            </View>

            <ExerciseSelector label="EJERCICIOS A EVITAR" value={evitar}
              onChange={setEvitar} styles={styles} />

            <SectionLabel text="TONO DEL ENTRENADOR" styles={styles} />
            <Text style={styles.tonoHint}>Personaliza cómo PyFit se comunica contigo</Text>
            <View style={styles.tonoGrid}>
              {TONOS.map(({ k, l, desc }) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.tonoCard, tono === k && styles.tonoCardActive]}
                  onPress={() => setTono(k)} activeOpacity={0.7}>
                  <Text style={[styles.tonoLabel, tono === k && styles.tonoLabelActive]}>{l}</Text>
                  <Text style={styles.tonoDesc}>{desc}</Text>
                  {tono === k && (
                    <View style={styles.tonoCheck}>
                      <Text style={{ color: colors.accent, fontSize: 10, fontFamily: 'SpaceGrotesk-Bold' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={save} disabled={saving} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
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
    chipActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.12)' },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    exChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(79,140,255,0.15)', borderWidth: 1, borderColor: c.accent },
    exChipText: { color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 },
    exChipRemove: { color: c.accent, fontFamily: 'SpaceGrotesk-Bold', fontSize: 14 },
    dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: c.sheetBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
    dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    dropdownText: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    tonoHint: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, marginBottom: 12, marginTop: -4 },
    tonoGrid: { gap: 10, marginBottom: 28 },
    tonoCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, padding: 16, position: 'relative',
    },
    tonoCardActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.08)' },
    tonoLabel: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, marginBottom: 4 },
    tonoLabelActive: { color: c.inkPrimary },
    tonoDesc: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, lineHeight: 18 },
    tonoCheck: {
      position: 'absolute', top: 14, right: 14,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: 'rgba(79,140,255,0.15)',
      borderWidth: 1, borderColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
