import React, { useMemo, useRef, useState } from 'react'
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
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../../../../lib/colors'
import { useTheme } from '../../../../lib/theme'
import { useTranslation } from '../../../../lib/i18n'
import { sendRunFeedback } from '../../../../lib/runsApi'
import { captureMessage } from '../../../../lib/sentry'

// ─── Opciones (mismas que el feedback de gym; mismas claves i18n) ────────────
const RPE_OPTIONS = [
  { labelKey: 'feedback_rpe_1' as const, rpe: 4,  icon: '🌱', color: '#32c896' },
  { labelKey: 'feedback_rpe_2' as const, rpe: 6,  icon: '💧', color: '#4f8cff' },
  { labelKey: 'feedback_rpe_3' as const, rpe: 8,  icon: '🔥', color: '#ffaa32' },
  { labelKey: 'feedback_rpe_4' as const, rpe: 10, icon: '⚡', color: '#ff4444' },
] as const

const SENSACION_OPTIONS = [
  { id: 'activado', labelKey: 'feedback_feel_1' as const, icon: '✨', color: '#32c896' },
  { id: 'cansado',  labelKey: 'feedback_feel_2' as const, icon: '💤', color: '#4f8cff' },
  { id: 'cargado',  labelKey: 'feedback_feel_3' as const, icon: '🏋️', color: '#ffaa32' },
  { id: 'molestia', labelKey: 'feedback_feel_4' as const, icon: '🤕', color: '#ff4444' },
] as const

const ZONAS_KEYS = [
  { id: 'Cuello',        key: 'feedback_zone_neck' as const },
  { id: 'Hombros',       key: 'feedback_zone_shoulders' as const },
  { id: 'Espalda alta',  key: 'feedback_zone_upper_back' as const },
  { id: 'Espalda baja',  key: 'feedback_zone_lower_back' as const },
  { id: 'Cadera',        key: 'feedback_zone_hip' as const },
  { id: 'Rodilla',       key: 'feedback_zone_knee' as const },
  { id: 'Tobillo',       key: 'feedback_zone_ankle' as const },
  { id: 'Muñeca',        key: 'feedback_zone_wrist' as const },
]

// Misma traducción sensación → (rating 1-5, cumplimiento 0-100) que el gym.
function sensacionToMetrics(s: string | null): { rating: number; cumplimiento: number } {
  switch (s) {
    case 'activado': return { rating: 5, cumplimiento: 95 }
    case 'cansado':  return { rating: 4, cumplimiento: 80 }
    case 'cargado':  return { rating: 3, cumplimiento: 70 }
    case 'molestia': return { rating: 2, cumplimiento: 65 }
    default:         return { rating: 3, cumplimiento: 80 }
  }
}

// ─── Fila de opción seleccionable (RPE / sensación) ──────────────────────────
function OptionRow({
  icon, label, color, selected, onPress, styles,
}: {
  icon: string
  label: string
  color: string
  selected: boolean
  onPress: () => void
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, selected && { backgroundColor: color + '14', borderColor: color }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
        onPress()
      }}
      activeOpacity={0.8}
    >
      <View style={[styles.optionBar, { backgroundColor: selected ? color : 'transparent' }]} />
      <Text style={styles.optionIcon}>{icon}</Text>
      <Text style={[styles.optionLabel, selected && { color }]}>{label}</Text>
      <View style={[styles.optionRadio, selected && { borderColor: color }]}>
        {selected && <View style={[styles.optionRadioDot, { backgroundColor: color }]} />}
      </View>
    </TouchableOpacity>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function RunFeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const submittingRef = useRef(false)

  const [rpeChoice, setRpeChoice] = useState<number | null>(null)
  const [sensacion, setSensacion] = useState<string | null>(null)
  const [zonasMolestia, setZonasMolestia] = useState<string[]>([])
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Tras guardar el feedback mostramos una pantalla de felicitación ("Buen Trabajo")
  // antes de volver al dashboard, en vez de navegar directo.
  const [done, setDone] = useState(false)

  const sessionId = id ? parseInt(id, 10) : NaN
  const canSubmit = rpeChoice !== null && sensacion !== null && !submitting

  function selectSensacion(sid: string) {
    setSensacion(sid)
    if (sid !== 'molestia') setZonasMolestia([])
  }

  function toggleZona(zona: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    setZonasMolestia(prev =>
      prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona],
    )
  }

  async function handleFinish() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    const { rating, cumplimiento } = sensacionToMetrics(sensacion)
    try {
      if (!isNaN(sessionId)) {
        await sendRunFeedback(sessionId, {
          rpe_real: rpeChoice ?? 7,
          rating,
          cumplimiento,
          molestias: zonasMolestia,
          feedback_notas: notas.trim() || null,
        })
      }
    } catch {
      // No bloqueante: felicitamos igual aunque el guardado falle.
      captureMessage('run-feedback POST failed — feedback not saved', 'warning')
    }
    // En vez de ir directo al dashboard, mostramos "Buen Trabajo".
    setSubmitting(false)
    setDone(true)
  }

  function handleSkip() {
    Alert.alert(
      t('feedback_skip_title'),
      t('feedback_skip_msg'),
      [
        { text: t('feedback_skip_cancel'), style: 'cancel' },
        { text: t('feedback_skip_confirm'), style: 'destructive', onPress: () => router.replace('/(app)/dashboard') },
      ],
    )
  }

  // ── Pantalla de felicitación tras Finalizar ──────────────────────────────────
  if (done) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <View style={styles.doneCenter}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Buen Trabajo</Text>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={styles.primaryWrap}
            onPress={() => router.replace('/(app)/dashboard')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Regresar al menú</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>FEEDBACK · CARRERA</Text>
          <Text style={styles.title}>{t('feedback_step1_title')}</Text>
          <Text style={styles.subtitle}>{t('feedback_step1_sub')}</Text>

          {/* Esfuerzo (RPE) */}
          <Text style={styles.sectionLabel}>{t('feedback_effort_q')}</Text>
          <View style={styles.optionsWrap}>
            {RPE_OPTIONS.map(opt => (
              <OptionRow
                key={opt.rpe}
                icon={opt.icon}
                label={t(opt.labelKey)}
                color={opt.color}
                selected={rpeChoice === opt.rpe}
                onPress={() => setRpeChoice(opt.rpe)}
                styles={styles}
              />
            ))}
          </View>

          {/* Sensación corporal */}
          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('feedback_body_q')}</Text>
          <View style={styles.optionsWrap}>
            {SENSACION_OPTIONS.map(opt => (
              <OptionRow
                key={opt.id}
                icon={opt.icon}
                label={t(opt.labelKey)}
                color={opt.color}
                selected={sensacion === opt.id}
                onPress={() => selectSensacion(opt.id)}
                styles={styles}
              />
            ))}
          </View>

          {/* Zonas de molestia (solo si "algo me molesta") */}
          {sensacion === 'molestia' && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('feedback_pain_zones')}</Text>
              <View style={styles.zonasWrap}>
                {ZONAS_KEYS.map(z => {
                  const on = zonasMolestia.includes(z.id)
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.zonaChip, on && styles.zonaChipOn]}
                      onPress={() => toggleZona(z.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.zonaChipText, on && styles.zonaChipTextOn]}>{t(z.key)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Nota opcional */}
          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('feedback_notes_q')}</Text>
          <TextInput
            style={styles.notesInput}
            value={notas}
            onChangeText={setNotas}
            placeholder={t('feedback_notes_placeholder')}
            placeholderTextColor={colors.inkMuted}
            multiline
            maxLength={280}
          />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={[styles.primaryWrap, !canSubmit && { opacity: 0.5 }]}
            onPress={handleFinish}
            disabled={!canSubmit}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Finalizar</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>{t('feedback_skip_confirm')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
    content: { paddingHorizontal: 24 },

    eyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.accent, letterSpacing: 2, marginBottom: 14,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 30,
      color: c.inkPrimary, letterSpacing: -0.8, lineHeight: 36,
    },
    subtitle: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 20, marginTop: 6, marginBottom: 28, fontStyle: 'italic',
    },

    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.inkSecondary, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 12,
    },

    optionsWrap: { gap: 10 },
    optionRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, overflow: 'hidden', paddingRight: 16,
    },
    optionBar: { width: 3, alignSelf: 'stretch' },
    optionIcon: { fontSize: 20, marginLeft: 14, marginVertical: 16 },
    optionLabel: {
      flex: 1, marginLeft: 12,
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: c.inkPrimary,
    },
    optionRadio: {
      width: 20, height: 20, borderRadius: 10,
      borderWidth: 1.5, borderColor: c.inkFaint,
      alignItems: 'center', justifyContent: 'center',
    },
    optionRadioDot: { width: 10, height: 10, borderRadius: 5 },

    zonasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    zonaChip: {
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright,
    },
    zonaChipOn: { backgroundColor: 'rgba(255,68,68,0.12)', borderColor: 'rgba(255,68,68,0.5)' },
    zonaChipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkSecondary },
    zonaChipTextOn: { color: c.red },

    notesInput: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15,
      minHeight: 88, textAlignVertical: 'top',
    },

    footer: {
      paddingHorizontal: 24, paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault,
      backgroundColor: c.bg,
    },
    primaryWrap: { borderRadius: 16, overflow: 'hidden' },
    primaryBtn: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#fff', letterSpacing: 0.2 },
    skipBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
    skipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkMuted },

    // Felicitación "Buen Trabajo" (centrada) tras Finalizar.
    doneCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    doneEmoji: { fontSize: 64, marginBottom: 18 },
    doneTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 44,
      color: c.inkPrimary, letterSpacing: -1.2, textAlign: 'center',
    },
  })
}
