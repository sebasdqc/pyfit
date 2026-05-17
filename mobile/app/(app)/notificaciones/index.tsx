import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'
import { apiGet, apiPost, apiPatch } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'notificaciones' | 'configuracion'
type BoolPrefKey = 'invitacion' | 'insight' | 'alerta' | 'logro' | 'reencuentro'

interface Notificacion {
  id:        number
  tipo:      string
  texto:     string
  leida:     boolean
  timestamp: string
}

interface NotifPrefs {
  invitacion:  boolean
  insight:     boolean
  alerta:      boolean
  logro:       boolean
  reencuentro: boolean
  hora_inicio: number   // 7–22, integer hour (24h)
  hora_fin:    number
  silencio:    boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  invitacion:  true,
  insight:     true,
  alerta:      true,
  logro:       true,
  reencuentro: true,
  hora_inicio: 7,
  hora_fin:    22,
  silencio:    false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(h: number): string {
  if (h === 0)  return '12:00 AM'
  if (h === 12) return '12:00 PM'
  if (h > 12)   return `${h - 12}:00 PM`
  return `${h}:00 AM`
}

function parseHora(s: string | null | undefined): number | null {
  if (!s) return null
  const h = parseInt(s.split(':')[0], 10)
  return isNaN(h) ? null : h
}

function formatTimestamp(iso: string): string {
  const now  = new Date()
  const date = new Date(iso)
  const diffMs  = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH   = Math.floor(diffMs / 3_600_000)
  const diffD   = Math.floor(diffMs / 86_400_000)
  if (diffMin < 1)  return 'ahora mismo'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffH < 24)   return `hace ${diffH}h`
  if (diffD === 1)  return 'ayer'
  if (diffD < 7)    return `hace ${diffD} días`
  const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

// ─── Type metadata ────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  invitacion:  { icon: '⚡', color: '#4f8cff', bg: 'rgba(79,140,255,0.15)',  label: 'INVITACIÓN' },
  insight:     { icon: '✨', color: '#32c896', bg: 'rgba(50,200,150,0.15)',  label: 'INSIGHT' },
  alerta:      { icon: '🌙', color: '#ffaa32', bg: 'rgba(255,170,50,0.15)',  label: 'ALERTA' },
  logro:       { icon: '🏆', color: '#ffd700', bg: 'rgba(255,215,0,0.15)',   label: 'LOGRO' },
  reencuentro: { icon: '💙', color: '#6ce5ff', bg: 'rgba(108,229,255,0.15)', label: 'REENCUENTRO' },
}
const FALLBACK_META = TIPO_META.insight

const TIPOS_CONFIG: Array<{ tipo: BoolPrefKey; nombre: string; descripcion: string }> = [
  { tipo: 'invitacion',  nombre: 'Invitación a entrenar',   descripcion: 'Aviso personalizado cuando es tu día de sesión' },
  { tipo: 'insight',     nombre: 'Insight semanal',          descripcion: 'Un análisis real de tu progreso cada semana' },
  { tipo: 'alerta',      nombre: 'Alertas de patrón',        descripcion: 'Fatiga acumulada, lesiones emergentes, descanso' },
  { tipo: 'logro',       nombre: 'Logros desbloqueados',     descripcion: 'Hitos reales basados en tu progreso específico' },
  { tipo: 'reencuentro', nombre: 'Mensajes de reencuentro',  descripcion: 'Cuando llevas días sin abrir la app, sin presión' },
]

const HORAS_RANGE = Array.from({ length: 16 }, (_, i) => i + 7)  // 7–22

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificacionCard({ notif, onPress }: { notif: Notificacion; onPress: () => void }) {
  const meta = TIPO_META[notif.tipo] ?? FALLBACK_META
  return (
    <TouchableOpacity
      style={[
        cSt.card,
        notif.leida
          ? cSt.cardRead
          : [cSt.cardUnread, { borderColor: meta.color + '33', backgroundColor: meta.color + '0d' }],
      ]}
      onPress={onPress}
      activeOpacity={notif.leida ? 0.5 : 0.78}
    >
      <View style={[cSt.iconWrap, { backgroundColor: meta.bg }]}>
        <Text style={cSt.iconEmoji}>{meta.icon}</Text>
      </View>
      <View style={cSt.center}>
        <Text style={[cSt.tipo, { color: meta.color }]}>{meta.label}</Text>
        <Text style={cSt.texto}>{notif.texto}</Text>
        <Text style={cSt.ts}>{formatTimestamp(notif.timestamp)}</Text>
      </View>
      <View style={cSt.right}>
        {!notif.leida && <View style={[cSt.dot, { backgroundColor: meta.color }]} />}
      </View>
    </TouchableOpacity>
  )
}

const cSt = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 18, padding: 14 },
  cardRead:  { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' },
  cardUnread:{},
  iconWrap:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji: { fontSize: 20 },
  center:    { flex: 1, gap: 4 },
  tipo:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
  texto:     { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 20 },
  ts:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.3 },
  right:     { width: 14, alignItems: 'center', paddingTop: 4, flexShrink: 0 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
})

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }).start()
  }, [value])

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.12)', '#4f8cff'] })
  const thumbX     = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] })

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={[tgSt.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[tgSt.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  )
}

const tgSt = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
})

// ─── Preferencia Row ──────────────────────────────────────────────────────────

function PreferenciaRow({
  tipo, nombre, descripcion, value, onToggle, showSep, disabled,
}: {
  tipo:        BoolPrefKey
  nombre:      string
  descripcion: string
  value:       boolean
  onToggle:    () => void
  showSep:     boolean
  disabled?:   boolean
}) {
  const meta = TIPO_META[tipo] ?? FALLBACK_META
  return (
    <>
      <View style={{ opacity: disabled ? 0.38 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
        <TouchableOpacity style={prSt.row} onPress={onToggle} activeOpacity={0.7}>
          <View style={[prSt.iconWrap, { backgroundColor: meta.bg }]}>
            <Text style={prSt.iconEmoji}>{meta.icon}</Text>
          </View>
          <View style={prSt.textWrap}>
            <Text style={prSt.nombre}>{nombre}</Text>
            <Text style={prSt.desc}>{descripcion}</Text>
          </View>
          <ToggleSwitch value={value} onToggle={onToggle} />
        </TouchableOpacity>
      </View>
      {showSep && <View style={prSt.sep} />}
    </>
  )
}

const prSt = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji:{ fontSize: 18 },
  textWrap: { flex: 1, gap: 3 },
  nombre:   { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 19 },
  desc:     { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 16 },
  sep:      { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16 },
})

// ─── Hour Picker Modal ────────────────────────────────────────────────────────

function HourPickerModal({
  visible, selected, min, max, onSelect, onClose,
}: {
  visible:  boolean
  selected: number
  min:      number
  max:      number
  onSelect: (h: number) => void
  onClose:  () => void
}) {
  const sheetY = useRef(new Animated.Value(400)).current

  useEffect(() => {
    if (visible) {
      sheetY.setValue(400)
      Animated.spring(sheetY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start()
    }
  }, [visible])

  function dismiss(cb?: () => void) {
    Animated.timing(sheetY, { toValue: 400, duration: 220, useNativeDriver: true }).start(() => {
      onClose()
      cb?.()
    })
  }

  if (!visible) return null

  const horas = HORAS_RANGE.filter(h => h >= min && h <= max)

  return (
    <Modal transparent statusBarTranslucent onRequestClose={() => dismiss()}>
      <Pressable style={hpSt.backdrop} onPress={() => dismiss()}>
        <Animated.View
          style={[hpSt.sheet, { transform: [{ translateY: sheetY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={hpSt.pill} />
          <Text style={hpSt.title}>Seleccionar hora</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={hpSt.scroll}>
            {horas.map(h => (
              <TouchableOpacity
                key={h}
                style={[hpSt.option, h === selected && hpSt.optionActive]}
                onPress={() => dismiss(() => onSelect(h))}
                activeOpacity={0.7}
              >
                <Text style={[hpSt.optionText, h === selected && hpSt.optionTextActive]}>
                  {formatHora(h)}
                </Text>
                {h === selected && <Text style={hpSt.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const hpSt = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: 420 },
  pill:            { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  title:           { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3, textAlign: 'center', marginBottom: 4 },
  scroll:          { maxHeight: 300 },
  option:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, justifyContent: 'space-between' },
  optionActive:    { backgroundColor: 'rgba(79,140,255,0.1)' },
  optionText:      { fontFamily: 'SpaceGrotesk-Medium', fontSize: 17, color: 'rgba(255,255,255,0.7)' },
  optionTextActive:{ color: '#4f8cff' },
  check:           { fontSize: 16, color: '#4f8cff' },
})

// ─── Horario Card ─────────────────────────────────────────────────────────────

function HorarioCard({
  horaInicio, horaFin, onChangeInicio, onChangeFin,
}: {
  horaInicio:      number
  horaFin:         number
  onChangeInicio:  (h: number) => void
  onChangeFin:     (h: number) => void
}) {
  const [pickerFor, setPickerFor] = useState<'inicio' | 'fin' | null>(null)

  return (
    <View style={hrSt.section}>
      <Text style={hrSt.sectionLabel}>HORARIO PREFERIDO</Text>
      <View style={hrSt.card}>
        <Text style={hrSt.subtitle}>Recibe notificaciones solo en este rango</Text>
        <Text style={hrSt.limit}>Nunca antes de las 7am ni después de las 10pm</Text>

        <View style={hrSt.row}>
          <Text style={hrSt.fromLabel}>Desde</Text>

          <TouchableOpacity
            style={hrSt.picker}
            onPress={() => setPickerFor('inicio')}
            activeOpacity={0.75}
          >
            <Text style={hrSt.pickerText}>{formatHora(horaInicio)}</Text>
            <Text style={hrSt.chevron}>▾</Text>
          </TouchableOpacity>

          <View style={hrSt.lineDivider} />

          <TouchableOpacity
            style={hrSt.picker}
            onPress={() => setPickerFor('fin')}
            activeOpacity={0.75}
          >
            <Text style={hrSt.pickerText}>{formatHora(horaFin)}</Text>
            <Text style={hrSt.chevron}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      <HourPickerModal
        visible={pickerFor === 'inicio'}
        selected={horaInicio}
        min={7}
        max={horaFin - 1}
        onSelect={h => { onChangeInicio(h) }}
        onClose={() => setPickerFor(null)}
      />
      <HourPickerModal
        visible={pickerFor === 'fin'}
        selected={horaFin}
        min={horaInicio + 1}
        max={22}
        onSelect={h => { onChangeFin(h) }}
        onClose={() => setPickerFor(null)}
      />
    </View>
  )
}

const hrSt = StyleSheet.create({
  section:      { marginHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 4 },
  card:         { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16 },
  subtitle:     { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18, marginBottom: 4 },
  limit:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.5, lineHeight: 14, marginBottom: 18 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fromLabel:    { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  picker:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 },
  pickerText:   { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  chevron:      { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  lineDivider:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
})

// ─── Silencio Card ────────────────────────────────────────────────────────────

function SilencioCard({
  silencio, onToggle,
}: {
  silencio: boolean
  onToggle: () => void
}) {
  return (
    <View style={slSt.section}>
      <View style={slSt.card}>
        <TouchableOpacity style={slSt.row} onPress={onToggle} activeOpacity={0.7}>
          <View style={slSt.textWrap}>
            <Text style={slSt.titulo}>Silenciar todas las notificaciones</Text>
            <Text style={slSt.excepcion}>
              Las alertas de patrón crítico igualmente se mostrarán dentro de la app.
            </Text>
          </View>
          <ToggleSwitch value={silencio} onToggle={onToggle} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const slSt = StyleSheet.create({
  section:   { marginHorizontal: 16, marginBottom: 20 },
  card:      { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  textWrap:  { flex: 1, gap: 5 },
  titulo:    { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  excepcion: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 16 },
})

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>Todo al día</Text>
      <Text style={styles.emptySub}>
        Cuando haya novedades sobre tu entrenamiento, aparecerán aquí.
      </Text>
    </View>
  )
}

// ─── Notificaciones Tab ───────────────────────────────────────────────────────

function NotificacionesTab({
  notificaciones, loading, unreadCount, onMarkRead, styles,
}: {
  notificaciones: Notificacion[]
  loading:        boolean
  unreadCount:    number
  onMarkRead:     (id: number) => void
  styles:         ReturnType<typeof makeStyles>
}) {
  const titulo = unreadCount > 0 ? `[${unreadCount}] mensajes nuevos` : 'Sin mensajes nuevos'
  return (
    <>
      <View style={styles.tabContent}>
        <Text style={styles.eyebrow}>MENSAJES</Text>
        <Text style={styles.tabTitle}>{titulo}</Text>
        <Text style={styles.tabSubtitle}>Tu actividad reciente</Text>
      </View>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#4f8cff" />
        </View>
      ) : notificaciones.length === 0 ? (
        <EmptyState styles={styles} />
      ) : (
        <View style={styles.list}>
          {notificaciones.map(n => (
            <NotificacionCard
              key={n.id}
              notif={n}
              onPress={() => { if (!n.leida) onMarkRead(n.id) }}
            />
          ))}
        </View>
      )}
    </>
  )
}

// ─── Configuración Tab ────────────────────────────────────────────────────────

function ConfiguracionTab({
  prefs,
  loading,
  onTogglePref,
  onToggleSilencio,
  onSetHora,
  styles,
}: {
  prefs:           NotifPrefs | null
  loading:         boolean
  onTogglePref:    (tipo: BoolPrefKey) => void
  onToggleSilencio:() => void
  onSetHora:       (field: 'hora_inicio' | 'hora_fin', value: number) => void
  styles:          ReturnType<typeof makeStyles>
}) {
  const p = prefs ?? DEFAULT_PREFS

  return (
    <>
      <View style={styles.tabContent}>
        <Text style={styles.eyebrow}>PREFERENCIAS</Text>
        <Text style={styles.tabTitle}>Configura tus alertas</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#4f8cff" />
        </View>
      ) : (
        <>
          <SilencioCard
            silencio={p.silencio}
            onToggle={onToggleSilencio}
          />

          <HorarioCard
            horaInicio={p.hora_inicio}
            horaFin={p.hora_fin}
            onChangeInicio={h => onSetHora('hora_inicio', h)}
            onChangeFin={h => onSetHora('hora_fin', h)}
          />

          <View style={styles.configSection}>
            <Text style={styles.configSectionLabel}>TIPOS DE NOTIFICACIÓN</Text>
            <View style={styles.configCard}>
              {TIPOS_CONFIG.map((item, i) => (
                <PreferenciaRow
                  key={item.tipo}
                  tipo={item.tipo}
                  nombre={item.nombre}
                  descripcion={item.descripcion}
                  value={p[item.tipo]}
                  onToggle={() => onTogglePref(item.tipo)}
                  showSep={i < TIPOS_CONFIG.length - 1}
                  disabled={p.silencio}
                />
              ))}
            </View>
          </View>
        </>
      )}
    </>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificacionesScreen() {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [activeTab,      setActiveTab]      = useState<Tab>('notificaciones')
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading,        setLoading]        = useState(true)
  const [prefs,          setPrefs]          = useState<NotifPrefs | null>(null)
  const [prefsLoading,   setPrefsLoading]   = useState(true)

  useEffect(() => {
    apiGet('/api/notificaciones/')
      .then(setNotificaciones)
      .catch(() => {})
      .finally(() => setLoading(false))

    apiGet('/api/notificaciones/preferencias/')
      .then((data: any) => {
        setPrefs({
          invitacion:  data.invitacion  ?? true,
          insight:     data.insight     ?? true,
          alerta:      data.alerta      ?? true,
          logro:       data.logro       ?? true,
          reencuentro: data.reencuentro ?? true,
          hora_inicio: parseHora(data.hora_inicio) ?? 7,
          hora_fin:    parseHora(data.hora_fin)    ?? 22,
          silencio:    data.silencio    ?? false,
        })
      })
      .catch(() => {})
      .finally(() => setPrefsLoading(false))
  }, [])

  const unreadCount = notificaciones.filter(n => !n.leida).length

  const handleMarkRead = useCallback((id: number) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    apiPost(`/api/notificaciones/${id}/leer/`, {}).catch(() => {})
  }, [])

  const handleTogglePref = useCallback((tipo: BoolPrefKey) => {
    setPrefs(prev => {
      const current = prev ?? DEFAULT_PREFS
      const next = { ...current, [tipo]: !current[tipo] }
      apiPatch('/api/notificaciones/preferencias/', { [tipo]: next[tipo] }).catch(() => {})
      return next
    })
  }, [])

  const handleToggleSilencio = useCallback(() => {
    setPrefs(prev => {
      const current = prev ?? DEFAULT_PREFS
      const next = { ...current, silencio: !current.silencio }
      apiPatch('/api/notificaciones/preferencias/', { silencio: next.silencio }).catch(() => {})
      return next
    })
  }, [])

  const handleSetHora = useCallback((field: 'hora_inicio' | 'hora_fin', value: number) => {
    setPrefs(prev => {
      const current = prev ?? DEFAULT_PREFS
      const next = { ...current, [field]: value }
      const formatted = `${String(value).padStart(2, '0')}:00:00`
      apiPatch('/api/notificaciones/preferencias/', { [field]: formatted }).catch(() => {})
      return next
    })
  }, [])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.6}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {(['notificaciones', 'configuracion'] as Tab[]).map(tab => {
            const isActive = activeTab === tab
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab === 'notificaciones' ? 'Notificaciones' : 'Configuración'}
                </Text>
                {tab === 'notificaciones' && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'notificaciones' ? (
          <NotificacionesTab
            notificaciones={notificaciones}
            loading={loading}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            styles={styles}
          />
        ) : (
          <ConfiguracionTab
            prefs={prefs}
            loading={prefsLoading}
            onTogglePref={handleTogglePref}
            onToggleSilencio={handleToggleSilencio}
            onSetHora={handleSetHora}
            styles={styles}
          />
        )}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex:            1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top:      0,
      left:     0,
      right:    0,
      height:   400,
    },

    // Fixed header
    fixedHeader: {
      backgroundColor: 'transparent',
    },
    backRow: {
      paddingHorizontal: 20,
      paddingTop:         6,
      paddingBottom:      4,
    },
    backIcon: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   22,
      color:      c.inkMuted,
      lineHeight: 28,
    },

    // Tab row
    tabRow: {
      flexDirection:     'row',
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
      marginTop:         4,
    },
    tab: {
      flex:              1,
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'center',
      gap:               6,
      paddingVertical:   14,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom:      -1,
    },
    tabActive: {
      borderBottomColor: c.accent,
    },
    tabText: {
      fontFamily:    'SpaceGrotesk-SemiBold',
      fontSize:      14,
      color:         c.inkMuted,
      letterSpacing: -0.1,
    },
    tabTextActive: {
      color: c.inkPrimary,
    },
    badge: {
      backgroundColor: c.accent,
      borderRadius:    8,
      minWidth:        16,
      height:          16,
      alignItems:      'center',
      justifyContent:  'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize:   9,
      color:      '#fff',
      lineHeight: 14,
    },

    // Scroll
    scroll:        { flex: 1 },
    scrollContent: { paddingBottom: 60 },

    // Tab content header
    tabContent: {
      paddingHorizontal: 24,
      paddingTop:        32,
      paddingBottom:     20,
    },
    eyebrow: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      10,
      color:         c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom:  10,
    },
    tabTitle: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      28,
      color:         c.inkPrimary,
      letterSpacing: -0.7,
      lineHeight:    34,
      marginBottom:   6,
    },
    tabSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkMuted,
      lineHeight: 20,
    },

    // Notification list
    list: {
      paddingHorizontal: 16,
      paddingTop:        8,
      gap:               10,
    },

    // Loading
    loadingWrap: {
      paddingTop: 60,
      alignItems: 'center',
    },

    // Empty state
    emptyWrap: {
      alignItems:        'center',
      paddingHorizontal: 40,
      paddingTop:        72,
      gap:               12,
    },
    emptyIcon: {
      fontSize:     44,
      marginBottom:  4,
    },
    emptyTitle: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      20,
      color:         c.inkPrimary,
      letterSpacing: -0.3,
      textAlign:     'center',
    },
    emptySub: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkMuted,
      textAlign:  'center',
      lineHeight: 22,
    },

    // Config section
    configSection: {
      marginHorizontal: 16,
      marginBottom:     20,
    },
    configSectionLabel: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      9,
      color:         c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom:  10,
      paddingHorizontal: 4,
    },
    configCard: {
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    18,
      overflow:        'hidden',
    },
  })
}
