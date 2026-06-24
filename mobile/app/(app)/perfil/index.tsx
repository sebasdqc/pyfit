import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Image, Modal, Pressable } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPost } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  nombre: string; nivel: string; avatar?: string; plan?: string
}

interface DistribucionTipo {
  fuerza: number; cardio: number; movilidad: number
}

interface GrupoFav {
  key: string; label: string; count: number
}

interface ProfileStats {
  semanas_activas: number
  consistencia_30d: number
  sesiones_mes: number
  datos_medidos_30d: number
  adn_entrenamiento?: string | null
  distribucion_tipo?: DistribucionTipo | null
  top_grupos?: GrupoFav[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function agruparMiles(n: number, sep: string) {
  return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

function nivelLabel(nivel: string) {
  return ({ rookie: 'Rookie', atleta: 'Atleta', elite: 'Élite', leyenda: 'Leyenda' } as any)[nivel?.toLowerCase()] ?? nivel ?? 'Rookie'
}

function planLabel(plan?: string) {
  return plan === 'pro' ? 'Pro' : plan === 'ultra' ? 'Ultra' : 'Free'
}

function planColor(plan?: string) {
  return plan === 'pro' ? '#ffaa32' : plan === 'ultra' ? '#c084fc' : 'rgba(255,255,255,0.35)'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GearIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5zm7.43-1.63c.04-.32.07-.65.07-.87s-.03-.57-.07-.87l1.91-1.49a.46.46 0 0 0 .11-.57l-1.8-3.12a.46.46 0 0 0-.56-.2l-2.26.91a6.56 6.56 0 0 0-1.5-.87l-.34-2.4A.45.45 0 0 0 14 4h-3.6a.45.45 0 0 0-.44.38l-.34 2.4c-.55.21-1.06.5-1.5.87l-2.26-.9a.46.46 0 0 0-.56.19l-1.8 3.12a.44.44 0 0 0 .11.57l1.91 1.49c-.05.3-.09.59-.09.87s.04.57.09.87L2.1 15.35a.44.44 0 0 0-.11.57l1.8 3.12c.12.2.37.28.56.2l2.26-.91c.44.37.95.67 1.5.87l.34 2.4c.05.22.25.4.44.4H14c.22 0 .41-.18.44-.4l.34-2.4c.55-.2 1.06-.5 1.5-.87l2.26.9c.21.09.44 0 .56-.19l1.8-3.12a.44.44 0 0 0-.11-.57l-1.86-1.49z"
        fill={color}
      />
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

// ─── Grupo config (colores del checkin) ───────────────────────────────────────

const GRUPO_COLOR: Record<string, string> = {
  empujes:      '#4f8cff',
  tracciones:   '#32c896',
  piernas_quad: '#ff8c42',
  piernas_glut: '#c084fc',
}

const GRUPO_ICON: Record<string, string> = {
  empujes:      '💪',
  tracciones:   '🏋',
  piernas_quad: '🦵',
  piernas_glut: '🍑',
}

// ─── Distribución Chart ───────────────────────────────────────────────────────

const DIST_CONFIG = [
  { key: 'fuerza',    icon: '💪', tKey: 'perfil_dist_fuerza',    color: '#4f8cff' },
  { key: 'cardio',    icon: '🏃', tKey: 'perfil_dist_cardio',    color: '#ff8c42' },
  { key: 'movilidad', icon: '🧘', tKey: 'perfil_dist_movilidad', color: '#34d399' },
] as const

function DistribucionChart({
  data, loading, styles, colors, t,
}: {
  data: DistribucionTipo | null | undefined
  loading: boolean; styles: ReturnType<typeof makeStyles>
  colors: Colors; t: (key: string) => string
}) {
  const vals = { fuerza: data?.fuerza ?? 0, cardio: data?.cardio ?? 0, movilidad: data?.movilidad ?? 0 }
  const maxVal = Math.max(vals.fuerza, vals.cardio, vals.movilidad, 1)
  const total = vals.fuerza + vals.cardio + vals.movilidad

  return (
    <View style={styles.distWrap}>
      <Text style={styles.sectionLabel}>{t('perfil_dist_label')}</Text>
      <View style={styles.distCard}>
        {DIST_CONFIG.map((tipo, idx) => {
          const val = vals[tipo.key]
          const pct = loading ? 0.2 : val / maxVal
          return (
            <View key={tipo.key}>
              {idx > 0 && <View style={styles.distDivider} />}
              <View style={styles.distRow}>
                <View style={styles.distMeta}>
                  <Text style={styles.distIcon}>{tipo.icon}</Text>
                  <Text style={styles.distLabel}>{t(tipo.tKey)}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.distCount, { color: loading ? colors.inkMuted : tipo.color }]}>
                    {loading ? '–' : val}
                  </Text>
                  <Text style={styles.distCountSuffix}> {t('perfil_dist_times')}</Text>
                </View>
                <View style={styles.distBarTrack}>
                  <View style={[styles.distBarFill, {
                    width: `${Math.round(pct * 100)}%` as any,
                    backgroundColor: loading ? colors.inkFaint : tipo.color,
                    opacity: loading ? 0.35 : 1,
                  }]} />
                </View>
              </View>
            </View>
          )
        })}
        {!loading && total > 0 && (
          <Text style={styles.distFooter}>{total} {t('perfil_dist_total')}</Text>
        )}
      </View>
    </View>
  )
}

// ─── Favoritos Section ────────────────────────────────────────────────────────

function FavoritosSection({
  grupos, loading, styles, colors,
}: {
  grupos?: GrupoFav[]; loading: boolean
  styles: ReturnType<typeof makeStyles>; colors: Colors
}) {
  const hasData = !loading && grupos && grupos.length > 0

  return (
    <View style={styles.favWrap}>
      <Text style={styles.sectionLabel}>ENTRENAMIENTOS FAVORITOS</Text>
      {loading ? (
        <View style={styles.favChipsRow}>
          {[120, 90, 100].map((w, i) => (
            <Skeleton key={i} width={w} height={34} borderRadius={10} />
          ))}
        </View>
      ) : !hasData ? (
        <View style={styles.favEmpty}>
          <Text style={styles.favEmptyText}>Completa más entrenamientos para ver tus favoritos</Text>
        </View>
      ) : (
        <View style={styles.favChipsRow}>
          {grupos!.map(g => {
            const color = GRUPO_COLOR[g.key] ?? colors.accent
            const icon = GRUPO_ICON[g.key] ?? '🏋'
            return (
              <View
                key={g.key}
                style={[styles.favChip, { borderColor: color + '60', backgroundColor: color + '12' }]}
              >
                <Text style={styles.favChipIcon}>{icon}</Text>
                <Text style={[styles.favChipLabel, { color }]}>{g.label}</Text>
                <Text style={[styles.favChipCount, { color: color + 'aa' }]}>{g.count}×</Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ─── Default profile ──────────────────────────────────────────────────────────

const DEFAULT: Profile = { nombre: '', nivel: 'rookie', avatar: '', plan: 'pro' }

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PerfilScreen() {
  const { colors } = useTheme()
  const { t, lang } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<Profile>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [adnModalOpen, setAdnModalOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoadError(false)
    try {
      const [profileRes, statsRes] = await Promise.allSettled([
        apiGet('/api/profile/'),
        apiGet('/api/stats/profile/'),
      ])
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value
        setProfile({ nombre: d.nombre || '', nivel: d.nivel || 'rookie', avatar: d.avatar || '', plan: d.plan || 'pro' })
      } else {
        setLoadError(true)
      }
      if (statsRes.status === 'fulfilled') setProfileStats(statsRes.value)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    setLoading(true); setStatsLoading(true); fetchAll()
  }, [fetchAll]))

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]) return
    try {
      setUploading(true)
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )
      const base64 = `data:image/jpeg;base64,${manipulated.base64}`
      await apiPost('/api/profile/avatar/', { avatar: base64 })
      setProfile(prev => ({ ...prev, avatar: base64 }))
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const initials = getInitials(profile.nombre || 'U')
  const nivel = nivelLabel(profile.nivel)
  const pLabel = planLabel(profile.plan)
  const pColor = planColor(profile.plan)
  const datosMedidos = agruparMiles(profileStats?.datos_medidos_30d ?? 0, lang === 'en' ? ',' : '.')
  const adn = profileStats?.adn_entrenamiento
  const semanas = profileStats?.semanas_activas ?? 0

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER: avatar izq + info der ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} disabled={uploading}>
            <View style={styles.avatarWrapper}>
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
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

          <View style={styles.headerInfo}>
            {loading ? (
              <Skeleton width={140} height={22} borderRadius={5} style={{ marginBottom: 10 }} />
            ) : (
              <Text style={styles.nombre} numberOfLines={2}>{profile.nombre || 'Usuario'}</Text>
            )}

            {loadError && !loading ? (
              <TouchableOpacity
                onPress={() => { setLoading(true); setStatsLoading(true); fetchAll() }}
                style={styles.retryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>↺ Reintentar</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.nivelPill}>
                <Text style={styles.nivelPillText}>{nivel}</Text>
                {!statsLoading && semanas > 0 && (
                  <>
                    <View style={styles.nivelPillSep} />
                    <Text style={styles.nivelPillText}>
                      {semanas} {semanas === 1 ? 'sem.' : 'sem.'}
                    </Text>
                  </>
                )}
              </View>
            )}

            <View style={[styles.planBadge, { borderColor: pColor + '55', backgroundColor: pColor + '18' }]}>
              <Text style={[styles.planText, { color: pColor }]}>{pLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── MÉTRICAS ── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardText}>
              <Text style={styles.metricLabel}>{t('perfil_measured_data')}</Text>
              <Text style={styles.metricSub}>{lang === 'es' ? 'Últimos 30 días' : lang === 'pt' ? 'Últimos 30 dias' : 'Last 30 days'}</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.cyan }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.45}>
              {statsLoading ? '–' : datosMedidos}
            </Text>
          </View>
        </View>

        {/* ── ADN — compact card → abre modal ── */}
        {statsLoading ? (
          <View style={[styles.adnWrap, { opacity: 0.4 }]}>
            <Skeleton width={52} height={9} borderRadius={3} style={{ marginBottom: 10 }} />
            <View style={styles.adnCompactCard}>
              <View style={styles.adnBar} />
              <View style={styles.adnCompactBody}>
                <Skeleton width={130} height={10} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height={10} borderRadius={4} />
              </View>
              <Skeleton width={16} height={16} borderRadius={4} style={{ marginRight: 18, alignSelf: 'center' }} />
            </View>
          </View>
        ) : !!adn && (
          <View style={styles.adnWrap}>
            <Text style={styles.sectionLabel}>{t('perfil_dna_label')}</Text>
            <TouchableOpacity onPress={() => setAdnModalOpen(true)} activeOpacity={0.75}>
              <View style={styles.adnCompactCard}>
                <View style={styles.adnBar} />
                <View style={styles.adnCompactBody}>
                  <View style={styles.adnTag}>
                    <Text style={styles.adnTagText}>{t('perfil_dna_tag')}</Text>
                  </View>
                  <Text style={styles.adnPreview} numberOfLines={1}>{adn}</Text>
                </View>
                <Text style={styles.adnArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── DISTRIBUCIÓN ── */}
        <DistribucionChart
          data={profileStats?.distribucion_tipo}
          loading={statsLoading}
          styles={styles}
          colors={colors}
          t={t as (key: string) => string}
        />

        {/* ── ENTRENAMIENTOS FAVORITOS ── */}
        <FavoritosSection
          grupos={profileStats?.top_grupos}
          loading={statsLoading}
          styles={styles}
          colors={colors}
        />

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Gear → Ajustes ── */}
      <View style={[styles.topControls, { top: insets.top + 20 }]}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/perfil/ajustes' as any)}
          activeOpacity={0.7}
          style={styles.gearBtn}
        >
          <GearIcon color={colors.inkSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Modal ADN ── */}
      <Modal
        visible={adnModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAdnModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAdnModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('perfil_dna_label')}</Text>
            <View style={styles.modalDivider} />
            <View style={styles.modalTagRow}>
              <View style={styles.adnTag}>
                <Text style={styles.adnTagText}>{t('perfil_dna_tag')}</Text>
              </View>
            </View>
            <Text style={styles.modalText}>{adn}</Text>
            <TouchableOpacity
              onPress={() => setAdnModalOpen(false)}
              style={styles.modalCloseBtn}
              activeOpacity={0.75}
            >
              <Text style={styles.modalCloseTxt}>
                {lang === 'es' ? 'Cerrar' : lang === 'pt' ? 'Fechar' : 'Close'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted,
      letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
    },

    // ── Header ──
    header: {
      flexDirection: 'row', alignItems: 'flex-start',
      gap: 16, marginBottom: 28,
    },
    avatarWrapper: { position: 'relative' },
    avatarImage: {
      width: 82, height: 82, borderRadius: 41,
      borderWidth: 2, borderColor: c.accentLight,
    },
    avatarCircle: {
      width: 82, height: 82, borderRadius: 41,
      backgroundColor: c.accentDark, borderWidth: 2, borderColor: c.accentLight,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: c.white, fontFamily: 'SpaceGrotesk-Bold', fontSize: 30, letterSpacing: -0.5 },
    avatarEditBadge: {
      position: 'absolute', bottom: 0, right: 0,
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: c.accentDark, borderWidth: 2, borderColor: c.bg,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarEditIcon: { fontSize: 12 },
    headerInfo: { flex: 1, paddingTop: 4, gap: 8 },
    nombre: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22, letterSpacing: -0.7, lineHeight: 26,
    },
    nivelPill: {
      flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5,
    },
    nivelPillText: {
      color: c.accent, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
    },
    nivelPillSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: c.accent },
    planBadge: {
      alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    planText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
    retryBtn: {
      alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 12,
      borderRadius: 10, borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.4)', backgroundColor: 'rgba(255,68,68,0.08)',
    },
    retryText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: '#ff6b6b' },
    topControls: {
      position: 'absolute', right: 20,
      flexDirection: 'row', alignItems: 'flex-start', gap: 8, zIndex: 100,
    },
    gearBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },

    // ── Métricas ──
    metricsGrid: { marginBottom: 28 },
    metricCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, paddingVertical: 22, paddingHorizontal: 24,
      flexDirection: 'row', alignItems: 'center', gap: 16,
    },
    metricCardText: { flex: 1, gap: 2 },
    metricLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkSecondary, letterSpacing: 1.8, textTransform: 'uppercase' },
    metricValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 48, letterSpacing: -2, lineHeight: 52, flexShrink: 1, textAlign: 'right' },
    metricSub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },

    // ── ADN compact ──
    adnWrap: { marginBottom: 24 },
    adnCompactCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, overflow: 'hidden',
    },
    adnBar: { width: 3, alignSelf: 'stretch', backgroundColor: c.accent },
    adnCompactBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
    adnTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 6, backgroundColor: c.cardBg,
      borderWidth: 1, borderColor: c.borderBright,
    },
    adnTagText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
    adnPreview: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkSecondary, lineHeight: 19, letterSpacing: -0.1 },
    adnArrow: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, color: c.inkMuted, paddingHorizontal: 16 },

    // ── Distribución ──
    distWrap: { marginBottom: 28 },
    distCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, paddingVertical: 6, paddingHorizontal: 20,
    },
    distDivider: { height: 1, backgroundColor: c.borderDefault },
    distRow: { paddingVertical: 16 },
    distMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    distIcon: { fontSize: 15, marginRight: 8 },
    distLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkSecondary, letterSpacing: 1.8, textTransform: 'uppercase' },
    distCount: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, letterSpacing: -0.5 },
    distCountSuffix: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted,
      letterSpacing: 0.5, textTransform: 'uppercase', alignSelf: 'flex-end', paddingBottom: 3,
    },
    distBarTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
    distBarFill: { height: 5, borderRadius: 3 },
    distFooter: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkFaint,
      letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center', paddingBottom: 14, paddingTop: 2,
    },

    // ── Favoritos ──
    favWrap: { marginBottom: 28 },
    favChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    favChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderRadius: 12,
      paddingHorizontal: 12, paddingVertical: 9,
    },
    favChipIcon: { fontSize: 14 },
    favChipLabel: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, letterSpacing: -0.2 },
    favChipCount: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.5 },
    favEmpty: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, alignItems: 'center',
    },
    favEmptyText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkMuted,
      textAlign: 'center', lineHeight: 20,
    },

    // ── Modal ADN ──
    modalBackdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: '#0d1117',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignSelf: 'center', marginBottom: 20,
    },
    modalTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: c.inkPrimary,
      letterSpacing: -0.6, marginBottom: 16,
    },
    modalDivider: { height: 1, backgroundColor: c.borderDefault, marginBottom: 16 },
    modalTagRow: { marginBottom: 14 },
    modalText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkPrimary,
      lineHeight: 24, letterSpacing: -0.1, marginBottom: 28,
    },
    modalCloseBtn: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    },
    modalCloseTxt: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: c.inkPrimary, letterSpacing: -0.2,
    },
  })
}
