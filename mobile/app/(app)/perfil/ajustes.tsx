import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, Linking, ActivityIndicator, TextInput,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, readableTextOn } from '../../../lib/colors'
import { useTheme, Palette } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { useUnits, UnitSystem } from '../../../lib/units'
import { apiGet, apiDelete } from '../../../lib/api'
import { fetchMiCoachUnread } from '../../../lib/coachApi'
import { logout, verifyEmail, resendVerificationEmail } from '../../../lib/auth'
import { BILLING_ENABLED } from '../../../lib/featureFlags'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  nombre: string
  plan?: 'starter' | 'pro'
  plan_tipo?: 'mensual' | 'anual' | ''
  plan_renovacion?: string | null
  email_verificado?: boolean
}

interface ProfileStats {
  semanas_activas: number
  sesiones_mes: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_ABREV = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatRenovacion(planTipo: string | undefined, iso: string | null | undefined): string {
  const tipo = planTipo === 'anual' ? 'Anual' : 'Mensual'
  if (!iso) return tipo
  const [, m, d] = iso.split('-')
  const mes = MESES_ABREV[parseInt(m, 10) - 1] ?? ''
  const dia = parseInt(d, 10)
  if (!mes || !dia) return tipo
  return `${tipo} · Renueva el ${dia} ${mes}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Primitivos de layout ─────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: colors.inkMuted, letterSpacing: 2, textTransform: 'uppercase',
      marginBottom: 10, marginTop: 24, marginLeft: 4,
    }}>
      {label}
    </Text>
  )
}

function Divider() {
  const { colors } = useTheme()
  return <View style={{ height: 1, backgroundColor: colors.borderDefault, marginHorizontal: 18 }} />
}

function Row({
  icon, title, subtitle, badge, rightLabel, onPress, danger = false,
}: {
  icon?: string; title: string; subtitle?: string; badge?: string
  rightLabel?: string; onPress: () => void; danger?: boolean
}) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15, gap: 14 }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!!icon && <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</Text>}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{
          color: danger ? colors.red : colors.inkPrimary,
          fontFamily: 'SpaceGrotesk-Regular', fontSize: 15,
        }}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, letterSpacing: -0.1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!rightLabel && (
        <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 }}>
          {rightLabel}
        </Text>
      )}
      {!!badge && (
        <View style={{
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
          backgroundColor: 'rgba(255,170,50,0.22)',
          borderWidth: 1, borderColor: 'rgba(255,170,50,0.5)',
        }}>
          <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#b45309', letterSpacing: 0.5 }}>
            {badge}
          </Text>
        </View>
      )}
      {!danger && <ChevronRight color={colors.inkMuted} />}
    </TouchableOpacity>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{
      backgroundColor: colors.cardBg,
      borderWidth: 1, borderColor: colors.borderDefault,
      borderRadius: 20, overflow: 'hidden', marginBottom: 4,
    }}>
      {children}
    </View>
  )
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT: Profile = { nombre: '', plan: 'starter', plan_tipo: '', plan_renovacion: null, email_verificado: true }

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AjustesScreen() {
  const { colors, palette, setPalette } = useTheme()
  const { t, lang, setLang } = useTranslation()
  const { unitSystem, setUnitSystem } = useUnits()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<Profile>(DEFAULT)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [coachUnread, setCoachUnread] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Expandibles inline
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showUnitsPicker, setShowUnitsPicker] = useState(false)

  // Verificación de email
  const [showVerifyEmail, setShowVerifyEmail] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [profileRes, statsRes, unreadRes] = await Promise.allSettled([
        apiGet('/api/profile/'),
        apiGet('/api/stats/profile/'),
        fetchMiCoachUnread(),
      ])
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value
        setProfile({
          nombre: d.nombre || '', plan: d.plan, plan_tipo: d.plan_tipo, plan_renovacion: d.plan_renovacion,
          email_verificado: d.email_verificado ?? true,
        })
      }
      if (statsRes.status === 'fulfilled') setProfileStats(statsRes.value)
      setCoachUnread(unreadRes.status === 'fulfilled' ? (unreadRes.value?.no_leidos ?? 0) : 0)
    } catch {}
  }, [])

  useFocusEffect(useCallback(() => { fetchAll() }, [fetchAll]))

  async function handleLogout() {
    Alert.alert(t('perfil_logout_title'), t('perfil_logout_msg'), [
      { text: t('perfil_logout_cancel'), style: 'cancel' },
      {
        text: t('perfil_logout_confirm'), style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login') },
      },
    ])
  }

  function handleDeleteAccount() {
    if (deleting) return
    Alert.alert(
      t('ajt_delete_account'),
      t('ajt_delete_msg'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        { text: t('ajt_delete_confirm'), style: 'destructive', onPress: confirmDeleteAccount },
      ]
    )
  }

  function toggleVerifyEmail() {
    setVerifyCode('')
    setVerifyError('')
    setResendSent(false)
    setShowVerifyEmail(v => !v)
  }

  async function handleVerifyCode() {
    const code = verifyCode.trim()
    if (!code || verifying) return
    setVerifying(true)
    setVerifyError('')
    try {
      await verifyEmail(code)
      setShowVerifyEmail(false)
      setProfile(prev => ({ ...prev, email_verificado: true }))
    } catch (e: any) {
      setVerifyError(e?.message || t('ajt_verify_error_invalid'))
    } finally {
      setVerifying(false)
    }
  }

  async function handleResendCode() {
    if (resending) return
    setResending(true)
    setVerifyError('')
    try {
      await resendVerificationEmail()
      setResendSent(true)
    } catch {
      setVerifyError(t('ajt_verify_error_resend'))
    } finally {
      setResending(false)
    }
  }

  async function handleExportData() {
    if (exporting) return
    setExporting(true)
    try {
      const { exportMonthlyReport } = await import('../../../lib/monthlyReport')
      await exportMonthlyReport()
    } catch (e: any) {
      Alert.alert(t('ajt_export_error_title'), e?.message ?? t('ajt_export_error_msg'))
    } finally {
      setExporting(false)
    }
  }

  async function confirmDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    try {
      await apiDelete('/api/auth/account/')
      await logout()
      router.replace('/(auth)/login')
    } catch {
      setDeleting(false)
      Alert.alert(
        t('ajt_delete_error_title'),
        t('ajt_delete_error_msg'),
        [{ text: t('ajt_understood'), style: 'cancel' }]
      )
    }
  }

  // Opciones de paleta
  const PALETTE_OPTIONS: { id: Palette; label: string; icon: string; pro?: boolean }[] = [
    { id: 'dark',     label: t('perfil_palette_dark'),     icon: '🌙' },
    { id: 'light',    label: t('perfil_palette_light'),    icon: '☀️' },
    { id: 'rosado',   label: t('perfil_palette_rosado'),   icon: '🌸' },
    { id: 'midnight', label: t('perfil_palette_midnight'), icon: '🌌', pro: true },
    { id: 'sand',     label: t('perfil_palette_sand'),     icon: '🏜️', pro: true },
    { id: 'forest',   label: t('perfil_palette_forest'),   icon: '🌲', pro: true },
    { id: 'neon',     label: t('perfil_palette_neon'),     icon: '⚡', pro: true },
    { id: 'ocean',    label: t('perfil_palette_ocean'),    icon: '🌊', pro: true },
  ]
  const currentPaletteIcon  = PALETTE_OPTIONS.find(o => o.id === palette)?.icon ?? '🌙'
  const currentPaletteLabel = PALETTE_OPTIONS.find(o => o.id === palette)?.label ?? ''

  // Suscripción helpers
  function navigateToSuscripcion() {
    if (profile.plan === 'pro') {
      router.push(
        `/(app)/perfil/suscripcion?modo=gestion&plan_tipo=${profile.plan_tipo ?? ''}&plan_renovacion=${profile.plan_renovacion ?? ''}&sesiones_mes=${profileStats?.sesiones_mes ?? 0}` as any
      )
    } else {
      const semanasVal = profileStats?.semanas_activas ?? 0
      const nombreVal  = encodeURIComponent(profile.nombre || '')
      router.push(`/(app)/perfil/suscripcion?modo=upgrade&nombre=${nombreVal}&semanas=${semanasVal}` as any)
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* ── TOP BAR ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <ChevronLeft color={colors.inkPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('ajt_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ══════════════════════════════════════════ */}
        {/* APARIENCIA                                 */}
        {/* ══════════════════════════════════════════ */}
        <SectionLabel label={t('ajt_section_appearance')} />
        <Card>
          <Row
            icon="🎨"
            title={t('ajt_theme')}
            subtitle={`${currentPaletteIcon}  ${currentPaletteLabel}`}
            onPress={() => { setShowLangPicker(false); setShowThemePicker(v => !v) }}
          />
          {showThemePicker && (
            <>
              <Divider />
              {PALETTE_OPTIONS.map((opt, i) => (
                <React.Fragment key={opt.id}>
                  {i > 0 && <Divider />}
                  <TouchableOpacity
                    onPress={() => {
                      if (opt.pro && profile.plan !== 'pro') {
                        setShowThemePicker(false)
                        Alert.alert(
                          t('ajt_palette_pro_title'),
                          `"${opt.label}" ${t('ajt_palette_pro_msg')}`,
                          // Sin Play Billing no ofrecemos el CTA de compra (BILLING_ENABLED).
                          BILLING_ENABLED
                            ? [
                                { text: t('ajt_not_now'), style: 'cancel' },
                                { text: t('ajt_see_pro'), onPress: navigateToSuscripcion },
                              ]
                            : [{ text: 'OK' }]
                        )
                        return
                      }
                      setPalette(opt.id)
                      setShowThemePicker(false)
                    }}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 13 }}
                  >
                    <Text style={{ fontSize: 15 }}>{opt.icon}</Text>
                    <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: palette === opt.id ? colors.accent : colors.inkSecondary }}>
                      {opt.label}
                    </Text>
                    {opt.pro && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,170,50,0.22)', borderWidth: 1, borderColor: 'rgba(255,170,50,0.5)' }}>
                        <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: '#b45309' }}>Pro</Text>
                      </View>
                    )}
                    {palette === opt.id && (
                      <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 13, color: colors.accent }}>✓</Text>
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </>
          )}
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* MI CUENTA                                  */}
        {/* ══════════════════════════════════════════ */}
        <SectionLabel label={t('perfil_section_account')} />
        <Card>
          {profile.email_verificado === false && (
            <>
              <Row
                icon="⚠️"
                title={t('ajt_verify_title')}
                subtitle={t('ajt_verify_sub')}
                badge={t('ajt_verify_pending')}
                onPress={toggleVerifyEmail}
              />
              {showVerifyEmail && (
                <View style={{ paddingHorizontal: 22, paddingBottom: 18, paddingTop: 4, gap: 10 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: colors.inkMuted, lineHeight: 18 }}>
                    {t('ajt_verify_instructions')}
                  </Text>
                  <TextInput
                    value={verifyCode}
                    onChangeText={t => setVerifyCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{
                      backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.borderBright,
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                      color: colors.inkPrimary, fontFamily: 'JetBrainsMono-Regular', fontSize: 16, letterSpacing: 4,
                    }}
                  />
                  {!!verifyError && (
                    <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: colors.red }}>{verifyError}</Text>
                  )}
                  {resendSent && (
                    <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: colors.green }}>{t('ajt_verify_resent')}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={handleVerifyCode}
                      disabled={verifyCode.length !== 6 || verifying}
                      activeOpacity={0.8}
                      style={{
                        flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
                        backgroundColor: colors.accent, opacity: (verifyCode.length !== 6 || verifying) ? 0.5 : 1,
                      }}
                    >
                      {verifying
                        ? <ActivityIndicator size="small" color={readableTextOn(colors.accent)} />
                        : <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 13, color: readableTextOn(colors.accent) }}>{t('ajt_verify_btn')}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleResendCode}
                      disabled={resending}
                      activeOpacity={0.7}
                      style={{
                        borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
                        borderWidth: 1, borderColor: colors.borderBright, opacity: resending ? 0.5 : 1,
                      }}
                    >
                      {resending
                        ? <ActivityIndicator size="small" color={colors.inkSecondary} />
                        : <Text style={{ fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: colors.inkSecondary }}>{t('ajt_verify_resend')}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <Divider />
            </>
          )}
          <Row
            icon="👤"
            title={t('perfil_row_personal')}
            onPress={() => router.push('/(app)/perfil/datos-personales' as any)}
          />
          <Divider />
          <Row
            icon="🔐"
            title={t('ajt_account_title')}
            subtitle={t('ajt_account_sub')}
            onPress={() => router.push('/(app)/perfil/mi-cuenta' as any)}
          />
          <Divider />
          <Row
            icon="🔔"
            title={t('ajt_notifications_title')}
            subtitle={t('ajt_notifications_sub')}
            onPress={() => router.push('/(app)/notificaciones' as any)}
          />
          {/* Suscripción/Upgrade: oculto mientras no haya Play Billing (BILLING_ENABLED). */}
          {BILLING_ENABLED && (
            <>
              <Divider />
              {profile.plan === 'pro' ? (
                <Row
                  icon="👑"
                  title={t('perfil_row_subscription')}
                  subtitle={formatRenovacion(profile.plan_tipo, profile.plan_renovacion)}
                  badge="Pro"
                  onPress={navigateToSuscripcion}
                />
              ) : (
                <Row
                  icon="⭐"
                  title={t('perfil_row_upgrade')}
                  subtitle={lang === 'pt' ? 'Desbloqueie seu treinador completo' : lang === 'en' ? 'Unlock your full coach' : lang === 'fr' ? 'Débloquez votre coach complet' : 'Desbloquea tu entrenador completo'}
                  onPress={navigateToSuscripcion}
                />
              )}
            </>
          )}
          <Divider />
          <Row
            icon="🎁"
            title={t('perfil_row_referrals')}
            onPress={() => router.push('/(app)/perfil/referidos' as any)}
          />
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* PREFERENCIAS                               */}
        {/* ══════════════════════════════════════════ */}
        <SectionLabel label={t('ajt_section_preferences')} />
        <Card>
          <Row
            icon="🎯"
            title={t('perfil_row_objectives')}
            onPress={() => router.push('/(app)/perfil/objetivos' as any)}
          />
          <Divider />
          <Row
            icon="📍"
            title={t('perfil_row_locations')}
            onPress={() => router.push('/(app)/perfil/ubicaciones' as any)}
          />
          <Divider />
          <Row
            icon="⚙️"
            title={t('perfil_row_preferences')}
            onPress={() => router.push('/(app)/perfil/preferencias' as any)}
          />
          <Divider />
          <Row
            icon="🏋️"
            title={t('perfil_row_training')}
            onPress={() => router.push('/(app)/perfil/entrenamiento' as any)}
          />
          <Divider />
          <Row
            icon="🩹"
            title={t('perfil_row_injuries')}
            onPress={() => router.push('/(app)/perfil/lesiones' as any)}
          />
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* TUS DATOS                                  */}
        {/* ══════════════════════════════════════════ */}
        <SectionLabel label={t('perfil_section_data')} />
        <Card>
          <Row
            icon="⌚"
            title={t('perfil_section_devices')}
            subtitle={t('perfil_row_devices_sub')}
            onPress={() => router.push('/(app)/perfil/tus-dispositivos' as any)}
          />
          <Divider />
          {/* Lenguaje — expandible inline */}
          <Row
            icon="🌐"
            title={t('perfil_lang_label')}
            rightLabel={({ es: '🇪🇸  ES', en: '🇺🇸  EN', pt: '🇧🇷  PT', fr: '🇫🇷  FR' } as Record<string, string>)[lang] ?? '🇪🇸  ES'}
            onPress={() => { setShowThemePicker(false); setShowLangPicker(v => !v) }}
          />
          {showLangPicker && (
            <>
              <Divider />
              {([
                { code: 'es' as const, flag: '🇪🇸', label: t('perfil_lang_es') },
                { code: 'en' as const, flag: '🇺🇸', label: t('perfil_lang_en') },
                { code: 'pt' as const, flag: '🇧🇷', label: t('perfil_lang_pt') },
                { code: 'fr' as const, flag: '🇫🇷', label: t('perfil_lang_fr') },
              ]).map((opt, i) => (
                <React.Fragment key={opt.code}>
                  {i > 0 && <Divider />}
                  <TouchableOpacity
                    onPress={() => { setLang(opt.code); setShowLangPicker(false) }}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 13 }}
                  >
                    <Text style={{ fontSize: 15 }}>{opt.flag}</Text>
                    <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: lang === opt.code ? colors.accent : colors.inkSecondary }}>
                      {opt.label}
                    </Text>
                    {lang === opt.code && (
                      <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 13, color: colors.accent }}>✓</Text>
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </>
          )}
          <Divider />
          <Row
            icon="📐"
            title={t('ajt_units_title')}
            rightLabel={unitSystem === 'imperial' ? '🇺🇸 lb / in' : '📏 kg / cm'}
            onPress={() => { setShowThemePicker(false); setShowLangPicker(false); setShowUnitsPicker(v => !v) }}
          />
          {showUnitsPicker && (
            <>
              <Divider />
              {([
                { id: 'metric' as UnitSystem, icon: '📏', label: t('ajt_units_metric') },
                { id: 'imperial' as UnitSystem, icon: '🇺🇸', label: t('ajt_units_imperial') },
              ]).map((opt, i) => (
                <React.Fragment key={opt.id}>
                  {i > 0 && <Divider />}
                  <TouchableOpacity
                    onPress={() => { setUnitSystem(opt.id); setShowUnitsPicker(false) }}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 13 }}
                  >
                    <Text style={{ fontSize: 15 }}>{opt.icon}</Text>
                    <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: unitSystem === opt.id ? colors.accent : colors.inkSecondary }}>
                      {opt.label}
                    </Text>
                    {unitSystem === opt.id && (
                      <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 13, color: colors.accent }}>✓</Text>
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </>
          )}
          <Divider />
          <Row
            icon="🔗"
            title={t('ajt_integrations_title')}
            subtitle={t('ajt_integrations_sub')}
            onPress={() => router.push('/(app)/perfil/dispositivos' as any)}
          />
          {/* Historial de pagos: oculto mientras no haya Play Billing (BILLING_ENABLED). */}
          {BILLING_ENABLED && (
            <>
              <Divider />
              <Row
                icon="📊"
                title={t('ajt_reports_title')}
                subtitle={t('ajt_reports_sub')}
                onPress={() => router.push('/(app)/perfil/historial-pagos' as any)}
              />
            </>
          )}
          <Divider />
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15, gap: 14 }}
            onPress={handleExportData}
            activeOpacity={0.7}
            disabled={exporting}
          >
            <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>📤</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 }}>
                {t('ajt_export_title')}
              </Text>
              <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, letterSpacing: -0.1 }}>
                {exporting ? t('ajt_export_generating') : t('ajt_export_sub')}
              </Text>
            </View>
            {exporting
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <ChevronRight color={colors.inkMuted} />
            }
          </TouchableOpacity>
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* EVIDENCIA                                  */}
        {/* ══════════════════════════════════════════ */}
        <SectionLabel label={t('perfil_section_evidence').toUpperCase()} />
        <Card>
          <Row
            icon="🧬"
            title={t('perfil_row_how_coach')}
            onPress={() => router.push('/(app)/perfil/ciencia' as any)}
          />
          <Divider />
          <Row
            icon="📚"
            title={t('perfil_row_bibliography')}
            onPress={() => router.push('/(app)/perfil/bibliografia' as any)}
          />
          <Divider />
          <Row
            icon="📖"
            title={t('perfil_row_glossary')}
            onPress={() => router.push('/(app)/perfil/glosario' as any)}
          />
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* REGISTRO CON COACH (card standalone)       */}
        {/* ══════════════════════════════════════════ */}
        <SectionLabel label={t('perfil_section_coach')} />
        <Card>
          <Row
            icon="🧑‍🏫"
            title={t('perfil_section_coach_signup')}
            subtitle={t('perfil_card_coach_signup_sub')}
            badge={coachUnread > 0 ? (coachUnread > 9 ? '9+' : String(coachUnread)) : undefined}
            onPress={() => router.push('/(app)/perfil/registro-coach' as any)}
          />
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* AYUDA                                      */}
        {/* ══════════════════════════════════════════ */}
        <SectionLabel label={t('ajt_section_help')} />
        <Card>
          <Row
            icon="💬"
            title={t('perfil_row_support')}
            onPress={() => Linking.openURL('mailto:hola@zyfit.app')}
          />
          <Divider />
          <Row
            icon="🚩"
            title={t('ajt_report_ai_title')}
            subtitle={t('ajt_report_ai_sub')}
            onPress={() => router.push('/(app)/perfil/reportar-contenido' as any)}
          />
          <Divider />
          <Row
            icon="🔒"
            title={t('perfil_row_privacy')}
            onPress={() => router.push('/(auth)/privacidad' as any)}
          />
          <Divider />
          <Row
            icon="📄"
            title={t('ajt_terms')}
            onPress={() => router.push('/(auth)/terminos' as any)}
          />
          <Divider />
          <Row
            icon="♿"
            title={t('ajt_accessibility_title')}
            subtitle={t('common_soon')}
            onPress={() => Alert.alert(t('common_soon'), t('ajt_accessibility_msg'))}
          />
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* ACCIONES DE CUENTA (sin header, al fondo)  */}
        {/* ══════════════════════════════════════════ */}
        <View style={{ height: 16 }} />
        <Card>
          <Row title={t('perfil_logout')} danger onPress={handleLogout} />
          <Divider />
          <Row title={t('ajt_delete_account')} danger onPress={handleDeleteAccount} />
        </Card>

        <Text style={styles.version}>{t('perfil_version')}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 17, letterSpacing: -0.4,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
    version: {
      color: c.inkFaint, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10, letterSpacing: 0.4, textAlign: 'center',
      marginTop: 16, marginBottom: 8,
    },
  })
}
