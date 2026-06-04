import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { P, iniciales } from '../../../lib/coachTheme'
import { hasAlert } from '../../../lib/coachMockData'
import {
  fetchAtletaDetalle,
  fetchAtletaSesiones,
  patchAtletaConfig,
  type AtletaDetalle,
  type CoachConfig,
  type SesionHist,
} from '../../../lib/coachApi'
import { getCoachUser } from '../../../lib/storage'

// ─── Iconos ─────────────────────────────────────────────────────────────────────

function IconCheck({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconSend({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Datos del detalle ──────────────────────────────────────────────────────────
// Perfil (métricas) e Historial son REALES (endpoints de coach). Rutina y Chat
// siguen siendo placeholder hasta las Fases 3 y 4.

const TOGGLES = [
  { key: 'checkin',  nombre: 'Check-in diario',     desc: 'El atleta reporta ánimo, sueño y energía cada día.' },
  { key: 'feedback', nombre: 'Feedback post-sesión', desc: 'Pide RPE y notas al terminar cada entrenamiento.' },
  { key: 'ia',       nombre: 'Rutinas con IA',       desc: 'Genera rutinas automáticas adaptadas al atleta.' },
  { key: 'manual',   nombre: 'Rutina manual',        desc: 'Tú defines y editas la rutina manualmente.' },
] as const
type ToggleKey = (typeof TOGGLES)[number]['key']

const RUTINA = {
  semana: 'Semana 3 — Hipertrofia',
  dias: 4,
  ejercicios: [
    { nombre: 'Sentadilla trasera',   series: 4, reps: '8',  carga: '75%', descanso: '2:30' },
    { nombre: 'Press de banca',        series: 4, reps: '10', carga: '70%', descanso: '2:00' },
    { nombre: 'Remo con barra',        series: 3, reps: '12', carga: '65%', descanso: '1:30' },
    { nombre: 'Peso muerto rumano',    series: 3, reps: '10', carga: '70%', descanso: '2:00' },
    { nombre: 'Press militar',         series: 3, reps: '10', carga: '60%', descanso: '1:30' },
  ],
}

type Barra = 'done' | 'skip' | 'alto'

type Mensaje = { id: string; from: 'coach' | 'atleta'; text: string; hora: string }
const CHAT_INICIAL: Mensaje[] = [
  { id: 'm1', from: 'atleta', text: 'Hola coach, terminé la sesión de hoy 💪', hora: '09:14' },
  { id: 'm2', from: 'coach',  text: '¡Excelente! ¿Cómo sentiste la sentadilla?', hora: '09:20' },
  { id: 'm3', from: 'atleta', text: 'Pesada las últimas 2 series, RPE 8 fácil', hora: '09:22' },
  { id: 'm4', from: 'coach',  text: 'Perfecto, la próxima bajamos un poco la carga.', hora: '09:25' },
]

function horaActual(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────────

function MiniBars({ barras }: { barras: Barra[] }) {
  return (
    <View style={styles.bars}>
      {barras.map((b, i) => {
        const tall = b !== 'skip'
        const h = b === 'skip' ? 9 : 18 + ((i * 7) % 3) * 5   // variación determinista
        const color = b === 'alto' ? P.orange : b === 'done' ? P.purple : 'rgba(150,128,255,0.22)'
        return <View key={i} style={{ width: 5, height: tall ? h : 9, borderRadius: 3, backgroundColor: color }} />
      })}
    </View>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

type Tab = 'perfil' | 'rutina' | 'historial' | 'chat'
const TABS: { key: Tab; label: string }[] = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'rutina', label: 'Rutina' },
  { key: 'historial', label: 'Historial' },
  { key: 'chat', label: 'Chat' },
]

export default function CoachAtletaDetalle() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id?: string; nombre?: string }>()

  const [detalle, setDetalle] = useState<AtletaDetalle | null>(null)
  const [loadingDet, setLoadingDet] = useState(true)
  const [errDet, setErrDet] = useState<string | null>(null)
  const [sesiones, setSesiones] = useState<SesionHist[] | null>(null)
  const [loadingSes, setLoadingSes] = useState(true)

  const nombre = detalle?.nombre || params.nombre || 'Atleta'
  const estado = detalle?.estado ?? 'al_dia'
  const alerta = detalle ? hasAlert(detalle) : false

  const [tab, setTab] = useState<Tab>('perfil')
  const [coachNombre, setCoachNombre] = useState('Coach')
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    checkin: true, feedback: true, ia: true, manual: false,
  })
  // La rutina arranca pendiente de aprobación salvo que el atleta ya tenga una activa.
  const [pendiente, setPendiente] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>(CHAT_INICIAL)
  const [input, setInput] = useState('')
  const chatRef = useRef<ScrollView>(null)

  useEffect(() => { getCoachUser().then((u) => setCoachNombre(u?.nombre || 'Coach')) }, [])

  // Persiste un toggle de configuración (optimista; revierte si el backend falla).
  function onToggle(key: ToggleKey, v: boolean) {
    setToggles((prev) => ({ ...prev, [key]: v }))
    if (!params.id) return
    patchAtletaConfig(params.id, { [key]: v } as Partial<CoachConfig>)
      .catch(() => setToggles((prev) => ({ ...prev, [key]: !v })))
  }

  useEffect(() => {
    const id = params.id
    if (!id) { setLoadingDet(false); setLoadingSes(false); return }
    fetchAtletaDetalle(id)
      .then((d) => { setDetalle(d); setPendiente(!d.rutinaActiva); if (d.config) setToggles(d.config) })
      .catch((e: any) => setErrDet(e?.message || 'No se pudo cargar el atleta.'))
      .finally(() => setLoadingDet(false))
    fetchAtletaSesiones(id)
      .then((r) => setSesiones(r.sesiones))
      .catch(() => setSesiones([]))
      .finally(() => setLoadingSes(false))
  }, [params.id])

  const m = detalle?.metrics
  const metricas = m ? [
    { label: 'Consistencia',     value: `${m.consistencia}%`, extra: m.consistencia >= 70 ? '▲' : '▼', extraColor: m.consistencia >= 70 ? P.green : P.red },
    { label: 'Sesiones del mes', value: `${m.sesiones_mes}`, extra: `/ ${m.sesiones_target}`, extraColor: P.purpleFaint },
    { label: 'RPE promedio',     value: m.rpe_promedio != null ? m.rpe_promedio.toFixed(1) : '—', extra: 'últimas 5', extraColor: P.purpleFaint },
    { label: 'Con este coach',   value: m.antiguedad, extra: '', extraColor: P.purpleFaint },
  ] : []

  const avatarFg = alerta ? P.orange : P.green
  const avatarBg = alerta ? P.orangeSoft : P.greenSoft

  function enviar() {
    const text = input.trim()
    if (!text) return
    setMensajes((prev) => [...prev, { id: `c${prev.length}`, from: 'coach', text, hora: horaActual() }])
    setInput('')
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 50)
  }

  return (
    <View style={styles.root}>
      {/* Barra superior */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.6} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topName} numberOfLines={1}>{nombre}</Text>
        <View style={[styles.topBadge, { backgroundColor: alerta ? P.orangeSoft : P.greenSoft }]}>
          <Text style={[styles.topBadgeText, { color: alerta ? P.orange : P.green }]}>
            {alerta ? 'Alerta' : 'Al día'}
          </Text>
        </View>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.heroAvatar, { backgroundColor: avatarBg }]}>
          <Text style={[styles.heroAvatarText, { color: avatarFg }]}>{iniciales(nombre)}</Text>
        </View>
        <View style={styles.heroCenter}>
          <Text style={styles.heroName} numberOfLines={1}>{nombre}</Text>
          <Text style={styles.heroSub} numberOfLines={2}>
            {detalle?.situacion || (loadingDet ? 'Cargando…' : 'Sin datos')}
          </Text>
        </View>
        <View style={styles.heroScore}>
          <Text style={styles.heroScoreNum}>{detalle?.score ?? '—'}</Text>
          <Text style={styles.heroScoreLabel}>Zyfit Score</Text>
        </View>
      </View>

      {/* Tabs internos */}
      <View style={styles.tabsBar}>
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              activeOpacity={0.8}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, { color: active ? P.white : P.purpleFaint }]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Contenido del tab */}
      <View style={{ flex: 1 }}>
        {tab === 'perfil' && (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {loadingDet ? (
              <View style={styles.loadingWrap}><ActivityIndicator color={P.purpleMid} /></View>
            ) : errDet ? (
              <Text style={styles.emptyText}>{errDet}</Text>
            ) : (
            <View style={styles.metricsGrid}>
              {metricas.map((m) => (
                <View key={m.label} style={styles.metricCard}>
                  <View style={styles.metricTop}>
                    <Text style={styles.metricValue}>{m.value}</Text>
                    {!!m.extra && <Text style={[styles.metricExtra, { color: m.extraColor }]}>{m.extra}</Text>}
                  </View>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
            )}

            <Text style={styles.sectionLabel}>Configuración del atleta</Text>
            {TOGGLES.map((tg) => (
              <View key={tg.key} style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.toggleName}>{tg.nombre}</Text>
                  <Text style={styles.toggleDesc}>{tg.desc}</Text>
                </View>
                <Switch
                  value={toggles[tg.key]}
                  onValueChange={(v) => onToggle(tg.key, v)}
                  trackColor={{ false: '#2A2440', true: P.purple }}
                  thumbColor={P.white}
                  ios_backgroundColor="#2A2440"
                />
              </View>
            ))}
          </ScrollView>
        )}

        {tab === 'rutina' && (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.rutinaHeader}>
              <Text style={styles.rutinaTitle}>Rutina activa</Text>
              <TouchableOpacity style={styles.nuevaBtn} activeOpacity={0.85}>
                <Text style={styles.nuevaBtnText}>+ Nueva</Text>
              </TouchableOpacity>
            </View>

            {pendiente && (
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>Pendiente de aprobación</Text>
              </View>
            )}

            <View style={styles.estadoCard}>
              <Text style={styles.estadoSemana}>{RUTINA.semana}</Text>
              <Text style={styles.estadoDias}>{RUTINA.dias} días / semana</Text>
            </View>

            {RUTINA.ejercicios.map((e, i) => (
              <View key={i} style={styles.ejercicioCard}>
                <View style={styles.ejercicioTop}>
                  <Text style={styles.ejercicioNombre} numberOfLines={1}>{e.nombre}</Text>
                  <Text style={styles.ejercicioSeries}>{e.series} × {e.reps}</Text>
                </View>
                <Text style={styles.ejercicioMeta}>Carga {e.carga} · Descanso {e.descanso}</Text>
              </View>
            ))}

            {pendiente && (
              <TouchableOpacity style={styles.aprobarBtn} activeOpacity={0.85} onPress={() => setPendiente(false)}>
                <IconCheck color={P.green} />
                <Text style={styles.aprobarText}>Aprobar y publicar al atleta</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {tab === 'historial' && (
          <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
            {loadingSes ? (
              <View style={styles.loadingWrap}><ActivityIndicator color={P.purpleMid} /></View>
            ) : !sesiones || sesiones.length === 0 ? (
              <Text style={styles.emptyText}>Sin sesiones registradas todavía.</Text>
            ) : (
              sesiones.map((s, i) => (
                <View key={i} style={styles.sesionCard}>
                  <View style={styles.sesionTop}>
                    <Text style={styles.sesionFecha}>{s.fecha}</Text>
                    <Text style={styles.sesionRpe}>RPE {s.rpe.toFixed(1)}</Text>
                  </View>
                  <MiniBars barras={s.barras} />
                  <Text style={styles.sesionResumen}>
                    {s.completados} de {s.total} ejercicios · {s.min} min
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {tab === 'chat' && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.bottom + 60}
          >
            <ScrollView
              ref={chatRef}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: false })}
            >
              {mensajes.map((m) => {
                const mine = m.from === 'coach'
                return (
                  <View key={m.id} style={[styles.msgRow, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.bubble, mine ? styles.bubbleCoach : styles.bubbleAtleta]}>
                      <Text style={styles.bubbleText}>{m.text}</Text>
                    </View>
                    <Text style={styles.msgMeta}>
                      {m.hora} · {mine ? coachNombre : nombre.split(' ')[0]}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>

            <View style={[styles.inputBar, { paddingBottom: 10 }]}>
              <TextInput
                style={styles.input}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={P.purpleFaint}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={enviar}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} activeOpacity={0.85} onPress={enviar}>
                <IconSend color={P.white} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  // Barra superior
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: P.purpleSoft, lineHeight: 26 },
  topName: { flex: 1, textAlign: 'center', fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: P.ink },
  topBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  topBadgeText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 0.3 },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 18,
    gap: 14,
  },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 22 },
  heroCenter: { flex: 1, minWidth: 0 },
  heroName: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 19, color: P.ink, letterSpacing: -0.3 },
  heroSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.purpleFaint, marginTop: 3 },
  heroScore: { alignItems: 'center' },
  heroScoreNum: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 30, color: P.purpleMid, letterSpacing: -1 },
  heroScoreLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: P.purpleFaint, letterSpacing: 0.4, marginTop: -2 },

  // Tabs internos
  tabsBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: P.inputBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabBtnActive: { backgroundColor: P.purple },
  tabText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 },

  // Contenido común
  tabContent: { paddingHorizontal: 20, paddingBottom: 28 },
  loadingWrap: { paddingTop: 48, alignItems: 'center' },
  emptyText: {
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.purpleFaint,
    textAlign: 'center', marginTop: 40,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: P.purpleFaint,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 14,
  },

  // Perfil — métricas
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: {
    width: '48.5%',
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  metricTop: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  metricValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, color: P.ink, letterSpacing: -0.6 },
  metricExtra: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11 },
  metricLabel: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleSoft, marginTop: 6 },

  // Perfil — toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  toggleName: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: P.ink },
  toggleDesc: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleFaint, marginTop: 3 },

  // Rutina
  rutinaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  rutinaTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 18, color: P.ink },
  nuevaBtn: { backgroundColor: P.purple, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  nuevaBtnText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13, color: P.white },
  pendingPill: {
    alignSelf: 'flex-start',
    backgroundColor: P.amberSoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 14,
  },
  pendingPillText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: P.amber, letterSpacing: 0.3 },
  estadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  estadoSemana: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.ink },
  estadoDias: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: P.purpleSoft },
  ejercicioCard: {
    backgroundColor: P.cardBgAlt,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  ejercicioTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  ejercicioNombre: { flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: P.ink },
  ejercicioSeries: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: P.purpleMid },
  ejercicioMeta: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleFaint, marginTop: 6 },
  aprobarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.5)',
    backgroundColor: P.greenSoft,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  aprobarText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.green },

  // Historial
  sesionCard: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  sesionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sesionFecha: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.ink },
  sesionRpe: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: P.purpleMid },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 34, marginTop: 14, marginBottom: 12 },
  sesionResumen: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleFaint },

  // Chat
  chatContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  msgRow: { marginBottom: 14, maxWidth: '100%' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleCoach: { backgroundColor: P.purple, borderTopRightRadius: 4 },
  bubbleAtleta: { backgroundColor: P.badgeBg, borderWidth: 1, borderColor: P.border, borderTopLeftRadius: 4 },
  bubbleText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.white, lineHeight: 20 },
  msgMeta: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: P.purpleFaint, marginTop: 4, marginHorizontal: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.divider,
  },
  input: {
    flex: 1,
    backgroundColor: P.inputBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: P.ink,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
