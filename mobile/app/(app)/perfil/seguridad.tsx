import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, readableTextOn } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPost } from '../../../lib/api'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.sectionLabel}>{text}</Text>
}

function PasswordInput({ value, onChangeText, placeholder, show, styles, colors }: {
  value: string; onChangeText: (v: string) => void; placeholder: string
  show: boolean; styles: ReturnType<typeof makeStyles>; colors: Colors
}) {
  return (
    <TextInput
      style={styles.input}
      value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={colors.inkMuted}
      secureTextEntry={!show}
      autoCapitalize="none" autoCorrect={false}
    />
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SeguridadScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [currentEmail, setCurrentEmail] = useState('')

  // ── Contraseña ──
  const [showPw, setShowPw] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  // ── Email ──
  const [emailStep, setEmailStep] = useState<'idle' | 'code'>('idle')
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [code, setCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [confirmingCode, setConfirmingCode] = useState(false)

  useFocusEffect(useCallback(() => {
    apiGet('/api/profile/').then((d: any) => setCurrentEmail(d.email ?? '')).catch(() => {})
  }, []))

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('sec_error_title'), t('sec_pw_fields_required'))
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('sec_error_title'), t('sec_pw_mismatch'))
      return
    }
    setSavingPw(true)
    try {
      await apiPost('/api/auth/change-password/', { current_password: currentPassword, new_password: newPassword })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      Alert.alert(t('sec_pw_success_title'), t('sec_pw_success_msg'))
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('sec_pw_error'))
    } finally {
      setSavingPw(false)
    }
  }

  async function handleSendEmailCode() {
    if (!newEmail || !emailPassword) {
      Alert.alert(t('sec_error_title'), t('sec_email_fields_required'))
      return
    }
    setSendingCode(true)
    try {
      await apiPost('/api/auth/change-email/', { new_email: newEmail, password: emailPassword })
      setPendingEmail(newEmail)
      setEmailStep('code')
      setCode('')
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('sec_email_send_error'))
    } finally {
      setSendingCode(false)
    }
  }

  async function handleConfirmEmailCode() {
    if (!code) {
      Alert.alert(t('sec_error_title'), t('sec_email_code_required'))
      return
    }
    setConfirmingCode(true)
    try {
      const data = await apiPost('/api/auth/confirm-email-change/', { code })
      setCurrentEmail(data.email ?? pendingEmail)
      setEmailStep('idle')
      setNewEmail(''); setEmailPassword(''); setCode(''); setPendingEmail('')
      Alert.alert(t('sec_email_success_title'), t('sec_email_success_msg'))
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('sec_email_confirm_error'))
    } finally {
      setConfirmingCode(false)
    }
  }

  function handleCancelEmailChange() {
    setEmailStep('idle')
    setNewEmail(''); setEmailPassword(''); setCode(''); setPendingEmail('')
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
        <Text style={styles.headerTitle}>{t('sec_title')}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Contraseña ── */}
          <SectionLabel text={t('sec_password_section')} styles={styles} />
          <View style={styles.card}>
            <PasswordInput value={currentPassword} onChangeText={setCurrentPassword}
              placeholder={t('sec_current_password')} show={showPw} styles={styles} colors={colors} />
            <View style={{ height: 10 }} />
            <PasswordInput value={newPassword} onChangeText={setNewPassword}
              placeholder={t('sec_new_password')} show={showPw} styles={styles} colors={colors} />
            <View style={{ height: 10 }} />
            <PasswordInput value={confirmPassword} onChangeText={setConfirmPassword}
              placeholder={t('sec_confirm_password')} show={showPw} styles={styles} colors={colors} />

            <TouchableOpacity onPress={() => setShowPw(v => !v)} activeOpacity={0.7} style={styles.eyeToggle}>
              <Text style={styles.eyeToggleText}>{showPw ? t('login_hide_password') : t('login_show_password')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, savingPw && { opacity: 0.5 }]}
              onPress={handleChangePassword} disabled={savingPw} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{savingPw ? t('common_loading') : t('sec_pw_save')}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Email ── */}
          <SectionLabel text={t('sec_email_section')} styles={styles} />
          <View style={styles.card}>
            <Text style={styles.currentEmailLabel}>{t('sec_current_email')}</Text>
            <Text style={styles.currentEmailValue}>{currentEmail || '—'}</Text>

            {emailStep === 'idle' ? (
              <>
                <View style={{ height: 16 }} />
                <TextInput
                  style={styles.input}
                  value={newEmail} onChangeText={setNewEmail}
                  placeholder={t('sec_new_email')} placeholderTextColor={colors.inkMuted}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                />
                <View style={{ height: 10 }} />
                <PasswordInput value={emailPassword} onChangeText={setEmailPassword}
                  placeholder={t('sec_confirm_with_password')} show={showPw} styles={styles} colors={colors} />

                <TouchableOpacity
                  style={[styles.saveBtn, sendingCode && { opacity: 0.5 }]}
                  onPress={handleSendEmailCode} disabled={sendingCode} activeOpacity={0.85}>
                  <Text style={styles.saveBtnText}>{sendingCode ? t('common_loading') : t('sec_email_send_code')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ height: 16 }} />
                <Text style={styles.codeHint}>{t('sec_email_code_sent_to')} {pendingEmail}</Text>
                <View style={{ height: 10 }} />
                <TextInput
                  style={styles.input}
                  value={code} onChangeText={setCode}
                  placeholder="000000" placeholderTextColor={colors.inkMuted}
                  keyboardType="number-pad" maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, confirmingCode && { opacity: 0.5 }]}
                  onPress={handleConfirmEmailCode} disabled={confirmingCode} activeOpacity={0.85}>
                  <Text style={styles.saveBtnText}>{confirmingCode ? t('common_loading') : t('sec_email_confirm')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelEmailChange} activeOpacity={0.7} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>{t('common_cancel')}</Text>
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
    sectionLabel: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },
    card: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 16, marginBottom: 24,
    },
    input: { backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    eyeToggle: { alignSelf: 'flex-start', marginTop: 10 },
    eyeToggleText: { color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 12 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
    saveBtnText: { color: readableTextOn(c.accent), fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
    cancelBtn: { alignItems: 'center', marginTop: 12 },
    cancelBtnText: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    currentEmailLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
    currentEmailValue: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: c.inkPrimary },
    codeHint: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkSecondary, lineHeight: 19 },
  })
}
