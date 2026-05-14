import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPost } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  id: number
  nombre: string
  tipo: string
  implementos: string[]
}

interface CheckinExistente {
  id: number
  fecha: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOCOS: string[] = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Core',
  'Full body',
  'Cardio',
  'Movilidad',
]

const ANIMO_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

const ZONAS_DOLOR = ['Rodilla', 'Lumbar', 'Hombro', 'Cuello', 'Cadera', 'Tobillo', 'Muñeca', 'Codo']

const MONTH_SHORT = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'jul', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTodayFull(): string {
  const d = new Date()
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTH_SHORT[d.getMonth()]} de ${d.getFullYear()}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <Text style={styles.sectionLabel}>{text}</Text>
  )
}

function StepperField({
  value,
  min,
  max,
  step,
  unit,
  onChangeValue,
}: {
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChangeValue: (v: number) => void
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={() => onChangeValue(clamp(value - step, min, max))}
        activeOpacity={0.7}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>
        {value}
        <Text style={styles.stepperUnit}> {unit}</Text>
      </Text>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={() => onChangeValue(clamp(value + step, min, max))}
        activeOpacity={0.7}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CheckinScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  // Check-in state
  const [checkinExistente, setCheckinExistente] = useState<CheckinExistente | null>(null)
  const [checkingExistente, setCheckingExistente] = useState(true)

  // Locations
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  // Form fields
  const [focoSeleccionado, setFocoSeleccionado] = useState<string[]>([])
  const [estadoAnimo, setEstadoAnimo] = useState<number>(3) // 1-5
  const [calidadSueno, setCalidadSueno] = useState<number>(7)  // hours * 2 = allow .5 steps
  const [hrv, setHrv] = useState<string>('')
  const [locationId, setLocationId] = useState<number | null>(null)
  const [duracion, setDuracion] = useState<number>(45)
  const [dolorHoy, setDolorHoy] = useState<string[]>([])
  const [notas, setNotas] = useState<string>('')

  // Submit
  const [submitting, setSubmitting] = useState(false)

  // ── Load today's check-in and locations ──
  const loadData = useCallback(async () => {
    try {
      const [checkinRes, locsRes] = await Promise.allSettled([
        apiGet('/api/checkins/today/'),
        apiGet('/api/locations/'),
      ])

      if (checkinRes.status === 'fulfilled' && checkinRes.value?.id) {
        setCheckinExistente(checkinRes.value)
      }
      if (locsRes.status === 'fulfilled') {
        const locs: Location[] = locsRes.value ?? []
        setLocations(locs)
        if (locs.length > 0) setLocationId(locs[0].id)
      }
    } catch {
      // non-fatal
    } finally {
      setCheckingExistente(false)
      setLoadingLocations(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Toggle foco ──
  function toggleFoco(f: string) {
    setFocoSeleccionado(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f],
    )
  }

  // ── Submit ──
  async function handleSubmit() {
    if (focoSeleccionado.length === 0) {
      Alert.alert('Foco requerido', 'Selecciona al menos un foco de entrenamiento.')
      return
    }
    if (locationId === null) {
      Alert.alert('Ubicación requerida', 'Selecciona una ubicación de entrenamiento.')
      return
    }

    setSubmitting(true)
    try {
      await apiPost('/api/checkins/', {
        foco_entrenamiento: focoSeleccionado,
        estado_animo: estadoAnimo,
        calidad_sueno: calidadSueno,
        hrv: hrv.trim() !== '' ? parseInt(hrv, 10) : null,
        location: locationId,
        duracion_disponible: duracion,
        dolor_hoy: dolorHoy.length > 0 ? dolorHoy.map(z => z.toLowerCase()).join(', ') : null,
        notas: notas.trim() || null,
      })
      router.replace('/(app)/generate')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar el check-in. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state ──
  if (checkingExistente) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient
          colors={['rgba(37,99,255,0.25)', 'transparent']}
          style={styles.gradient}
        />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  // ── Already checked in today ──
  if (checkinExistente) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
        <LinearGradient
          colors={['rgba(37,99,255,0.25)', 'transparent']}
          style={styles.gradient}
        />
        <View style={styles.alreadyCard}>
          <Text style={styles.alreadyEmoji}>✅</Text>
          <Text style={styles.alreadyTitle}>Ya hiciste check-in hoy</Text>
          <Text style={styles.alreadySubtitle}>
            Completaste el check-in del {formatTodayFull().split(',')[0]}.
          </Text>
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={() => router.replace('/(app)/generate')}
            activeOpacity={0.85}
          >
            <Text style={styles.generateBtnText}>Ir a generar sesión →</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Main form ──
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(37,99,255,0.25)', 'transparent']}
        style={styles.gradient}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Title ── */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Check-in de hoy</Text>
            <Text style={styles.subtitle}>{formatTodayFull()}</Text>
          </View>

          {/* ── 1. Foco de entrenamiento ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="Foco de entrenamiento" />
            <View style={styles.chipsWrap}>
              {FOCOS.map(f => {
                const selected = focoSeleccionado.includes(f)
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleFoco(f)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* ── 2. Estado de ánimo ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="¿Cómo te sientes hoy?" />
            <View style={styles.animoRow}>
              {ANIMO_EMOJIS.map((emoji, i) => {
                const val = i + 1
                const selected = estadoAnimo === val
                return (
                  <TouchableOpacity
                    key={val}
                    style={[styles.animoBtn, selected && styles.animoBtnSelected]}
                    onPress={() => setEstadoAnimo(val)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.animoEmoji}>{emoji}</Text>
                    {selected && (
                      <View style={styles.animoDot} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* ── 3. Calidad de sueño ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="Calidad de sueño (horas)" />
            <StepperField
              value={calidadSueno}
              min={3}
              max={12}
              step={0.5}
              unit="h"
              onChangeValue={setCalidadSueno}
            />
          </View>

          {/* ── 4. HRV ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="HRV (opcional)" />
            <TextInput
              style={styles.textInput}
              value={hrv}
              onChangeText={setHrv}
              placeholder="Ej. 65"
              placeholderTextColor={colors.inkMuted}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          {/* ── 5. Ubicación ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="Ubicación" />
            {loadingLocations ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator color={colors.accent} size="small" />
              </View>
            ) : locations.length === 0 ? (
              <View style={styles.noLocations}>
                <Text style={styles.noLocationsText}>
                  No tienes ubicaciones guardadas. Añade una en tu perfil.
                </Text>
              </View>
            ) : (
              <View style={styles.locationsGrid}>
                {locations.map(loc => {
                  const selected = locationId === loc.id
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.locationCard, selected && styles.locationCardSelected]}
                      onPress={() => setLocationId(loc.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.locationName, selected && { color: colors.accent }]}>
                        {loc.nombre}
                      </Text>
                      <Text style={styles.locationTipo}>{loc.tipo}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>

          {/* ── 6. Duración disponible ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="Duración disponible" />
            <StepperField
              value={duracion}
              min={20}
              max={120}
              step={5}
              unit="min"
              onChangeValue={setDuracion}
            />
          </View>

          {/* ── 7. Dolor o molestia ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="Dolor o molestia hoy" />
            <View style={styles.chipsWrap}>
              {ZONAS_DOLOR.map(zona => {
                const selected = dolorHoy.includes(zona)
                return (
                  <TouchableOpacity
                    key={zona}
                    style={[styles.chip, selected && styles.dolorChipSelected]}
                    onPress={() =>
                      setDolorHoy(prev =>
                        prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona],
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.dolorChipTextSelected]}>
                      {zona}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {dolorHoy.length === 0 && (
              <Text style={styles.dolorHint}>Sin dolor — toca para indicar zonas afectadas</Text>
            )}
          </View>

          {/* ── 8. Notas ── */}
          <View style={styles.fieldBlock}>
            <SectionLabel text="Notas (opcional)" />
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notas}
              onChangeText={setNotas}
              placeholder="Algo más que quieras registrar..."
              placeholderTextColor={colors.inkMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Comenzar →</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 400,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 60,
      paddingHorizontal: 20,
    },

    // Title
    titleBlock: {
      marginBottom: 28,
      gap: 4,
    },
    title: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      letterSpacing: -0.8,
    },
    subtitle: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      letterSpacing: -0.1,
    },

    // Field block
    fieldBlock: {
      marginBottom: 22,
      gap: 10,
    },
    sectionLabel: {
      color: c.inkSecondary,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    // Chips (foco)
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    chipSelected: {
      backgroundColor: 'rgba(79,140,255,0.18)',
      borderColor: c.accent,
    },
    chipText: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
      letterSpacing: -0.1,
    },
    chipTextSelected: {
      color: c.accent,
    },

    // Animo
    animoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    animoBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      gap: 4,
    },
    animoBtnSelected: {
      backgroundColor: 'rgba(79,140,255,0.15)',
      borderColor: c.accent,
    },
    animoEmoji: {
      fontSize: 24,
    },
    animoDot: {
      position: 'absolute',
      bottom: 6,
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.accent,
    },

    // Stepper
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      overflow: 'hidden',
      alignSelf: 'flex-start',
      minWidth: 180,
    },
    stepperBtn: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.glassBg,
    },
    stepperBtnText: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      lineHeight: 24,
    },
    stepperValue: {
      flex: 1,
      textAlign: 'center',
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18,
      letterSpacing: -0.4,
    },
    stepperUnit: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
    },

    // TextInput
    textInput: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
    },
    textArea: {
      minHeight: 90,
      paddingTop: 13,
    },

    // Locations
    locationLoading: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    noLocations: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 16,
    },
    noLocationsText: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      textAlign: 'center',
    },
    locationsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    locationCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 2,
      minWidth: 120,
    },
    locationCardSelected: {
      backgroundColor: 'rgba(79,140,255,0.12)',
      borderColor: c.accent,
    },
    locationName: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      letterSpacing: -0.2,
    },
    locationTipo: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },

    // Submit
    submitBtn: {
      backgroundColor: c.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 10,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: c.white,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      letterSpacing: -0.3,
    },

    dolorChipSelected: {
      backgroundColor: 'rgba(255,68,68,0.15)',
      borderColor: 'rgba(255,100,100,0.5)',
    },
    dolorChipTextSelected: {
      color: 'rgba(255,150,150,0.95)',
    },
    dolorHint: {
      color: c.inkFaint,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      marginTop: 6,
      fontStyle: 'italic',
    },

    // Already checked-in
    alreadyCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 24,
      padding: 32,
      alignItems: 'center',
      gap: 12,
      width: '100%',
    },
    alreadyEmoji: {
      fontSize: 48,
    },
    alreadyTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    alreadySubtitle: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    generateBtn: {
      marginTop: 8,
      backgroundColor: c.accent,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 14,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
    },
    generateBtnText: {
      color: c.white,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      letterSpacing: -0.2,
    },
  })
}
