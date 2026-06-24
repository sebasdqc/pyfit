import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, Linking, Pressable,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme, Palette } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiDelete } from '../../../lib/api'
import { fetchMiCoachUnread } from '../../../lib/coachApi'
import { logout } from '../../../lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  nombre: string; plan?: 'starter' | 'pro'
  plan_tipo?: 'mensual' | 'anual' | ''
  plan_renovacion?: string | null
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

// ─── GroupRow ─────────────────────────────────────────────────────────────────

function GroupRow({ icon, title, subtitle, badge, onPress, styles, colors }: {
  icon: string; title: string; subtitle?: string; badge?: string
  onPress: () => void; styles: ReturnType<typeof makeStyles>; colors: Colors
}) {
  return (
    <TouchableOpacity style={styles.groupRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.groupRowIcon}>{icon}</Text>
      <View style={styles.groupRowMid}>
        <Text style={styles.groupRowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.groupRowSub}>{subtitle}</Text>}
      </View>
      {!!badge && (
        <View style={styles.groupBadge}>
          <Text style={styles.groupBadgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight color={colors.inkMuted} />
    </TouchableOpacity>
  )
}

// ─── AdminRow ─────────────────────────────────────────────────────────────────

function AdminRow({ title, onPress, danger = false, styles, colors }: {
  title: string; onPress: () => void; danger?: boolean
  styles: ReturnType<typeof makeStyles>; colors: Colors
}) {
  return (
    <TouchableOpacity style={styles.adminRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.adminRowTitle, danger && { color: colors.red }]}>{title}</Text>
      {!danger && <ChevronRight color={colors.inkMuted} />}
    </TouchableOpacity>
  )
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT: Profile = { nombre: '', plan: 'starter', plan_tipo: '', plan_renovacion: null }

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AjustesScreen() {
  const { colors, palette, setPalette } = useTheme()
  const { t, lang } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<Profile>(DEFAULT)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [coachUnread, setCoachUnread] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [showPalettePicker, setShowPalettePicker] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [profileRes, statsRes, unreadRes] = await Promise.allSettled([
        apiGet('/api/profile/'),
        apiGet('/api/stats/profile/'),
        fetchMiCoachUnread(),
      ])
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value
        setProfile({ nombre: d.nombre || '', plan: d.plan, plan_tipo: d.plan_tipo, plan_renovacion: d.plan_renovacion })
      }
      if (statsRes.status === 'fulfilled') {
        setProfileStats(statsRes.value)
      }
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
      'Eliminar cuenta',
      'Se eliminará tu cuenta y todos tus datos (perfil, sesiones, historial, lesiones). Esta acción es permanente y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar definitivamente', style: 'destructive', onPress: confirmDeleteAccount },
      ]
    )
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
        'No pudimos eliminar tu cuenta',
        'Hubo un problema al conectar con el servidor. Inténtalo de nuevo o escríbenos a hola@pyfit.app para que la eliminemos manualmente.',
        [{ text: 'Entendido', style: 'cancel' }]
      )
    }
  }

  const PALETTE_OPTIONS: { id: Palette; label: string; icon: string; pro?: boolean }[] = [
    { id: 'dark',     label: t('perfil_palette_dark'),     icon: '🌙' },
    { id: 'light',    label: t('perfil_palette_light'),    icon: '☀️' },
    { id: 'rosado',   label: t('perfil_palette_rosado'),   icon: '🌸' },
    { id: 'midnight', label: t('perfil_palette_midnight'), icon: '🌌', pro: true },
    { id: 'sand',     label: t('perfil_palette_sand'),     icon: '🏜️', pro: true },
    { id: 'forest',   label: t('perfil_palette_forest'),   icon: '🌲', pro: true },
    { id: 'neon',     label: t('perfil_palette_neon'),     icon: '⚡', pro: true },
  ]
  const currentIcon = PALETTE_OPTIONS.find(o => o.id === palette)?.icon ?? '🌙'
  const currentLabel = PALETTE_OPTIONS.find(o => o.id === palette)?.label ?? ''

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* ── TOP BAR ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <ChevronLeft color={colors.inkPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Ajustes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Dismiss overlay for palette picker */}
      {showPalettePicker && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 99 }]}
          onPress={() => setShowPalettePicker(false)}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── APARIENCIA ── */}
        <Text style={styles.sectionLabel}>APARIENCIA</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.groupRow}
            onPress={() => setShowPalettePicker(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.groupRowIcon}>🎨</Text>
            <View style={styles.groupRowMid}>
              <Text style={styles.groupRowTitle}>Tema</Text>
              <Text style={styles.groupRowSub}>{currentIcon} {currentLabel}</Text>
            </View>
            <ChevronRight color={colors.inkMuted} />
          </TouchableOpacity>

          {showPalettePicker && (
            <>
              <View style={styles.divider} />
              <View style={[styles.paletteInline, { backgroundColor: colors.sheetBg }]}>
                {PALETTE_OPTIONS.map((opt, i) => (
                  <React.Fragment key={opt.id}>
                    {i > 0 && <View style={[styles.dropdownDivider, { backgroundColor: colors.borderDefault }]} />}
                    <TouchableOpacity
                      onPress={() => { setPalette(opt.id); setShowPalettePicker(false) }}
                      activeOpacity={0.7}
                      style={styles.dropdownRow}
                    >
                      <Text style={{ fontSize: 15 }}>{opt.icon}</Text>
                      <Text style={[styles.dropdownLabel, { color: palette === opt.id ? colors.accent : colors.inkSecondary }]}>
                        {opt.label}
                      </Text>
                      {opt.pro && (
                        <View style={styles.groupBadge}>
                          <Text style={styles.groupBadgeText}>Pro</Text>
                        </View>
                      )}
                      {palette === opt.id && (
                        <Text style={[styles.dropdownCheck, { color: colors.accent }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── MI PERFIL ── */}
        <Text style={styles.sectionLabel}>MI PERFIL</Text>
        <View style={styles.card}>
          <GroupRow icon="👤" title={t('perfil_section_account')} subtitle={t('perfil_card_account_sub')}
            onPress={() => router.push('/(app)/perfil/mi-cuenta' as any)} styles={styles} colors={colors} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="🏋️" title={t('perfil_section_training')} subtitle={t('perfil_card_training_sub')}
            onPress={() => router.push('/(app)/perfil/datos-entrenamiento' as any)} styles={styles} colors={colors} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="⌚" title={t('perfil_section_devices')} subtitle={t('perfil_row_devices_sub')}
            onPress={() => router.push('/(app)/perfil/tus-dispositivos' as any)} styles={styles} colors={colors} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="🧬" title={t('perfil_section_evidence')} subtitle={t('perfil_card_evidence_sub')}
            onPress={() => router.push('/(app)/perfil/evidencia' as any)} styles={styles} colors={colors} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="🧑‍🏫" title={t('perfil_section_coach_signup')} subtitle={t('perfil_card_coach_signup_sub')}
            badge={coachUnread > 0 ? (coachUnread > 9 ? '9+' : String(coachUnread)) : undefined}
            onPress={() => router.push('/(app)/perfil/registro-coach' as any)} styles={styles} colors={colors} />
        </View>

        {/* ── CUENTA ── */}
        <Text style={styles.sectionLabel}>CUENTA</Text>
        <View style={styles.adminCard}>
          {profile.plan === 'pro' ? (
            <GroupRow
              icon="👑"
              title={t('perfil_row_subscription')}
              subtitle={formatRenovacion(profile.plan_tipo, profile.plan_renovacion)}
              badge="Pro"
              onPress={() => {
                const tipoVal  = profile.plan_tipo || ''
                const renovVal = profile.plan_renovacion || ''
                const sesVal   = profileStats?.sesiones_mes ?? 0
                router.push(
                  `/(app)/perfil/suscripcion?modo=gestion&plan_tipo=${tipoVal}&plan_renovacion=${renovVal}&sesiones_mes=${sesVal}` as any
                )
              }}
              styles={styles} colors={colors}
            />
          ) : (
            <GroupRow
              icon="⭐"
              title={t('perfil_row_upgrade')}
              subtitle={lang === 'es' ? 'Desbloquea tu entrenador completo' : 'Unlock your full coach'}
              onPress={() => {
                const semanasVal = profileStats?.semanas_activas ?? 0
                const nombreVal  = encodeURIComponent(profile.nombre || '')
                router.push(`/(app)/perfil/suscripcion?modo=upgrade&nombre=${nombreVal}&semanas=${semanasVal}` as any)
              }}
              styles={styles} colors={colors}
            />
          )}
          <View style={styles.divider} />
          <AdminRow title={t('perfil_row_referrals')}
            onPress={() => router.push('/(app)/perfil/referidos' as any)} styles={styles} colors={colors} />
          <View style={styles.divider} />
          <AdminRow title={t('perfil_row_support')}
            onPress={() => Linking.openURL('mailto:hola@pyfit.app')} styles={styles} colors={colors} />
          <View style={styles.divider} />
          <AdminRow title={t('perfil_row_privacy')}
            onPress={() => router.push('/(auth)/privacidad' as any)} styles={styles} colors={colors} />
          <View style={styles.divider} />
          <AdminRow title={t('perfil_logout')} danger onPress={handleLogout} styles={styles} colors={colors} />
          <View style={styles.divider} />
          <AdminRow title="Eliminar cuenta" danger onPress={handleDeleteAccount} styles={styles} colors={colors} />
        </View>

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

    // Top bar
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

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

    // Section labels
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.inkMuted, letterSpacing: 2, textTransform: 'uppercase',
      marginBottom: 10, marginTop: 20, marginLeft: 4,
    },

    // Cards
    card: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, marginBottom: 14, overflow: 'hidden',
    },
    adminCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, marginBottom: 16, overflow: 'hidden',
    },

    // Group rows
    groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
    groupRowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    groupRowMid: { flex: 1, gap: 2 },
    groupRowTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    groupRowSub: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, letterSpacing: -0.1 },
    groupBadge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
      backgroundColor: 'rgba(255,170,50,0.22)',
      borderWidth: 1, borderColor: 'rgba(255,170,50,0.5)',
    },
    groupBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#b45309', letterSpacing: 0.5 },

    // Admin rows
    adminRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingVertical: 16,
    },
    adminRowTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    divider: { height: 1, backgroundColor: c.borderDefault, marginHorizontal: 18 },

    // Palette picker (inline)
    paletteInline: { borderRadius: 0 },
    dropdownRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 18, paddingVertical: 13,
    },
    dropdownLabel: { flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 },
    dropdownCheck: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 13 },
    dropdownDivider: { height: 1 },

    version: {
      color: c.inkFaint, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10, letterSpacing: 0.4, textAlign: 'center', marginBottom: 8, marginTop: 8,
    },
  })
}
