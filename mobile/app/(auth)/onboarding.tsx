import React, { useState, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useTheme } from '../../lib/theme'
import { Colors } from '../../lib/colors'
import { apiPut } from '../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Sexo = 'masculino' | 'femenino' | 'otro' | ''
type ScreenId = 'b1_personal' | 'b1_ciclo' | 'b1_historial'

type FormData = {
  nombre: string
  fechaNacimiento: Date | null
  sexo: Sexo
  peso: string
  pesoUnit: 'kg' | 'lb'
  altura: string
  alturaUnit: 'cm' | 'ft'
  usaCicloMenstrual: boolean
  frecuenciaHistorica: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRECUENCIA_OPTIONS = [
  { label: 'Casi nunca',          sublabel: '0 o 1 días por semana',   value: 1, badge: '0–1' },
  { label: '1–2 veces por semana', sublabel: 'Entrenamiento ocasional', value: 2, badge: '1–2' },
  { label: '3–4 veces por semana', sublabel: 'La frecuencia más común', value: 3, badge: '3–4' },
  { label: '5–6 veces por semana', sublabel: 'Alta dedicación',          value: 5, badge: '5–6' },
  { label: 'Todos los días',      sublabel: '7 días por semana',        value: 7, badge: '7'   },
]

function formatDate(d: Date) {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [data, setData] = useState<FormData>({
    nombre: '', fechaNacimiento: null, sexo: '',
    peso: '', pesoUnit: 'kg', altura: '', alturaUnit: 'cm',
    usaCicloMenstrual: false, frecuenciaHistorica: null,
  })
  const [screenIndex, setScreenIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempDate, setTempDate] = useState(new Date(2000, 0, 1))

  const screens = useMemo<ScreenId[]>(() => [
    'b1_personal',
    ...(data.sexo === 'femenino' ? ['b1_ciclo' as ScreenId] : []),
    'b1_historial',
  ], [data.sexo])

  const currentScreen = screens[screenIndex]
  const isLast = screenIndex === screens.length - 1
  const progress = (screenIndex + 1) / Math.max(screens.length, 1)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  function validate(): string | null {
    if (currentScreen === 'b1_personal') {
      if (!data.nombre.trim()) return 'El nombre es requerido.'
      if (!data.fechaNacimiento) return 'La fecha de nacimiento es requerida.'
      if (!data.sexo) return 'Selecciona tu sexo biológico.'
      const p = Number(data.peso.replace(',', '.'))
      if (!data.peso || isNaN(p) || p <= 0) return 'Ingresa un peso válido.'
      const a = Number(data.altura.replace(',', '.'))
      if (!data.altura || isNaN(a) || a <= 0) return 'Ingresa una altura válida.'
    }
    if (currentScreen === 'b1_historial') {
      if (data.frecuenciaHistorica === null) return 'Selecciona tu frecuencia de entrenamiento.'
    }
    return null
  }

  async function goNext() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    if (!isLast) { setScreenIndex(i => i + 1); return }
    await handleSave()
  }

  function goBack() {
    if (screenIndex === 0) { router.back(); return }
    setScreenIndex(i => i - 1)
    setError('')
  }

  async function handleSave() {
    setLoading(true)
    try {
      const pesoNum = Number(data.peso.replace(',', '.'))
      const alturaNum = Number(data.altura.replace(',', '.'))
      const pesoKg = data.pesoUnit === 'lb' ? (pesoNum * 0.453592).toFixed(1) : String(pesoNum)
      const alturaCm = data.alturaUnit === 'ft' ? Math.round(alturaNum * 30.48) : Math.round(alturaNum)

      await apiPut('/api/profile/', {
        nombre: data.nombre.trim(),
        fecha_nacimiento: data.fechaNacimiento!.toISOString().split('T')[0],
        sexo: data.sexo,
        peso: pesoKg,
        altura: alturaCm,
        usa_ciclo_menstrual: data.usaCicloMenstrual,
        dias_semana: data.frecuenciaHistorica ?? 3,
      })
      router.replace('/(app)/dashboard')
    } catch (e: any) {
      setError(e.message || 'Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Screen: personal data ───────────────────────────────────────────────────

  function renderPersonal() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.contextLine}>
          Para calcular tu gasto energético real y ajustar la intensidad
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NOMBRE</Text>
          <TextInput style={styles.input} placeholder="Tu nombre"
            placeholderTextColor={colors.inkMuted} value={data.nombre}
            onChangeText={v => set('nombre', v)} autoCapitalize="words" autoCorrect={false} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FECHA DE NACIMIENTO</Text>
          <TouchableOpacity style={[styles.input, styles.inputTouch]}
            onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Text style={data.fechaNacimiento ? styles.inputText : styles.inputPlaceholder}>
              {data.fechaNacimiento ? formatDate(data.fechaNacimiento) : 'DD / MM / AAAA'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>SEXO BIOLÓGICO</Text>
          <View style={styles.chipsRow}>
            {(['masculino', 'femenino', 'otro'] as const).map(s => (
              <TouchableOpacity key={s}
                style={[styles.chip, data.sexo === s && styles.chipOn]}
                onPress={() => set('sexo', s)} activeOpacity={0.8}>
                <Text style={[styles.chipText, data.sexo === s && styles.chipTextOn]}>
                  {s === 'masculino' ? 'Hombre' : s === 'femenino' ? 'Mujer' : 'Prefiero no decir'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>PESO</Text>
            <View style={styles.unitToggle}>
              {(['kg', 'lb'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, data.pesoUnit === u && styles.unitBtnOn]}
                  onPress={() => set('pesoUnit', u)}>
                  <Text style={[styles.unitBtnText, data.pesoUnit === u && styles.unitBtnTextOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput style={styles.input}
            placeholder={data.pesoUnit === 'kg' ? 'ej. 75' : 'ej. 165'}
            placeholderTextColor={colors.inkMuted} value={data.peso}
            onChangeText={v => set('peso', v.replace(',', '.'))} keyboardType="decimal-pad" />
        </View>

        <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>ALTURA</Text>
            <View style={styles.unitToggle}>
              {(['cm', 'ft'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, data.alturaUnit === u && styles.unitBtnOn]}
                  onPress={() => set('alturaUnit', u)}>
                  <Text style={[styles.unitBtnText, data.alturaUnit === u && styles.unitBtnTextOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput style={styles.input}
            placeholder={data.alturaUnit === 'cm' ? 'ej. 175' : 'ej. 5.9'}
            placeholderTextColor={colors.inkMuted} value={data.altura}
            onChangeText={v => set('altura', v.replace(',', '.'))} keyboardType="decimal-pad" />
        </View>
      </ScrollView>
    )
  }

  // ─── Screen: ciclo menstrual ─────────────────────────────────────────────────

  function renderCiclo() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>CICLO MENSTRUAL</Text>
        <Text style={styles.cicloDesc}>
          El ciclo menstrual afecta tu fuerza, energía y recuperación de formas muy concretas.
          Si quieres, Zyfit lo integra en tu entrenamiento.
        </Text>

        <TouchableOpacity
          style={[styles.cicloCard, data.usaCicloMenstrual && styles.cicloCardOn]}
          onPress={() => set('usaCicloMenstrual', !data.usaCicloMenstrual)}
          activeOpacity={0.85}>
          <View style={[styles.cicloBox, data.usaCicloMenstrual && styles.cicloBoxOn]}>
            {data.usaCicloMenstrual && <Text style={styles.cicloCheck}>✓</Text>}
          </View>
          <Text style={styles.cicloCardText}>
            Sí, quiero que Zyfit considere mi ciclo{' '}
            <Text style={styles.cicloCardMuted}>— lo configuro después</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.cicloNote}>
          Puedes activarlo o desactivarlo cuando quieras desde tu perfil.
        </Text>
      </ScrollView>
    )
  }

  // ─── Screen: historial ───────────────────────────────────────────────────────

  function renderHistorial() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.historialQ}>
          ¿Cuántas veces a la semana has entrenado en los últimos 3 meses?
        </Text>

        {FRECUENCIA_OPTIONS.map(opt => {
          const on = data.frecuenciaHistorica === opt.value
          return (
            <TouchableOpacity key={opt.value}
              style={[styles.freqCard, on && styles.freqCardOn]}
              onPress={() => set('frecuenciaHistorica', opt.value)}
              activeOpacity={0.8}>
              <View style={[styles.freqRadio, on && styles.freqRadioOn]}>
                {on && <View style={styles.freqDot} />}
              </View>
              <View style={styles.freqContent}>
                <Text style={[styles.freqLabel, on && styles.freqLabelOn]}>{opt.label}</Text>
                <Text style={styles.freqSub}>{opt.sublabel}</Text>
              </View>
              <View style={[styles.freqBadge, on && styles.freqBadgeOn]}>
                <Text style={[styles.freqBadgeText, on && styles.freqBadgeTextOn]}>{opt.badge}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  function renderContent() {
    switch (currentScreen) {
      case 'b1_personal':  return renderPersonal()
      case 'b1_ciclo':     return renderCiclo()
      case 'b1_historial': return renderHistorial()
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <LinearGradient colors={['rgba(37,99,255,0.22)', 'transparent']} style={styles.gradient} />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.blockNum}>BLOQUE 1 DE 6</Text>
          <Text style={styles.blockTitle}>Quién eres físicamente</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {renderContent()}

        <View style={styles.footer}>
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <View style={styles.btnRow}>
            {screenIndex > 0 && (
              <TouchableOpacity style={styles.backSecondary} onPress={goBack} activeOpacity={0.8}>
                <Text style={styles.backSecondaryText}>Atrás</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextWrap, screenIndex === 0 && styles.nextWrapFull]}
              onPress={goNext} disabled={loading} activeOpacity={0.88}>
              <LinearGradient colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.nextBtnText}>{isLast ? 'Guardar y continuar' : 'Continuar'}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date picker */}
      <Modal transparent animationType="slide" visible={showDatePicker}>
        <View style={styles.dateOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
          <View style={styles.dateCard}>
            <View style={styles.dateHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.dateTitle}>Fecha de nacimiento</Text>
              <TouchableOpacity onPress={() => { set('fechaNacimiento', tempDate); setShowDatePicker(false) }}>
                <Text style={styles.dateDone}>Listo</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker value={tempDate} mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { if (d) setTempDate(d) }}
              maximumDate={new Date()} minimumDate={new Date(1930, 0, 1)} />
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },

    progressTrack: { height: 3, backgroundColor: c.borderDefault },
    progressFill: { height: 3, backgroundColor: c.accent },

    header: {
      paddingTop: 52, paddingHorizontal: 24, paddingBottom: 20,
      flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    },
    backBtn: { paddingTop: 4, paddingRight: 4 },
    backArrow: { fontSize: 22, color: c.inkSecondary },
    blockNum: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.accent, letterSpacing: 1.5, marginBottom: 4,
    },
    blockTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 21,
      color: c.inkPrimary, letterSpacing: -0.4,
    },

    scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },

    contextLine: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.accent, fontStyle: 'italic', marginBottom: 24, lineHeight: 19,
    },

    fieldGroup: { marginBottom: 20 },
    fieldLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.inkMuted, letterSpacing: 1.2, marginBottom: 8,
    },
    input: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15,
    },
    inputTouch: { justifyContent: 'center' },
    inputText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkPrimary },
    inputPlaceholder: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkMuted },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
    },
    chipOn: { backgroundColor: 'rgba(79,140,255,0.15)', borderColor: c.accent },
    chipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: c.inkSecondary },
    chipTextOn: { color: c.accent },

    labelRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 8,
    },
    unitToggle: { flexDirection: 'row', backgroundColor: c.glassBg, borderRadius: 8, padding: 2 },
    unitBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
    unitBtnOn: { backgroundColor: c.accent },
    unitBtnText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 0.5,
    },
    unitBtnTextOn: { color: '#ffffff' },

    // Ciclo
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.accent, letterSpacing: 2, marginBottom: 20,
    },
    cicloDesc: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 16,
      color: c.inkSecondary, lineHeight: 25, marginBottom: 28,
    },
    cicloCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 16,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 20, marginBottom: 16,
    },
    cicloCardOn: { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent },
    cicloBox: {
      width: 24, height: 24, borderRadius: 7, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    cicloBoxOn: { backgroundColor: c.accent, borderColor: c.accent },
    cicloCheck: { color: '#ffffff', fontSize: 14, fontFamily: 'SpaceGrotesk-Bold' },
    cicloCardText: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 15,
      color: c.inkPrimary, lineHeight: 22, flex: 1,
    },
    cicloCardMuted: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular' },
    cicloNote: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, lineHeight: 18,
    },

    // Historial
    historialQ: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 21,
      color: c.inkPrimary, letterSpacing: -0.3, lineHeight: 30, marginBottom: 24,
    },
    freqCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 10,
    },
    freqCardOn: { backgroundColor: 'rgba(79,140,255,0.08)', borderColor: c.accent },
    freqRadio: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center',
    },
    freqRadioOn: { borderColor: c.accent },
    freqDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
    freqContent: { flex: 1 },
    freqLabel: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary },
    freqLabelOn: { color: c.accent },
    freqSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginTop: 2,
    },
    freqBadge: {
      backgroundColor: c.glassBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    },
    freqBadgeOn: { backgroundColor: 'rgba(79,140,255,0.2)' },
    freqBadgeText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.inkMuted, letterSpacing: 0.5,
    },
    freqBadgeTextOn: { color: c.accent },

    // Footer
    footer: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.25)', borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
    },
    errorText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.red },
    btnRow: { flexDirection: 'row', gap: 12 },
    backSecondary: {
      flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 14,
    },
    backSecondaryText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkSecondary },
    nextWrap: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    nextWrapFull: { flex: 1 },
    nextBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    nextBtnText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: '#ffffff', letterSpacing: 0.3,
    },

    // Date picker
    dateOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    dateCard: {
      backgroundColor: c.sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderWidth: 1, borderColor: c.borderDefault, paddingBottom: 34,
    },
    dateHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.borderDefault,
    },
    dateCancel: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkMuted },
    dateTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary },
    dateDone: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.accent },
  })
}
