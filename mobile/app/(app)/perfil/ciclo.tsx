import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPatch, apiPost, localDateStr } from '../../../lib/api'

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CicloScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usaCiclo, setUsaCiclo] = useState(false)
  const [duracion, setDuracion] = useState('28')
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null)
  const [showPicker, setShowPicker] = useState(false)

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
      Alert.alert('Falta la fecha', 'Indica cuándo empezó tu último período para adaptar tus rutinas.')
      return
    }
    // #11: validar la duración en vez de recortarla en silencio. Vacío = 28
    // (el placeholder lo muestra); un valor explícito fuera de 20–45 se avisa.
    let dur = 28
    if (usaCiclo && duracion.trim() !== '') {
      const parsed = parseInt(duracion, 10)
      if (isNaN(parsed) || parsed < 20 || parsed > 45) {
        Alert.alert('Duración inválida', 'La duración del ciclo debe estar entre 20 y 45 días.')
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
      router.replace('/(app)/perfil')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.replace('/(app)/perfil')} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ciclo menstrual</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>Cargando...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.description}>
              Cuando está activado, PyFit adapta la intensidad y el tipo de entrenamiento según la fase del ciclo.
            </Text>

            {/* Toggle */}
            <TouchableOpacity style={styles.toggleRow} onPress={() => setUsaCiclo(prev => !prev)} activeOpacity={0.7}>
              <View>
                <Text style={styles.toggleTitle}>Adaptar al ciclo menstrual</Text>
                <Text style={styles.toggleSub}>
                  {usaCiclo ? 'Activado — PyFit ajustará tus rutinas' : 'Desactivado'}
                </Text>
              </View>
              <View style={[styles.toggleSwitch, usaCiclo && styles.toggleSwitchOn]}>
                <View style={[styles.toggleKnob, usaCiclo && styles.toggleKnobOn]} />
              </View>
            </TouchableOpacity>

            {usaCiclo && (
              <>
                <Text style={styles.fieldLabel}>INICIO DE TU ÚLTIMO PERÍODO</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                  <Text style={fechaInicio ? styles.inputText : styles.inputPlaceholder}>
                    {fechaInicio ? formatDate(fechaInicio) : 'Seleccionar fecha'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>DURACIÓN DEL CICLO (DÍAS)</Text>
                <TextInput
                  style={styles.input}
                  value={duracion}
                  onChangeText={txt => setDuracion(txt.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="28"
                  placeholderTextColor={colors.inkMuted}
                />

                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    🌙 PyFit utilizará los datos de tu ciclo para ajustar el RPE objetivo, el volumen y el tipo de ejercicios en cada sesión.
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
                  if (d) setFechaInicio(d)
                }}
              />
            )}

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
      backgroundColor: 'rgba(79,140,255,0.06)',
      borderWidth: 1, borderColor: 'rgba(79,140,255,0.2)',
      borderRadius: 14, padding: 16, marginBottom: 24,
    },
    infoText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, lineHeight: 20 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
