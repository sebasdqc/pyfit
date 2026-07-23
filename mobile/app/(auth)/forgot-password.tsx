import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS } from '../../lib/colors'
import { Colors } from '../../lib/colors'
import { useTheme } from '../../lib/theme'
import { apiPost } from '../../lib/api'
import { useTranslation } from '../../lib/i18n'

// ─── OTP input (6 boxes) ──────────────────────────────────────────────────────

function OTPInput({
  value,
  onChange,
  colors,
}: {
  value: string
  onChange: (v: string) => void
  colors: Colors
}) {
  const inputRef = useRef<RNTextInput>(null)
  const digits = value.padEnd(6, ' ').split('')

  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
        {digits.map((d, i) => {
          const filled = i < value.length
          const focused = i === value.length
          return (
            <View
              key={i}
              style={{
                width: 46,
                height: 56,
                borderRadius: 12,
                borderWidth: focused ? 2 : 1,
                borderColor: focused
                  ? colors.accent
                  : filled
                  ? colors.borderBright
                  : colors.borderDefault,
                backgroundColor: colors.glassBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={{
                  fontFamily: 'SpaceGrotesk-Bold',
                  fontSize: 22,
                  color: colors.inkPrimary,
                  letterSpacing: 0,
                }}
              >
                {filled ? d : ''}
              </Text>
            </View>
          )
        })}
      </View>
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        autoFocus
      />
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const { t, lang } = useTranslation()

  const [step, setStep] = useState<'email' | 'verify'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSendCode() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError(t('forgot_error_required'))
      return
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setError(lang === 'es' ? 'El correo no tiene un formato válido.' : 'Please enter a valid email address.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiPost('/api/auth/reset-password/', { email: trimmed }, false)
      setStep('verify')
    } catch {
      // Always advance — don't leak whether the email exists
      setStep('verify')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (code.length < 6) {
      setError(t('forgot_error_code_required'))
      return
    }
    if (!newPassword) {
      setError(t('forgot_error_pass_required'))
      return
    }
    if (newPassword.length < 8) {
      setError(t('forgot_error_pass_short'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('forgot_error_pass_mismatch'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiPost(
        '/api/auth/confirm-reset/',
        { email: email.trim().toLowerCase(), code, new_password: newPassword },
        false,
      )
      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Código inválido o expirado.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[colors.gradientTop, 'transparent']}
          style={styles.gradient}
        />
        <View style={styles.centered}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>{t('forgot_success_title')}</Text>
          <Text style={styles.successSub}>{t('forgot_success_subtitle')}</Text>
          <TouchableOpacity
            style={styles.primaryBtnWrap}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>{t('forgot_btn_back')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backText}>{t('forgot_back_arrow')}</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'email' ? t('forgot_title') : t('forgot_step2_title')}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? t('forgot_step1_subtitle')
                : lang === 'es'
                  ? `Revisa tu correo ${email} e ingresa el código que te enviamos.`
                  : `Check your email ${email} and enter the code we sent you.`}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {step === 'email' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('forgot_email_label')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('forgot_email_placeholder')}
                    placeholderTextColor={colors.inkMuted}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError('') }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

                <TouchableOpacity
                  style={styles.primaryBtnWrap}
                  onPress={handleSendCode}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.accent, colors.accentDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>{t('forgot_btn_send')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 16 }]}>
                    {t('forgot_code_label')}
                  </Text>
                  <OTPInput value={code} onChange={(v) => { setCode(v); setError('') }} colors={colors} />
                </View>

                <View style={[styles.inputGroup, { marginTop: 24 }]}>
                  <Text style={styles.inputLabel}>{t('forgot_newpass_label')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={lang === 'es' ? 'Mínimo 8 caracteres' : 'Minimum 8 characters'}
                    placeholderTextColor={colors.inkMuted}
                    value={newPassword}
                    onChangeText={(t) => { setNewPassword(t); setError('') }}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('forgot_confirmpass_label')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={lang === 'es' ? 'Repite la contraseña' : 'Repeat your password'}
                    placeholderTextColor={colors.inkMuted}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError('') }}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

                <TouchableOpacity
                  style={styles.primaryBtnWrap}
                  onPress={handleConfirm}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.accent, colors.accentDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>{t('forgot_btn_change')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => { setStep('email'); setCode(''); setError('') }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>
                    {t('forgot_resend_question')} <Text style={{ color: colors.accentLight }}>{t('forgot_btn_resend')}</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
    },
    backBtn: { marginBottom: 32 },
    backText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.accentLight,
    },
    header: { marginBottom: 32 },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    subtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      lineHeight: 21,
    },
    card: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 24,
      padding: 24,
    },
    inputGroup: { marginBottom: 16 },
    inputLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 16,
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
    },
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.25)',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    errorText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.red,
    },
    primaryBtnWrap: {
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
    },
    primaryBtn: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      color: c.white,
      letterSpacing: 0.2,
    },
    resendBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    resendText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.accentLight,
    },
    successIcon: {
      fontSize: 56,
      color: c.green,
      marginBottom: 8,
    },
    successTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 24,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    successSub: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
    },
  })
}
