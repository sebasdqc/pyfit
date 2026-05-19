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
import { apiGet, apiPut } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTRES = [{ k: 'bajo', l: 'Bajo' }, { k: 'moderado', l: 'Moderado' }, { k: 'alto', l: 'Alto' }]
const TRABAJOS = [{ k: 'sedentario', l: 'Sedentario' }, { k: 'mixto', l: 'Mixto' }, { k: 'activo', l: 'Activo' }]

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
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [nombre, setNombre] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [nivelEstres, setNivelEstres] = useState('')
  const [tipoTrabajo, setTipoTrabajo] = useState('')
  const [experiencia, setExperiencia] = useState('')

  useEffect(() => {
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      setNombre(data.nombre ?? '')
      setPeso(data.peso ? String(data.peso) : '')
      setAltura(data.altura ? String(data.altura) : '')
      setNivelEstres(data.nivel_estres ?? '')
      setTipoTrabajo(data.tipo_trabajo ?? '')
      setExperiencia(data.experiencia_deportiva ?? '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!fullProfile) return
    setSaving(true)
    try {
      await apiPut('/api/profile/', {
        ...fullProfile,
        nombre, peso, altura,
        nivel_estres: nivelEstres,
        tipo_trabajo: tipoTrabajo,
        experiencia_deportiva: experiencia,
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Datos personales</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {loading ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>
                Cargando...
              </Text>
            </View>
          ) : (
            <>
              {/* Read-only fields */}
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <ReadOnlyField label="FECHA DE NACIMIENTO"
                    value={formatDate(fullProfile?.fecha_nacimiento ?? '')} styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <ReadOnlyField label="SEXO"
                    value={capitalizeFirst(fullProfile?.sexo ?? '')} styles={styles} />
                </View>
              </View>

              <ReadOnlyField label="CORREO" value={fullProfile?.email ?? ''} styles={styles} />

              <GlassInput label="NOMBRE" value={nombre} onChangeText={setNombre}
                placeholder="Tu nombre" styles={styles} />

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <GlassInput label="PESO (kg)" value={peso} onChangeText={setPeso}
                    placeholder="70" keyboardType="decimal-pad" styles={styles} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <GlassInput label="ALTURA (cm)" value={altura} onChangeText={setAltura}
                    placeholder="175" keyboardType="numeric" styles={styles} />
                </View>
              </View>

              <SectionLabel text="NIVEL DE ESTRÉS" styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {ESTRES.map(({ k, l }) => (
                  <Chip key={k} label={l} active={nivelEstres === k}
                    onPress={() => setNivelEstres(k)} styles={styles} />
                ))}
              </View>

              <SectionLabel text="TIPO DE TRABAJO" styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                {TRABAJOS.map(({ k, l }) => (
                  <Chip key={k} label={l} active={tipoTrabajo === k}
                    onPress={() => setTipoTrabajo(k)} styles={styles} />
                ))}
              </View>

              <GlassInput label="EXPERIENCIA DEPORTIVA" value={experiencia}
                onChangeText={setExperiencia}
                placeholder="Ej: 5 años de fútbol, crossfit... (opcional)"
                multiline styles={styles} />

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
    inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
    rowFields: { flexDirection: 'row' },
    readOnlyBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: c.borderDefault, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    readOnlyText: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.12)' },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
