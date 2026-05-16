import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking, Modal, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme, Palette } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'
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
}

interface ProfileStats {
  semanas_activas: number
  consistencia_30d: number
  sesiones_mes: number
  adn_entrenamiento?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function nivelLabel(nivel: string) {
  return ({ rookie: 'Rookie', atleta: 'Atleta', elite: 'Élite', leyenda: 'Leyenda' } as any)[nivel?.toLowerCase()] ?? nivel ?? 'Rookie'
}

function capitalizeFirst(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
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

function ADNCard({ texto, styles }: { texto: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.adnWrap}>
      <Text style={styles.adnSectionLabel}>TU ADN</Text>
      <View style={styles.adnCard}>
        <View style={styles.adnBar} />
        <View style={styles.adnContent}>
          <View style={styles.adnTagRow}>
            <View style={styles.adnTag}>
              <Text style={styles.adnTagText}>PERFIL DE ENTRENAMIENTO</Text>
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
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const { colors, palette, setPalette } = useTheme()
  const [showPalettePicker, setShowPalettePicker] = useState(false)
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<Profile>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeInjuries, setActiveInjuries] = useState(0)

  const fetchAll = useCallback(async () => {
    try {
      const [profileData, statsData, injuriesData] = await Promise.all([
        apiGet('/api/profile/'),
        apiGet('/api/stats/profile/'),
        apiGet('/api/injuries/'),
      ])
      setProfile({ ...DEFAULT, ...profileData, locations: profileData.locations ?? [] })
      setProfileStats(statsData)
      setActiveInjuries((injuriesData as any[]).filter((i: any) => i.activa).length)
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
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login') },
      },
    ])
  }

  const initials = getInitials(profile.nombre || 'U')
  const nivel = nivelLabel(profile.nivel)
  const consistenciaColor =
    (profileStats?.consistencia_30d ?? 0) >= 70 ? '#32c896' :
    (profileStats?.consistencia_30d ?? 0) >= 40 ? '#ffaa32' :
    colors.red

  // Group row subtitles and badges
  const subDatosPersonales = profile.peso && profile.altura ? `${profile.peso} kg · ${profile.altura} cm` : undefined
  const subEntrenamiento = profile.nivel ? nivelLabel(profile.nivel) : undefined
  const subObjetivos = profile.objetivos_multiples?.[0] || profile.objetivo || undefined
  const subUbicaciones = profile.locations?.length > 0
    ? `${profile.locations.length} ${profile.locations.length === 1 ? 'ubicación' : 'ubicaciones'}`
    : undefined
  const badgeLesiones = activeInjuries > 0
    ? `${activeInjuries} ${activeInjuries === 1 ? 'activa' : 'activas'}`
    : undefined
  const badgeCiclo = profile.usa_ciclo_menstrual ? 'Activo' : 'Configurar'
  const subPreferencias = profile.estilo_entrenamiento ? capitalizeFirst(profile.estilo_entrenamiento) : undefined

  const PALETTE_OPTIONS: { id: Palette; label: string; icon: string }[] = [
    { id: 'dark',   label: 'Dark mode', icon: '🌙' },
    { id: 'light',  label: 'Light mode', icon: '☀️' },
    { id: 'rosado', label: 'Rosado',    icon: '🌸' },
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
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.nombre}>{loading ? '...' : (profile.nombre || 'Usuario')}</Text>
          <View style={styles.nivelPill}>
            <Text style={styles.nivelPillText}>{nivel}</Text>
            {!statsLoading && (profileStats?.semanas_activas ?? 0) > 0 && (
              <>
                <View style={styles.nivelPillSep} />
                <Text style={styles.nivelPillText}>
                  {profileStats!.semanas_activas} semanas activas
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── MÉTRICAS ── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>CONSISTENCIA</Text>
            <Text style={[styles.metricValue, { color: consistenciaColor }]}>
              {statsLoading ? '–' : `${profileStats?.consistencia_30d ?? 0}%`}
            </Text>
            <Text style={styles.metricSub}>Últimos 30 días</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>SESIONES</Text>
            <Text style={[styles.metricValue, { color: colors.accent }]}>
              {statsLoading ? '–' : (profileStats?.sesiones_mes ?? 0)}
            </Text>
            <Text style={styles.metricSub}>Este mes</Text>
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
          <ADNCard texto={profileStats.adn_entrenamiento} styles={styles} />
        )}

        {/* ── GRUPO 1: TUS DATOS ── */}
        <Text style={styles.groupLabel}>TUS DATOS</Text>
        <View style={styles.card}>
          <GroupRow icon="👤" title="Datos personales" subtitle={subDatosPersonales}
            onPress={() => router.push('/(app)/perfil/datos-personales' as any)} styles={styles} />
          <View style={styles.divider} />
          <GroupRow icon="🏋️" title="Datos de entrenamiento" subtitle={subEntrenamiento}
            onPress={() => router.push('/(app)/perfil/entrenamiento' as any)} styles={styles} />
          <View style={styles.divider} />
          <GroupRow icon="🎯" title="Mis objetivos" subtitle={subObjetivos}
            onPress={() => router.push('/(app)/perfil/objetivos' as any)} styles={styles} />
          <View style={styles.divider} />
          <GroupRow icon="📍" title="Ubicaciones" subtitle={subUbicaciones}
            onPress={() => router.push('/(app)/perfil/ubicaciones' as any)} styles={styles} />
        </View>

        {/* ── GRUPO 2: TU CUERPO ── */}
        <Text style={styles.groupLabel}>TU CUERPO</Text>
        <View style={styles.card}>
          <GroupRow icon="🩹" title="Lesiones y limitaciones" badge={badgeLesiones}
            onPress={() => router.push('/(app)/perfil/lesiones' as any)} styles={styles} />
          {profile.sexo === 'femenino' && (
            <>
              <View style={styles.divider} />
              <GroupRow icon="🌙" title="Ciclo menstrual" badge={badgeCiclo}
                onPress={() => router.push('/(app)/perfil/ciclo' as any)} styles={styles} />
            </>
          )}
        </View>

        {/* ── GRUPO 3: TU ENTRENADOR ── */}
        <Text style={styles.groupLabel}>TU ENTRENADOR</Text>
        <View style={styles.card}>
          <GroupRow icon="⚡" title="Preferencias de entrenamiento" subtitle={subPreferencias}
            onPress={() => router.push('/(app)/perfil/preferencias' as any)} styles={styles} />
        </View>

        {/* ── GRUPO 4: EVIDENCIA ── */}
        <Text style={styles.groupLabel}>EVIDENCIA</Text>
        <View style={styles.card}>
          <GroupRow icon="🧬" title="Cómo funciona tu entrenador"
            onPress={() => router.push('/(app)/perfil/ciencia' as any)} styles={styles} />
          <View style={styles.divider} />
          <GroupRow icon="📚" title="Bibliografía"
            onPress={() => router.push('/(app)/perfil/bibliografia' as any)} styles={styles} />
          <View style={styles.divider} />
          <GroupRow icon="📖" title="Glosario"
            onPress={() => router.push('/(app)/perfil/glosario' as any)} styles={styles} />
        </View>

        {/* ── BLOQUE ADMINISTRATIVO ── */}
        <View style={styles.adminCard}>
          <AdminRow title="Referidos"
            onPress={() => router.push('/(app)/perfil/referidos' as any)} styles={styles} />
          <View style={styles.divider} />
          <AdminRow title="Soporte"
            onPress={() => Linking.openURL('mailto:hola@pyfit.app')} styles={styles} />
          <View style={styles.divider} />
          <AdminRow title="Política de privacidad"
            onPress={() => router.push('/(auth)/privacidad' as any)} styles={styles} />
          <View style={styles.divider} />
          <AdminRow title="Cerrar sesión" danger onPress={handleLogout} styles={styles} />
        </View>

        <Text style={styles.version}>Zyfit · v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dismiss overlay — before button wrap so dropdown stays on top */}
      {showPalettePicker && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowPalettePicker(false)}
        />
      )}

      {/* ── THEME BUTTON — outside ScrollView so dropdown renders on top ── */}
      <View style={[styles.themeButtonWrap, { top: insets.top + 28 }]}>
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
    avatarCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.accentDark,
      borderWidth: 2, borderColor: 'rgba(79,140,255,0.4)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    },
    avatarText: { color: c.white, fontFamily: 'SpaceGrotesk-Bold', fontSize: 28, letterSpacing: -0.5 },
    nombre: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, letterSpacing: -0.7 },
    nivelPill: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(79,140,255,0.10)',
      borderWidth: 1, borderColor: 'rgba(79,140,255,0.22)',
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    },
    nivelPillText: {
      color: c.accent, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
    },
    nivelPillSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(79,140,255,0.5)' },
    themeButtonWrap: {
      position: 'absolute', right: 20,
      alignItems: 'flex-end', zIndex: 100,
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
    metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 28 },
    metricCard: {
      flex: 1, backgroundColor: c.cardBg,
      borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 18, alignItems: 'center', gap: 4,
    },
    metricLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 1.8, textTransform: 'uppercase' },
    metricValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 44, letterSpacing: -2, lineHeight: 50 },
    metricSub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },

    // ADN
    adnWrap: { marginBottom: 28 },
    adnSectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
    adnCard: { flexDirection: 'row', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, overflow: 'hidden' },
    adnBar: { width: 3, backgroundColor: c.accent },
    adnContent: { flex: 1, padding: 18, gap: 12 },
    adnTagRow: { flexDirection: 'row' },
    adnTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(79,140,255,0.10)', borderWidth: 1, borderColor: 'rgba(79,140,255,0.22)' },
    adnTagText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
    adnText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: c.inkPrimary, lineHeight: 22, letterSpacing: -0.1 },

    // Groups
    groupLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.inkMuted, letterSpacing: 2, textTransform: 'uppercase',
      marginBottom: 10, marginTop: 4,
    },
    card: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 20, marginBottom: 24, overflow: 'hidden' },
    divider: { height: 1, backgroundColor: c.borderDefault, marginHorizontal: 18 },
    groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
    groupRowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    groupRowMid: { flex: 1, gap: 2 },
    groupRowTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    groupRowSub: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, letterSpacing: -0.1 },
    groupBadge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
      backgroundColor: 'rgba(255,170,50,0.12)',
      borderWidth: 1, borderColor: 'rgba(255,170,50,0.3)',
    },
    groupBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: '#ffaa32', letterSpacing: 0.5 },

    // Admin block
    adminCard: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
    adminRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
    adminRowTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    version: { color: c.inkFaint, fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.4, textAlign: 'center', marginBottom: 8 },
  })
}
