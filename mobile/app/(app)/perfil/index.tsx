import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking, Modal, Pressable, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme, Palette } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPost } from '../../../lib/api'
import { fetchMiCoachUnread } from '../../../lib/coachApi'
import { logout } from '../../../lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location { id?: number; nombre: string; tipo: string; implementos: string[] }

interface Profile {
  nombre: string; objetivo: string; objetivos_multiples: string[]
  nivel: string; peso: string; altura: string; sexo: string
  estilo_entrenamiento: string; usa_ciclo_menstrual: boolean
  dias_semana: number; horario_preferido: string; email?: string
  fecha_nacimiento: string; racha_actual: number; puntos_totales: number
  logros: any[]; locations: Location[]
  experiencia_deportiva: string; lesiones: string
  ejercicios_favoritos: string; ejercicios_evitar: string
  rm_sentadilla: string; rm_peso_muerto: string; rm_press_banca: string; rm_press_hombro: string
  nivel_estres: string; tipo_trabajo: string
  // Suscripción — el backend emite estos campos como read-only desde el ProfileSerializer.
  plan?: 'starter' | 'pro'
  plan_tipo?: 'mensual' | 'anual' | ''
  plan_renovacion?: string | null
  avatar?: string  // base64 dataURI
}

interface ProfileStats {
  semanas_activas: number
  consistencia_30d: number
  sesiones_mes: number
  datos_medidos_30d: number
  adn_entrenamiento?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

// Agrupa miles con el separador local (1.284 / 1,284) sin depender de Intl
function agruparMiles(n: number, sep: string) {
  return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

function nivelLabel(nivel: string) {
  return ({ rookie: 'Rookie', atleta: 'Atleta', elite: 'Élite', leyenda: 'Leyenda' } as any)[nivel?.toLowerCase()] ?? nivel ?? 'Rookie'
}

const MESES_ABREV = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatRenovacion(planTipo: string | undefined, iso: string | null | undefined): string {
  // Formato consistente para el subtítulo del entry Pro:
  // "Mensual · Renueva el 15 jun". Si no llega fecha, omitimos esa parte.
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ width, height, borderRadius = 8, style }: {
  width: number | string; height: number; borderRadius?: number; style?: object
}) {
  const { colors } = useTheme()
  return <View style={[{ width: width as any, height, borderRadius, backgroundColor: colors.glassBg }, style]} />
}

// ─── ADN Card ─────────────────────────────────────────────────────────────────

function ADNCard({ texto, styles, dnaLabel, tagLabel }: {
  texto: string; styles: ReturnType<typeof makeStyles>
  dnaLabel: string; tagLabel: string
}) {
  return (
    <View style={styles.adnWrap}>
      <Text style={styles.adnSectionLabel}>{dnaLabel}</Text>
      <View style={styles.adnCard}>
        <View style={styles.adnBar} />
        <View style={styles.adnContent}>
          <View style={styles.adnTagRow}>
            <View style={styles.adnTag}>
              <Text style={styles.adnTagText}>{tagLabel}</Text>
            </View>
          </View>
          <Text style={styles.adnText}>{texto}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Group Row ────────────────────────────────────────────────────────────────

function GroupRow({ icon, title, subtitle, badge, onPress, styles }: {
  icon: string; title: string; subtitle?: string; badge?: string
  onPress: () => void; styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
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

// ─── Admin Row ────────────────────────────────────────────────────────────────

function AdminRow({ title, onPress, danger = false, styles }: {
  title: string; onPress: () => void; danger?: boolean; styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity style={styles.adminRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.adminRowTitle, danger && { color: colors.red }]}>{title}</Text>
      {!danger && <ChevronRight color={colors.inkMuted} />}
    </TouchableOpacity>
  )
}

// ─── Default profile ──────────────────────────────────────────────────────────

const DEFAULT: Profile = {
  nombre: '', email: '', objetivo: '', objetivos_multiples: [], nivel: 'rookie',
  experiencia_deportiva: '', lesiones: '', dias_semana: 3, horario_preferido: '',
  estilo_entrenamiento: '', ejercicios_favoritos: '', ejercicios_evitar: '',
  rm_sentadilla: '', rm_peso_muerto: '', rm_press_banca: '', rm_press_hombro: '',
  fecha_nacimiento: '', peso: '', altura: '', sexo: '', nivel_estres: '',
  tipo_trabajo: '', usa_ciclo_menstrual: false, racha_actual: 0, puntos_totales: 0,
  logros: [], locations: [],
  plan: 'starter', plan_tipo: '', plan_renovacion: null,
  avatar: '',
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const { colors, palette, setPalette } = useTheme()
  const { t, lang, setLang } = useTranslation()
  const [showPalettePicker, setShowPalettePicker] = useState(false)
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<Profile>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [coachUnread, setCoachUnread] = useState(0)

  const fetchAll = useCallback(async () => {
    try {
      const [profileRes, statsRes, unreadRes] = await Promise.allSettled([
        apiGet('/api/profile/'),
        apiGet('/api/stats/profile/'),
        fetchMiCoachUnread(),
      ])
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value
        setProfile({ ...DEFAULT, ...d, locations: d.locations ?? [] })
      }
      if (statsRes.status === 'fulfilled') {
        setProfileStats(statsRes.value)
      }
      setCoachUnread(unreadRes.status === 'fulfilled' ? (unreadRes.value?.no_leidos ?? 0) : 0)
    } catch {
      // fail silently
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    setLoading(true)
    setStatsLoading(true)
    fetchAll()
  }, [fetchAll]))

  async function handleLogout() {
    Alert.alert(t('perfil_logout_title'), t('perfil_logout_msg'), [
      { text: t('perfil_logout_cancel'), style: 'cancel' },
      {
        text: t('perfil_logout_confirm'), style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login') },
      },
    ])
  }

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]) return
    try {
      setUploading(true)
      // Redimensionar y comprimir a 300x300
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )
      const base64 = `data:image/jpeg;base64,${manipulated.base64}`
      // Upload al backend — update local state only after the POST confirms.
      await apiPost('/api/profile/avatar/', { avatar: base64 })
      setProfile(prev => ({ ...prev, avatar: base64 }))
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const initials = getInitials(profile.nombre || 'U')
  const nivel = nivelLabel(profile.nivel)
  const datosMedidos = agruparMiles(profileStats?.datos_medidos_30d ?? 0, lang === 'en' ? ',' : '.')

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


  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} disabled={uploading}>
            <View style={styles.avatarWrapper}>
              {profile.avatar ? (
                <Image
                  source={{ uri: profile.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>{uploading ? '⏳' : '📷'}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.nombre}>{loading ? '...' : (profile.nombre || 'Usuario')}</Text>
          <View style={styles.nivelPill}>
            <Text style={styles.nivelPillText}>{nivel}</Text>
            {!statsLoading && (profileStats?.semanas_activas ?? 0) > 0 && (
              <>
                <View style={styles.nivelPillSep} />
                <Text style={styles.nivelPillText}>
                  {profileStats!.semanas_activas} {profileStats!.semanas_activas === 1 ? 'semana activa' : 'semanas activas'}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── MÉTRICAS ── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardText}>
              <Text style={styles.metricLabel}>{t('perfil_measured_data')}</Text>
              <Text style={styles.metricSub}>{lang === 'es' ? 'Últimos 30 días' : 'Last 30 days'}</Text>
            </View>
            <Text
              style={[styles.metricValue, { color: colors.cyan }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
            >
              {statsLoading ? '–' : datosMedidos}
            </Text>
          </View>
        </View>

        {/* ── ADN DE ENTRENAMIENTO ── */}
        {statsLoading ? (
          <View style={[styles.adnWrap, { opacity: 0.45 }]}>
            <Skeleton width={52} height={9} borderRadius={3} style={{ marginBottom: 10 }} />
            <View style={styles.adnCard}>
              <View style={styles.adnBar} />
              <View style={[styles.adnContent, { gap: 9 }]}>
                <Skeleton width={140} height={13} borderRadius={4} />
                <Skeleton width="97%" height={13} borderRadius={4} />
                <Skeleton width="86%" height={13} borderRadius={4} />
                <Skeleton width="65%" height={13} borderRadius={4} />
              </View>
            </View>
          </View>
        ) : !!profileStats?.adn_entrenamiento && (
          <ADNCard
            texto={profileStats.adn_entrenamiento}
            styles={styles}
            dnaLabel={t('perfil_dna_label')}
            tagLabel={t('perfil_dna_tag')}
          />
        )}

        {/* ── SECCIONES (nivel 1) ──
            Cada card abre su propio sub-menú; las opciones viven dentro de él. */}
        <View style={styles.card}>
          <GroupRow icon="👤" title={t('perfil_section_account')} subtitle={t('perfil_card_account_sub')}
            onPress={() => router.push('/(app)/perfil/mi-cuenta' as any)} styles={styles} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="🏋️" title={t('perfil_section_training')} subtitle={t('perfil_card_training_sub')}
            onPress={() => router.push('/(app)/perfil/datos-entrenamiento' as any)} styles={styles} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="⌚" title={t('perfil_section_devices')} subtitle={t('perfil_row_devices_sub')}
            onPress={() => router.push('/(app)/perfil/tus-dispositivos' as any)} styles={styles} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="🧬" title={t('perfil_section_evidence')} subtitle={t('perfil_card_evidence_sub')}
            onPress={() => router.push('/(app)/perfil/evidencia' as any)} styles={styles} />
        </View>

        <View style={styles.card}>
          <GroupRow icon="🧑‍🏫" title={t('perfil_section_coach_signup')} subtitle={t('perfil_card_coach_signup_sub')}
            badge={coachUnread > 0 ? (coachUnread > 9 ? '9+' : String(coachUnread)) : undefined}
            onPress={() => router.push('/(app)/perfil/registro-coach' as any)} styles={styles} />
        </View>

        {/* ── BLOQUE ADMINISTRATIVO ── */}
        <View style={styles.adminCard}>
          {/* Suscripción — fila con dos estados mutuamente excluyentes según el plan.
              Starter ofrece upgrade; Pro abre la pantalla de gestión. */}
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
              styles={styles}
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
              styles={styles}
            />
          )}
          <View style={styles.divider} />
          <AdminRow title={t('perfil_row_referrals')}
            onPress={() => router.push('/(app)/perfil/referidos' as any)} styles={styles} />
          <View style={styles.divider} />
          <AdminRow title={t('perfil_row_support')}
            onPress={() => Linking.openURL('mailto:hola@pyfit.app')} styles={styles} />
          <View style={styles.divider} />
          <AdminRow title={t('perfil_row_privacy')}
            onPress={() => router.push('/(auth)/privacidad' as any)} styles={styles} />
          <View style={styles.divider} />
          <AdminRow title={t('perfil_logout')} danger onPress={handleLogout} styles={styles} />
        </View>

        <Text style={styles.version}>{t('perfil_version')}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dismiss overlay — before button wrap so dropdowns stay on top */}
      {showPalettePicker && (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 99 }]}
          onPress={() => setShowPalettePicker(false)}
        />
      )}

      {/* ── TOP-RIGHT CONTROLS — language + theme, outside ScrollView ── */}
      <View style={[styles.topControls, { top: insets.top + 28 }]}>

        {/* Language toggle pill */}
        <TouchableOpacity
          style={styles.langToggle}
          onPress={() => setLang(lang === 'es' ? 'en' : 'es')}
          activeOpacity={0.7}
        >
          <Text style={[styles.langToggleText, { color: colors.inkSecondary }]}>
            {lang.toUpperCase()}
          </Text>
        </TouchableOpacity>

        {/* Theme toggle + dropdown */}
        <View style={styles.themeButtonWrap}>
          <TouchableOpacity
            onPress={() => setShowPalettePicker(v => !v)}
            activeOpacity={0.7}
            style={styles.themeToggle}
          >
            <Text style={{ fontSize: 18 }}>{currentIcon}</Text>
          </TouchableOpacity>

          {showPalettePicker && (
            <View style={[styles.paletteDropdown, { backgroundColor: colors.sheetBg, borderColor: colors.borderBright }]}>
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
          )}
        </View>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },

    // Header
    header: { alignItems: 'center', marginBottom: 28, gap: 10 },
    avatarWrapper: {
      position: 'relative',
      marginBottom: 2,
    },
    avatarImage: {
      width: 80, height: 80, borderRadius: 40,
      borderWidth: 2, borderColor: c.accentLight,
    },
    avatarCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.accentDark,
      borderWidth: 2, borderColor: c.accentLight,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: c.white, fontFamily: 'SpaceGrotesk-Bold', fontSize: 28, letterSpacing: -0.5 },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0, right: 0,
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: c.accentDark,
      borderWidth: 2, borderColor: c.bg,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarEditIcon: { fontSize: 12, lineHeight: 16 },
    nombre: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, letterSpacing: -0.7 },
    nivelPill: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.cardBg,
      borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    },
    nivelPillText: {
      color: c.accent, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
    },
    nivelPillSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: c.accent },
    topControls: {
      position: 'absolute', right: 20,
      flexDirection: 'row', alignItems: 'flex-start',
      gap: 8, zIndex: 100,
    },
    langToggle: {
      height: 38, borderRadius: 19,
      paddingHorizontal: 12,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    langToggleText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 11, letterSpacing: 1.2,
    },
    themeButtonWrap: {
      alignItems: 'flex-end',
    },
    themeToggle: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    paletteDropdown: {
      marginTop: 6, borderRadius: 14, borderWidth: 1,
      overflow: 'hidden', minWidth: 160,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    dropdownRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 11,
    },
    dropdownLabel: {
      flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13,
    },
    dropdownCheck: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 13 },
    dropdownDivider: { height: 1 },

    // Metrics grid
    metricsGrid: { marginBottom: 28 },
    metricCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, paddingVertical: 22, paddingHorizontal: 24,
      flexDirection: 'row', alignItems: 'center', gap: 16,
    },
    metricCardText: { flex: 1, gap: 2 },
    metricLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkSecondary, letterSpacing: 1.8, textTransform: 'uppercase' },
    metricValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 48, letterSpacing: -2, lineHeight: 52, flexShrink: 1, textAlign: 'right' },
    metricSub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },

    // ADN
    adnWrap: { marginBottom: 28 },
    adnSectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
    adnCard: { flexDirection: 'row', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, overflow: 'hidden' },
    adnBar: { width: 3, backgroundColor: c.accent },
    adnContent: { flex: 1, padding: 18, gap: 12 },
    adnTagRow: { flexDirection: 'row' },
    adnTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright },
    adnTagText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
    adnText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: c.inkPrimary, lineHeight: 22, letterSpacing: -0.1 },

    // Groups
    card: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
    divider: { height: 1, backgroundColor: c.borderDefault, marginHorizontal: 18 },
    groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
    groupRowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    groupRowMid: { flex: 1, gap: 2 },
    groupRowTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    groupRowSub: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, letterSpacing: -0.1 },
    groupBadge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
      // Badge semántico naranja (próximamente / nuevo). Subimos opacidad para
      // que sea visible sobre bg claro. Texto en ámbar oscuro mantiene contraste
      // sobre el tint en cualquier paleta.
      backgroundColor: 'rgba(255,170,50,0.22)',
      borderWidth: 1, borderColor: 'rgba(255,170,50,0.5)',
    },
    groupBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#b45309', letterSpacing: 0.5 },

    // Admin block
    adminCard: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
    adminRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
    adminRowTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    version: { color: c.inkFaint, fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.4, textAlign: 'center', marginBottom: 8 },
  })
}
