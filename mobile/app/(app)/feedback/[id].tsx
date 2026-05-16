import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { COLORS } from '../../../lib/colors'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiPost } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

const RATING_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

// ─── RPE color helper ─────────────────────────────────────────────────────────

function getRpeColor(value: number, c: Colors): string {
  if (value <= 4) return c.green
  if (value <= 6) return c.accentLight
  if (value <= 8) return c.orange
  return c.red
}

// ─── Cumplimiento color helper ────────────────────────────────────────────────

function getCumplimientoColor(value: number, c: Colors): string {
  if (value >= 90) return c.green
  if (value >= 70) return c.accentLight
  if (value >= 50) return c.orange
  return c.red
}

// ─── Stepper component ────────────────────────────────────────────────────────

function Stepper({
  value,
  onIncrement,
  onDecrement,
  displayValue,
  color,
}: {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  displayValue: string
  color: string
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: colors.borderDefault }]}
        onPress={onDecrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>

      <View style={[styles.stepperValueContainer, { borderColor: color + '50' }]}>
        <Text style={[styles.stepperValue, { color }]}>{displayValue}</Text>
      </View>

      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: colors.borderDefault }]}
        onPress={onIncrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return <View style={styles.sectionCard}>{children}</View>
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [rpeReal, setRpeReal] = useState(7)
  const [cumplimiento, setCumplimiento] = useState(80)
  const [rating, setRating] = useState<number | null>(null)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const incrementRpe = () => setRpeReal(prev => Math.min(prev + 1, 10))
  const decrementRpe = () => setRpeReal(prev => Math.max(prev - 1, 1))

  const incrementCumplimiento = () => setCumplimiento(prev => Math.min(prev + 5, 100))
  const decrementCumplimiento = () => setCumplimiento(prev => Math.max(prev - 5, 0))

  const handleFinalizar = async () => {
    setSubmitting(true)
    try {
      await apiPost(`/api/sessions/${id}/feedback/`, {
        rpe_real: rpeReal,
        cumplimiento,
        rating: rating ?? 3,
        notas: notas.trim() || null,
      })
      router.replace('/(app)/dashboard')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar el feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompartir = () => {
    Alert.alert('Próximamente', 'La función de compartir estará disponible pronto.')
  }

  const handleSaltar = () => {
    router.replace('/(app)/dashboard')
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>¿Cómo fue la sesión?</Text>
          <Text style={styles.headerSubtitle}>
            Tu feedback mejora cada entrenamiento futuro
          </Text>
        </View>

        {/* RPE real */}
        <SectionCard>
          <Text style={styles.sectionTitle}>¿Cómo estuvo el esfuerzo?</Text>
          <Text style={styles.sectionSubtitle}>
            RPE real — esfuerzo percibido durante la sesión
          </Text>

          <Stepper
            value={rpeReal}
            onIncrement={incrementRpe}
            onDecrement={decrementRpe}
            displayValue={`${rpeReal} / 10`}
            color={getRpeColor(rpeReal, colors)}
          />

          {/* RPE scale hint */}
          <View style={styles.scaleHints}>
            <Text style={[styles.scaleHintText, { color: colors.green }]}>1 Muy fácil</Text>
            <Text style={[styles.scaleHintText, { color: colors.orange }]}>6–7 Moderado</Text>
            <Text style={[styles.scaleHintText, { color: colors.red }]}>10 Máximo</Text>
          </View>
        </SectionCard>

        {/* Cumplimiento */}
        <SectionCard>
          <Text style={styles.sectionTitle}>¿Cuánto completaste?</Text>
          <Text style={styles.sectionSubtitle}>
            Porcentaje de ejercicios y series realizados
          </Text>

          <Stepper
            value={cumplimiento}
            onIncrement={incrementCumplimiento}
            onDecrement={decrementCumplimiento}
            displayValue={`${cumplimiento}%`}
            color={getCumplimientoColor(cumplimiento, colors)}
          />

          {/* Visual bar */}
          <View style={styles.cumplimientoBar}>
            <View
              style={[
                styles.cumplimientoFill,
                {
                  width: `${cumplimiento}%` as any,
                  backgroundColor: getCumplimientoColor(cumplimiento, colors),
                },
              ]}
            />
          </View>
        </SectionCard>

        {/* Rating general */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Rating general</Text>
          <Text style={styles.sectionSubtitle}>
            ¿Cómo valorarías esta sesión en general?
          </Text>

          <View style={styles.emojiRow}>
            {RATING_EMOJIS.map((emoji, idx) => {
              const value = idx + 1
              const isSelected = rating === value
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.emojiBtn,
                    isSelected && styles.emojiBtnSelected,
                  ]}
                  onPress={() => setRating(value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.emojiChar, isSelected && styles.emojiCharSelected]}>
                    {emoji}
                  </Text>
                  {isSelected && (
                    <Text style={styles.emojiValueLabel}>{value}</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </SectionCard>

        {/* Notes */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Notas (opcional)</Text>
          <Text style={styles.sectionSubtitle}>
            ¿Algo que destacar sobre la sesión?
          </Text>

          <TextInput
            style={styles.notasInput}
            placeholder="Ej: Me quedé corto en el tercer bloque, la rodilla molestó un poco..."
            placeholderTextColor={colors.inkMuted}
            value={notas}
            onChangeText={setNotas}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </SectionCard>

        {/* Buttons */}
        <View style={styles.buttonsSection}>
          {/* Finalizar */}
          <TouchableOpacity
            style={[styles.btnFinalizar, submitting && styles.btnDisabled]}
            onPress={handleFinalizar}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <LinearGradient
                  colors={[colors.accent, colors.accentLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.btnFinalizarText}>Finalizar sesión</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Compartir */}
          <TouchableOpacity
            style={styles.btnCompartir}
            onPress={handleCompartir}
            disabled={submitting}
          >
            <Text style={styles.btnCompartirText}>Compartir en redes</Text>
          </TouchableOpacity>

          {/* Saltar */}
          <TouchableOpacity
            style={styles.btnSaltar}
            onPress={handleSaltar}
            disabled={submitting}
          >
            <Text style={styles.btnSaltarText}>Saltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
      paddingTop: 64,
      paddingBottom: 48,
      paddingHorizontal: 20,
      gap: 16,
    },

    // Header
    header: {
      marginBottom: 8,
    },
    headerTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 28,
      color: c.inkPrimary,
      letterSpacing: -0.6,
      lineHeight: 34,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      lineHeight: 21,
    },

    // Section card
    sectionCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 20,
      gap: 12,
    },
    sectionTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      color: c.inkPrimary,
      letterSpacing: -0.2,
    },
    sectionSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 18,
      marginTop: -6,
    },

    // Stepper
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      justifyContent: 'center',
      marginTop: 4,
    },
    stepperBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardBg,
    },
    stepperBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.inkPrimary,
      lineHeight: 24,
    },
    stepperValueContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
      backgroundColor: c.glassBg,
    },
    stepperValue: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      letterSpacing: -0.5,
    },

    // RPE hints
    scaleHints: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    scaleHintText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    // Cumplimiento bar
    cumplimientoBar: {
      height: 4,
      backgroundColor: c.borderDefault,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 4,
    },
    cumplimientoFill: {
      height: 4,
      borderRadius: 2,
    },

    // Emoji rating
    emojiRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    emojiBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      marginHorizontal: 2,
      gap: 4,
    },
    emojiBtnSelected: {
      backgroundColor: 'rgba(79,140,255,0.12)',
      borderColor: 'rgba(79,140,255,0.35)',
    },
    emojiChar: {
      fontSize: 26,
      opacity: 0.5,
    },
    emojiCharSelected: {
      opacity: 1,
    },
    emojiValueLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.accentLight,
      letterSpacing: 0.5,
    },

    // Notes
    notasInput: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 14,
      minHeight: 100,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkPrimary,
      lineHeight: 22,
    },

    // Buttons
    buttonsSection: {
      gap: 10,
      marginTop: 8,
    },
    btnFinalizar: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      minHeight: 52,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnFinalizarText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: '#fff',
      letterSpacing: -0.2,
    },
    btnCompartir: {
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: c.cardBg,
    },
    btnCompartirText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      color: c.inkSecondary,
    },
    btnSaltar: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnSaltarText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkMuted,
    },
  })
}
