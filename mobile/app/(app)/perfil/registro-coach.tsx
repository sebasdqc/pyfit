import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiPost } from '../../../lib/api'

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegistroCoachScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [codigo, setCodigo]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [coachNombre, setCoachNombre] = useState<string | null>(null)

  const canSubmit = codigo.trim().length >= 4 && !loading

  async function vincular() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiPost('/api/coach/vincular/', { codigo: codigo.trim().toUpperCase() })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setCoachNombre(res?.coach_nombre || 'tu coach')
    } catch (e: any) {
      setError(e?.message || 'No se pudo vincular. Verifica el código.')
    } finally {
      setLoading(false)
    }
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
        <Text style={styles.headerTitle}>Registro con Coach</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 12}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, alignItems: 'center' }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 40 }}>🧑‍🏫</Text>
          </View>

          {coachNombre ? (
            // ── Estado vinculado ──────────────────────────────────────────────
            <>
              <Text style={styles.title}>¡Listo!</Text>
              <Text style={styles.description}>
                Te vinculaste con <Text style={{ color: colors.inkPrimary }}>{coachNombre}</Text>. Ahora podrá ver tu
                progreso y acompañar tu entrenamiento.
              </Text>
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successText}>Vinculado con {coachNombre}</Text>
              </View>
              <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={() => router.back()}>
                <Text style={styles.secondaryBtnText}>VOLVER AL PERFIL</Text>
              </TouchableOpacity>
            </>
          ) : (
            // ── Estado entrada de código ──────────────────────────────────────
            <>
              <Text style={styles.title}>Vincúlate con tu coach</Text>
              <Text style={styles.description}>
                Ingresa el código que te compartió tu entrenador para unirte a su cartera.
              </Text>

              <Text style={styles.sectionLabel}>CÓDIGO DE COACH</Text>
              <TextInput
                style={styles.codeInput}
                value={codigo}
                onChangeText={(v) => { setCodigo(v.toUpperCase()); if (error) setError(null) }}
                placeholder="——————"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={vincular}
                editable={!loading}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.primaryBtn, !canSubmit && styles.btnDisabled]}
                activeOpacity={0.85}
                disabled={!canSubmit}
                onPress={vincular}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.primaryBtnText}>VINCULARME</Text>}
              </TouchableOpacity>

              <Text style={styles.hint}>
                ¿No tienes un código? Pídeselo a tu coach: lo encuentra en su portal.
              </Text>
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
    iconCircle: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: 'rgba(79,140,255,0.1)',
      borderWidth: 1, borderColor: 'rgba(79,140,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
      marginTop: 24, marginBottom: 20,
    },
    title: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22, letterSpacing: -0.7, marginBottom: 12, textAlign: 'center',
    },
    description: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, lineHeight: 22, textAlign: 'center',
      marginBottom: 28, paddingHorizontal: 8,
    },
    sectionLabel: {
      alignSelf: 'flex-start',
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
    },
    codeInput: {
      width: '100%',
      backgroundColor: c.glassBg,
      borderWidth: 1, borderColor: c.accent, borderRadius: 18,
      paddingVertical: 20, minHeight: 72,
      color: c.inkPrimary, fontFamily: 'JetBrainsMono-Medium',
      fontSize: 30, letterSpacing: 8, textAlign: 'center',
      marginBottom: 16,
    },
    errorText: {
      alignSelf: 'flex-start',
      color: '#ff8585', fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, marginBottom: 12, marginTop: -4,
    },
    primaryBtn: {
      width: '100%', backgroundColor: c.accent, borderRadius: 14,
      paddingVertical: 15, alignItems: 'center', marginBottom: 16, minHeight: 50, justifyContent: 'center',
    },
    primaryBtnText: { color: c.white, fontFamily: 'JetBrainsMono-Medium', fontSize: 12, letterSpacing: 0.8 },
    btnDisabled: { opacity: 0.45 },
    secondaryBtn: {
      width: '100%', backgroundColor: 'transparent',
      borderWidth: 1, borderColor: c.borderBright, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center', marginTop: 8,
    },
    secondaryBtnText: { color: c.inkSecondary, fontFamily: 'JetBrainsMono-Regular', fontSize: 12, letterSpacing: 0.8 },
    hint: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 12,
    },
    successCard: {
      width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: 'rgba(50,200,150,0.1)',
      borderWidth: 1, borderColor: 'rgba(50,200,150,0.3)',
      borderRadius: 16, padding: 18, marginBottom: 18,
    },
    successIcon: { color: c.green, fontFamily: 'SpaceGrotesk-Bold', fontSize: 20 },
    successText: { flex: 1, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
