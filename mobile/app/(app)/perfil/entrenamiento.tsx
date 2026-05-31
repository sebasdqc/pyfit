import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPatch } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const NIVELES = [{ k: 'principiante', l: 'Principiante' }, { k: 'intermedio', l: 'Intermedio' }, { k: 'avanzado', l: 'Avanzado' }]
const HORARIOS = [{ k: 'mañana', l: 'Mañana' }, { k: 'tarde', l: 'Tarde' }, { k: 'noche', l: 'Noche' }]
const DIAS = [1, 2, 3, 4, 5, 6, 7]

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
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [nivel, setNivel] = useState('principiante')
  const [diasSemana, setDiasSemana] = useState(3)
  const [horario, setHorario] = useState('')
  const [rmSentadilla, setRmSentadilla] = useState('')
  const [rmMuerto, setRmMuerto] = useState('')
  const [rmBanca, setRmBanca] = useState('')
  const [rmHombro, setRmHombro] = useState('')

  useEffect(() => {
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      setNivel(data.nivel ?? 'principiante')
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
    setSaving(true)
    try {
      // PRF-3: sincronizar nivel_experiencia con el nivel editado — el motor
      // prioriza nivel_experiencia para el techo de dificultad técnica, así que
      // sin esto el cambio manual de nivel no afectaría la selección de ejercicios.
      const nivelExp = ({ principiante: 2, intermedio: 3, avanzado: 4 } as Record<string, number>)[nivel] ?? 3
      // PRF: PATCH parcial — solo campos de esta pantalla (evita lost update).
      await apiPatch('/api/profile/', {
        nivel, nivel_experiencia: nivelExp,
        dias_semana: diasSemana, horario_preferido: horario,
        rm_sentadilla: rmSentadilla, rm_peso_muerto: rmMuerto,
        rm_press_banca: rmBanca, rm_press_hombro: rmHombro,
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
        <Text style={styles.headerTitle}>Datos de entrenamiento</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {loading ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>Cargando...</Text>
            </View>
          ) : (
            <>
              <SectionLabel text="NIVEL" styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {NIVELES.map(({ k, l }) => (
                  <Chip key={k} label={l} active={nivel === k} onPress={() => setNivel(k)} styles={styles} />
                ))}
              </View>

              <SectionLabel text="DÍAS POR SEMANA" styles={styles} />
              <View style={[styles.daysRow, { marginBottom: 20 }]}>
                {DIAS.map(d => (
                  <TouchableOpacity key={d} style={[styles.dayBtn, diasSemana === d && styles.dayBtnActive]}
                    onPress={() => setDiasSemana(d)} activeOpacity={0.7}>
                    <Text style={[styles.dayBtnText, diasSemana === d && styles.dayBtnTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionLabel text="HORARIO PREFERIDO" styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {HORARIOS.map(({ k, l }) => (
                  <Chip key={k} label={l} active={horario === k} onPress={() => setHorario(k)} styles={styles} />
                ))}
              </View>

              <Text style={styles.rmTitle}>1RM APROXIMADO (kg)</Text>
              <Text style={styles.rmSub}>Opcional — para calcular cargas exactas</Text>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <GlassInput label="SENTADILLA" value={rmSentadilla} onChangeText={setRmSentadilla}
                    placeholder="100" keyboardType="decimal-pad" styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <GlassInput label="PESO MUERTO" value={rmMuerto} onChangeText={setRmMuerto}
                    placeholder="120" keyboardType="decimal-pad" styles={styles} />
                </View>
              </View>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <GlassInput label="PRESS BANCA" value={rmBanca} onChangeText={setRmBanca}
                    placeholder="80" keyboardType="decimal-pad" styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <GlassInput label="PRESS HOMBRO" value={rmHombro} onChangeText={setRmHombro}
                    placeholder="60" keyboardType="decimal-pad" styles={styles} />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={save} disabled={saving} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
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
    chipActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.12)' },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    dayBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center' },
    dayBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    dayBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: c.inkMuted },
    dayBtnTextActive: { color: c.white },
    rmTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
    rmSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginBottom: 14 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
