import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Image, Animated, Easing } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { Colors, accentAlpha, readableTextOn, cardShadow } from '../../../lib/colors'
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

interface Competencia {
  id: number; nombre: string; fecha: string; tipo: string; distancia_disciplina?: string
}

interface DiaTracker {
  entrenado: boolean; es_hoy: boolean
}

interface ProfileStats {
  semanas_activas: number
  distribucion_tipo?: DistribucionTipo | null
  top_grupos?: GrupoFav[]
  racha_actual?: number
  mejor_racha?: number
  puntos_semana?: number
  meta_semanal?: number
  dias_tracker?: DiaTracker[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function planLabel(plan?: string) {
  return plan === 'pro' ? 'Pro' : plan === 'ultra' ? 'Ultra' : 'Free'
}

function planColor(plan?: string) {
  return plan === 'pro' ? '#ffaa32' : plan === 'ultra' ? '#c084fc' : 'rgba(255,255,255,0.35)'
}

function formatFecha(dateStr: string, lang: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const months: Record<string, string[]> = {
    es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    pt: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  }
  const m = (months[lang] ?? months['es'])[d.getMonth()]
  return `${d.getDate()} ${m}`
}

function tipoIcon(tipo: string) {
  const map: Record<string, string> = {
    running: '🏃', ciclismo: '🚴', triatlón: '🏊', natación: '🏊',
    trail: '🏔️', futbol: '⚽', tenis: '🎾', otro: '🏅',
  }
  return map[tipo?.toLowerCase()] ?? '🏅'
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

function InfoIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
      <Path d="M12 11v6M12 7.5v.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
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

// ─── SectionLabelRow (label + ? info button) ──────────────────────────────────

function SectionLabelRow({ label, info, styles }: {
  label: string; info: string; styles: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TouchableOpacity
        onPress={() => Alert.alert('', info, [{ text: 'OK' }])}
        activeOpacity={0.7}
        style={styles.infoBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <InfoIcon color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
    </View>
  )
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
      <SectionLabelRow
        label={t('perfil_dist_label')}
        info={t('perfil_dist_info')}
        styles={styles}
      />
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
  grupos, loading, styles, colors, t,
}: {
  grupos?: GrupoFav[]; loading: boolean
  styles: ReturnType<typeof makeStyles>; colors: Colors; t: (key: string) => string
}) {
  const hasData = !loading && grupos && grupos.length > 0

  return (
    <View style={styles.favWrap}>
      <SectionLabelRow
        label={t('perfil_fav_label')}
        info={t('perfil_fav_info')}
        styles={styles}
      />
      {loading ? (
        <View style={styles.favChipsRow}>
          {[120, 90, 100].map((w, i) => (
            <Skeleton key={i} width={w} height={34} borderRadius={10} />
          ))}
        </View>
      ) : !hasData ? (
        <View style={styles.favEmpty}>
          <Text style={styles.favEmptyText}>{t('perfil_fav_empty')}</Text>
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

// ─── Eventos Próximos Section ─────────────────────────────────────────────────

function EventosProximosSection({
  eventos, loading, styles, colors, lang, t,
}: {
  eventos: Competencia[]; loading: boolean
  styles: ReturnType<typeof makeStyles>; colors: Colors; lang: string; t: (key: string) => string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const proximos = eventos.filter(e => e.fecha >= today).sort((a, b) => a.fecha.localeCompare(b.fecha))

  return (
    <View style={styles.eventosWrap}>
      <Text style={[styles.sectionLabel, styles.eventosLabel]}>{t('perfil_eventos_label')}</Text>
      {loading ? (
        <View style={{ gap: 10 }}>
          <Skeleton width="100%" height={64} borderRadius={16} />
          <Skeleton width="100%" height={64} borderRadius={16} />
        </View>
      ) : proximos.length === 0 ? (
        <View style={styles.favEmpty}>
          <Text style={styles.favEmptyText}>{t('perfil_eventos_empty')}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {proximos.map(ev => {
            const diasRestantes = Math.ceil((new Date(ev.fecha + 'T00:00:00').getTime() - Date.now()) / 86400000)
            const urgente = diasRestantes <= 7
            return (
              <View key={ev.id} style={styles.eventoCard}>
                <View style={[styles.eventoColorBar, { backgroundColor: urgente ? '#ff8c42' : colors.accent }]} />
                <View style={styles.eventoIcon}>
                  <Text style={{ fontSize: 20 }}>{tipoIcon(ev.tipo)}</Text>
                </View>
                <View style={styles.eventoBody}>
                  <Text style={styles.eventoNombre} numberOfLines={1}>{ev.nombre}</Text>
                  <View style={styles.eventoMetaRow}>
                    {ev.distancia_disciplina ? (
                      <Text style={styles.eventoMeta}>{ev.distancia_disciplina}</Text>
                    ) : null}
                    {ev.distancia_disciplina ? <Text style={styles.eventoMetaDot}>·</Text> : null}
                    <Text style={styles.eventoMeta}>{formatFecha(ev.fecha, lang)}</Text>
                  </View>
                </View>
                <View style={[styles.eventoBadge, { borderColor: (urgente ? '#ff8c42' : colors.accent) + '50', backgroundColor: (urgente ? '#ff8c42' : colors.accent) + '15' }]}>
                  <Text style={[styles.eventoBadgeTxt, { color: urgente ? '#ff8c42' : colors.accent }]}>
                    {diasRestantes === 0 ? t('perfil_event_today') : `${diasRestantes}d`}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ─── Racha Card (fuego animado + puntos semanales + tracker Lun–Dom) ──────────

// Letras de día, Lun-primero — misma convención que "Tu Semana" del dashboard.
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Silueta de llama (path "flame" de Lucide, viewBox 24) — se rellena con el acento.
const FLAME_PATH = 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'

function FlameIcon({ color, size = 46, active }: { color: string; size?: number; active: boolean }) {
  // Glow pulsante (halo doble) + flicker de la llama. Todo con Animated core y
  // useNativeDriver — mismo patrón que el StreakTrack del dashboard.
  const pulse = useRef(new Animated.Value(0)).current
  const flicker = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!active) { pulse.setValue(0); flicker.setValue(0); return }
    const p = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]))
    const f = Animated.loop(Animated.sequence([
      Animated.timing(flicker, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(flicker, { toValue: 0, duration: 780, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    p.start(); f.start()
    return () => { p.stop(); f.stop() }
  }, [active])

  const box = Math.round(size * 1.7)
  const flameColor = active ? color : 'rgba(255,255,255,0.16)'

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <>
          {/* halo externo — glow amplio y suave */}
          <Animated.View style={{
            position: 'absolute', width: box, height: box, borderRadius: box / 2,
            backgroundColor: color,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.22] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.05] }) }],
          }} />
          {/* halo interno — más intenso, pegado a la llama */}
          <Animated.View style={{
            position: 'absolute', width: size * 1.1, height: size * 1.1, borderRadius: size,
            backgroundColor: color,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.44] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }],
          }} />
        </>
      )}
      <Animated.View style={{
        transform: active ? [
          { scale: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
          { translateY: flicker.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) },
        ] : [],
      }}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d={FLAME_PATH} fill={flameColor} />
        </Svg>
      </Animated.View>
    </View>
  )
}

function RachaCard({
  racha, mejorRacha, puntos, meta, tracker, loading, styles, colors, t, lang,
}: {
  racha: number; mejorRacha: number; puntos: number; meta: number
  tracker: DiaTracker[]; loading: boolean
  styles: ReturnType<typeof makeStyles>; colors: Colors
  t: (key: string) => string; lang: string
}) {
  const pct = meta > 0 ? Math.min(100, Math.round((puntos / meta) * 100)) : 0
  const metaLograda = meta > 0 && puntos >= meta
  const barAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (loading) return
    barAnim.setValue(0)
    Animated.timing(barAnim, {
      toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start()
  }, [loading, pct])

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] })
  const daysWord = racha === 1
    ? (lang === 'es' ? 'día' : lang === 'pt' ? 'dia' : lang === 'fr' ? 'jour' : 'day')
    : t('perfil_days_suffix')

  if (loading) {
    return (
      <View style={styles.rachaWrap}>
        <View style={[styles.rachaCard, { opacity: 0.5 }]}>
          <View style={styles.rachaLeft}>
            <Skeleton width={54} height={54} borderRadius={27} />
            <Skeleton width={44} height={24} borderRadius={6} style={{ marginTop: 12 }} />
          </View>
          <View style={styles.rachaRight}>
            <Skeleton width={120} height={22} borderRadius={6} />
            <Skeleton width="100%" height={12} borderRadius={8} style={{ marginTop: 14 }} />
            <Skeleton width="100%" height={48} borderRadius={14} style={{ marginTop: 14 }} />
          </View>
        </View>
      </View>
    )
  }

  const items = tracker && tracker.length === 7
    ? tracker
    : Array.from({ length: 7 }, () => ({ entrenado: false, es_hoy: false }))

  return (
    <View style={styles.rachaWrap}>
      <View style={styles.rachaCard}>
        {/* ── Izquierda: fuego + racha ── */}
        <View style={styles.rachaLeft}>
          <FlameIcon color={colors.accent} size={46} active={racha > 0} />
          <View style={styles.rachaNumRow}>
            <Text style={[styles.rachaNum, { color: racha > 0 ? colors.inkPrimary : colors.inkMuted }]}>{racha}</Text>
            <Text style={styles.rachaDays}>{daysWord}</Text>
          </View>
          <Text style={styles.rachaLabel}>{t('perfil_streak_label')}</Text>
          {mejorRacha > 0 && (
            <Text style={styles.rachaRecord}>{t('perfil_streak_record')} · {mejorRacha}</Text>
          )}
        </View>

        {/* ── Derecha: puntos + barra + tracker semanal ── */}
        <View style={styles.rachaRight}>
          <View style={styles.rachaPtsRow}>
            <Text style={styles.rachaPts} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{puntos}</Text>
            <Text style={styles.rachaPtsMeta}> / {meta} {t('perfil_streak_points')}</Text>
            <View style={{ flex: 1 }} />
            {metaLograda ? (
              <Text style={[styles.rachaWeekLabel, { color: colors.accent }]} numberOfLines={1}>✓ {t('perfil_streak_week')}</Text>
            ) : (
              <Text style={styles.rachaWeekLabel}>{t('perfil_streak_week')}</Text>
            )}
          </View>

          <View style={styles.rachaBarTrack}>
            <Animated.View style={[styles.rachaBarFillWrap, cardShadow(colors.accent, 0.55), { width: barWidth }]}>
              <LinearGradient
                colors={[colors.accentDark, colors.accent, colors.accentLight]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.rachaBarFill}
              />
            </Animated.View>
          </View>

          <View style={styles.rachaTracker}>
            {items.map((d, i) => {
              const on = d.entrenado
              const today = d.es_hoy
              return (
                <View key={i} style={styles.rachaDayCol}>
                  <View style={[
                    styles.rachaDot,
                    on
                      ? { backgroundColor: colors.accent, borderColor: colors.accent }
                      : today
                        ? { backgroundColor: 'transparent', borderColor: colors.accent }
                        : { backgroundColor: colors.glassBg, borderColor: colors.borderDefault },
                  ]}>
                    {on && (
                      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                        <Path d="M5 13l4 4L19 7" stroke={readableTextOn(colors.accent)} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                    {today && !on && <View style={[styles.rachaDotToday, { backgroundColor: colors.accent }]} />}
                  </View>
                  <Text style={[styles.rachaDayLetter, (on || today) && { color: colors.accent }]}>{DAY_LETTERS[i]}</Text>
                </View>
              )
            })}
          </View>
        </View>
      </View>
    </View>
  )
}

// ─── Default profile ──────────────────────────────────────────────────────────

const DEFAULT: Profile = { nombre: '', nivel: 'rookie', avatar: '', plan: 'free' }

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
  const [eventos, setEventos] = useState<Competencia[]>([])
  const [eventosLoading, setEventosLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoadError(false)
    try {
      const [profileRes, statsRes, eventosRes] = await Promise.allSettled([
        apiGet('/api/profile/'),
        apiGet('/api/stats/profile/'),
        apiGet('/api/competitions/'),
      ])
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value
        setProfile({ nombre: d.nombre || '', nivel: d.nivel || 'rookie', avatar: d.avatar || '', plan: d.plan || 'free' })
      } else {
        setLoadError(true)
      }
      if (statsRes.status === 'fulfilled') setProfileStats(statsRes.value)
      if (eventosRes.status === 'fulfilled') {
        const data = eventosRes.value
        setEventos(Array.isArray(data) ? data : (data.results ?? []))
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
      setStatsLoading(false)
      setEventosLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    setLoading(true); setStatsLoading(true); setEventosLoading(true); fetchAll()
  }, [fetchAll]))

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('perfil_avatar_perm_title'), t('perfil_avatar_perm_msg'))
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
      Alert.alert(t('common_error'), t('perfil_avatar_err_msg'))
    } finally {
      setUploading(false)
    }
  }

  const initials = getInitials(profile.nombre || 'U')
  const pLabel = planLabel(profile.plan)
  const pColor = planColor(profile.plan)
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
            </View>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            {loading ? (
              <Skeleton width={140} height={22} borderRadius={5} style={{ marginBottom: 10 }} />
            ) : (
              <Text style={styles.nombre} numberOfLines={2}>{profile.nombre || t('perfil_user_fallback')}</Text>
            )}

            {loadError && !loading ? (
              <TouchableOpacity
                onPress={() => { setLoading(true); setStatsLoading(true); setEventosLoading(true); fetchAll() }}
                style={styles.retryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>↺ {t('common_retry')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.nivelPill}>
                <Text style={styles.nivelPillText}>
                  {statsLoading ? '–' : `${semanas} ${semanas === 1 ? t('perfil_week_one') : t('perfil_week_many')}`}
                </Text>
              </View>
            )}

            <View style={[styles.planBadge, { borderColor: pColor + '55', backgroundColor: pColor + '18' }]}>
              <Text style={[styles.planText, { color: pColor }]}>{pLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── RACHA + PUNTOS SEMANALES ── */}
        <RachaCard
          racha={profileStats?.racha_actual ?? 0}
          mejorRacha={profileStats?.mejor_racha ?? 0}
          puntos={profileStats?.puntos_semana ?? 0}
          meta={profileStats?.meta_semanal ?? 100}
          tracker={profileStats?.dias_tracker ?? []}
          loading={statsLoading}
          styles={styles}
          colors={colors}
          t={t as (key: string) => string}
          lang={lang}
        />

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
          t={t as (key: string) => string}
        />

        {/* ── EVENTOS PRÓXIMOS ── */}
        <EventosProximosSection
          eventos={eventos}
          loading={eventosLoading}
          styles={styles}
          colors={colors}
          lang={lang}
          t={t as (key: string) => string}
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
      letterSpacing: 2, textTransform: 'uppercase',
    },
    sectionLabelRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
    },
    infoBtn: {
      width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
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

    // ── Racha + puntos semanales ──
    rachaWrap: { marginBottom: 28 },
    rachaCard: {
      flexDirection: 'row', alignItems: 'stretch', gap: 14,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 22, padding: 14,
    },
    rachaLeft: {
      width: 104, alignItems: 'center', justifyContent: 'center',
      backgroundColor: accentAlpha(c.accent, 0.07), borderWidth: 1, borderColor: accentAlpha(c.accent, 0.14),
      borderRadius: 16, paddingVertical: 14, gap: 2,
    },
    rachaNumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 },
    rachaNum: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 34, letterSpacing: -1.5, lineHeight: 36 },
    rachaDays: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, color: c.inkMuted, paddingBottom: 5 },
    rachaLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkSecondary,
      letterSpacing: 2, textTransform: 'uppercase', marginTop: 2,
    },
    rachaRecord: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: c.inkFaint,
      letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 4,
    },
    rachaRight: { flex: 1, justifyContent: 'center', gap: 12, paddingVertical: 2 },
    rachaPtsRow: { flexDirection: 'row', alignItems: 'baseline' },
    rachaPts: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 30, color: c.inkPrimary, letterSpacing: -1.2 },
    rachaPtsMeta: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: c.inkMuted, letterSpacing: -0.4 },
    rachaWeekLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 8.5, color: c.inkMuted,
      letterSpacing: 1, textTransform: 'uppercase', alignSelf: 'center',
    },
    rachaBarTrack: {
      height: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)',
    },
    // backgroundColor = accent para que iOS renderice la sombra (glow); la tapa
    // el gradiente por encima, así que no se ve. Sin overflow:hidden a propósito
    // para no recortar el resplandor.
    rachaBarFillWrap: { height: 12, borderRadius: 8, backgroundColor: c.accent },
    rachaBarFill: { flex: 1, borderRadius: 8 },
    rachaTracker: {
      flexDirection: 'row', justifyContent: 'space-between',
      backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
      paddingVertical: 10, paddingHorizontal: 8,
    },
    rachaDayCol: { alignItems: 'center', gap: 6 },
    rachaDot: {
      width: 26, height: 26, borderRadius: 13, borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },
    rachaDotToday: { width: 6, height: 6, borderRadius: 3 },
    rachaDayLetter: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 0.3,
    },

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

    // ── Eventos ──
    eventosWrap: { marginBottom: 28 },
    eventosLabel: { marginBottom: 12 },
    eventoCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, overflow: 'hidden',
    },
    eventoColorBar: { width: 3, alignSelf: 'stretch' },
    eventoIcon: {
      width: 44, alignItems: 'center', justifyContent: 'center',
    },
    eventoBody: { flex: 1, paddingVertical: 14, paddingRight: 8, gap: 4 },
    eventoNombre: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: c.inkPrimary, letterSpacing: -0.3,
    },
    eventoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    eventoMeta: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted,
      letterSpacing: 0.5, textTransform: 'uppercase',
    },
    eventoMetaDot: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkFaint,
    },
    eventoBadge: {
      borderWidth: 1, borderRadius: 8,
      paddingHorizontal: 9, paddingVertical: 4,
      marginRight: 14,
    },
    eventoBadgeTxt: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1,
    },
  })
}
