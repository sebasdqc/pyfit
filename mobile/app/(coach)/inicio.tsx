import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { P, iniciales } from '../../lib/coachTheme'
import { getCoachUser } from '../../lib/storage'
import { Estado, Atleta, hasAlert } from '../../lib/coachTypes'
import { fetchCartera, fetchCoachMe, type CarteraMetrics } from '../../lib/coachApi'

function saludoHora(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buen día,'
  if (h < 19) return 'Buenas tardes,'
  return 'Buenas noches,'
}

type Filtro = 'atencion' | 'todos' | 'sin_rutina' | 'inactivos'

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'atencion',   label: 'Atención' },
  { key: 'todos',      label: 'Todos' },
  { key: 'sin_rutina', label: 'Sin rutina' },
  { key: 'inactivos',  label: 'Inactivos' },
]

function matchesFiltro(a: Atleta, f: Filtro): boolean {
  switch (f) {
    case 'atencion':   return hasAlert(a)
    case 'sin_rutina': return !!a.sinRutina
    case 'inactivos':  return !!a.inactivo
    default:           return true
  }
}

// ─── Iconos pequeños (toggle de vista) ──────────────────────────────────────────

function IconList({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6h12M9 12h12M9 18h12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={4} cy={6} r={1.4} fill={color} />
      <Circle cx={4} cy={12} r={1.4} fill={color} />
      <Circle cx={4} cy={18} r={1.4} fill={color} />
    </Svg>
  )
}

function IconGrid({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Rect x={13} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Rect x={4} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Rect x={13} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.8} />
    </Svg>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────────

function Avatar({ nombre, estado, size = 44 }: { nombre: string; estado: Estado; size?: number }) {
  const tone =
    estado === 'alerta' ? { bg: P.orangeSoft, fg: P.orange }
    : estado === 'pendiente' ? { bg: P.amberSoft, fg: P.amber }
    : { bg: P.greenSoft, fg: P.green }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: size * 0.34, color: tone.fg }}>
        {iniciales(nombre)}
      </Text>
    </View>
  )
}

function EstadoBadge({ estado }: { estado: Estado }) {
  const map = {
    alerta:    { label: 'Alerta',    bg: P.orangeSoft, fg: P.orange },
    pendiente: { label: 'Pendiente', bg: P.amberSoft,  fg: P.amber },
    al_dia:    { label: 'Al día',    bg: P.greenSoft,  fg: P.green },
  }[estado]
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{map.label}</Text>
    </View>
  )
}

function UnreadBadge({ n }: { n: number }) {
  return (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadBadgeText}>{n > 9 ? '9+' : n}</Text>
    </View>
  )
}

type Tone = 'orange' | 'purple' | 'green'
function Tag({ label, tone }: { label: string; tone: Tone }) {
  const fg = tone === 'orange' ? P.orange : tone === 'green' ? P.green : P.purpleSoft
  const bg = tone === 'orange' ? P.orangeSoft : tone === 'green' ? P.greenSoft : 'rgba(150,128,255,0.12)'
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  )
}

// Tags que describen cada atleta (problema si tiene alerta; rutina + score si no).
function tagsDe(a: Atleta): { label: string; tone: Tone }[] {
  if (hasAlert(a)) {
    return (a.problemas || []).map((p) => ({ label: p, tone: 'orange' as Tone }))
  }
  const t: { label: string; tone: Tone }[] = []
  if (a.rutinaActiva) t.push({ label: 'Rutina activa', tone: 'purple' })
  if (a.score != null) t.push({ label: `Zyfit Score ${a.score}`, tone: 'green' })
  return t
}

function goToAtleta(a: Atleta) {
  router.push({ pathname: '/(coach)/atleta/[id]', params: { id: a.id, nombre: a.nombre } } as any)
}

// Card de la vista lista (fila horizontal).
function ListCard({ a }: { a: Atleta }) {
  const alert = hasAlert(a)
  return (
    <TouchableOpacity
      style={[styles.listCard, alert ? styles.cardWarm : styles.cardNeutral]}
      activeOpacity={0.7}
      onPress={() => goToAtleta(a)}
    >
      <View style={styles.listRow}>
        <Avatar nombre={a.nombre} estado={a.estado} />
        <View style={styles.listCenter}>
          <Text style={styles.nombre} numberOfLines={1}>{a.nombre}</Text>
          <Text style={styles.ultima} numberOfLines={1}>Última actividad {a.ultima}</Text>
        </View>
        {!!a.no_leidos && <UnreadBadge n={a.no_leidos} />}
        <EstadoBadge estado={a.estado} />
      </View>
      <View style={styles.tagsRow}>
        {tagsDe(a).map((t) => <Tag key={t.label} label={t.label} tone={t.tone} />)}
      </View>
    </TouchableOpacity>
  )
}

// Card de la vista grid (compacta, centrada).
function GridCard({ a }: { a: Atleta }) {
  const alert = hasAlert(a)
  // En grid el Zyfit Score es el tag principal de las cards sin alerta.
  const tags = alert ? tagsDe(a).slice(0, 2) : tagsDe(a).filter((t) => t.label.startsWith('Zyfit')).concat(
    tagsDe(a).filter((t) => !t.label.startsWith('Zyfit'))
  ).slice(0, 2)
  return (
    <TouchableOpacity
      style={[styles.gridCard, alert ? styles.cardWarm : styles.cardNeutral]}
      activeOpacity={0.7}
      onPress={() => goToAtleta(a)}
    >
      <Avatar nombre={a.nombre} estado={a.estado} size={52} />
      <Text style={[styles.nombre, styles.gridText]} numberOfLines={1}>{a.nombre}</Text>
      <Text style={[styles.ultima, styles.gridText]} numberOfLines={1}>{a.ultima}</Text>
      <View style={{ marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <EstadoBadge estado={a.estado} />
        {!!a.no_leidos && <UnreadBadge n={a.no_leidos} />}
      </View>
      <View style={styles.gridTags}>
        {tags.map((t) => <Tag key={t.label} label={t.label} tone={t.tone} />)}
      </View>
    </TouchableOpacity>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function CoachInicio() {
  const insets = useSafeAreaInsets()
  const [nombre, setNombre] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [vista, setVista] = useState<'lista' | 'grid'>('lista')

  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [metrics, setMetrics] = useState<CarteraMetrics | null>(null)
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetchCartera()
      setAtletas(res.atletas)
      setMetrics(res.metrics)
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar tu cartera.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    getCoachUser().then((u) => setNombre(u?.nombre || 'Coach'))
    fetchCoachMe()
      .then((me) => { setNombre(me.nombre); setCodigo(me.codigo_coach) })
      .catch(() => {})
    cargar(true)
  }, [cargar])

  const activos = metrics?.activos ?? 0
  const atencionHoy = metrics?.atencion_hoy ?? 0
  const adherencia = metrics?.adherencia ?? 0
  const adherenciaDelta = metrics?.adherencia_delta ?? 0

  const filtrados = useMemo(() => atletas.filter((a) => matchesFiltro(a, filtro)), [atletas, filtro])
  const conAlerta = filtrados.filter(hasAlert)
  const resto = filtrados.filter((a) => !hasAlert(a))
  // En grid mostramos todo lo filtrado, con las alertas primero.
  const grid = [...conAlerta, ...resto]

  const subio = adherenciaDelta >= 0

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => cargar(false)} tintColor={P.purpleSoft} />
        }
      >
        {/* Barra superior */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saludo}>{saludoHora()}</Text>
            <Text style={styles.coachNombre} numberOfLines={1}>{nombre}</Text>
          </View>
          <View style={styles.coachAvatar}>
            <Text style={styles.coachAvatarText}>{iniciales(nombre)}</Text>
          </View>
        </View>

        {/* Métricas rápidas */}
        <View style={styles.metricsRow}>
          {metrics === null ? (
            <>
              <View style={styles.metricCard}>
                <View style={styles.skeletonLg} />
                <View style={[styles.skeletonSm, { marginTop: 8 }]} />
                <View style={[styles.skeletonXs, { marginTop: 12 }]} />
              </View>
              <View style={styles.metricCard}>
                <View style={styles.skeletonLg} />
                <View style={[styles.skeletonSm, { marginTop: 8 }]} />
                <View style={[styles.skeletonXs, { marginTop: 12 }]} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{activos}</Text>
                <Text style={styles.metricLabel}>Atletas activos</Text>
                <Text style={styles.metricNote}>{atencionHoy} necesitan atención hoy</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{adherencia}%</Text>
                <Text style={styles.metricLabel}>Adherencia semanal</Text>
                <Text style={[styles.metricNote, { color: adherenciaDelta > 0 ? P.green : adherenciaDelta < 0 ? P.red : P.purpleMid }]}>
                  {adherenciaDelta > 0 ? '▲' : adherenciaDelta < 0 ? '▼' : '—'}{' '}
                  {adherenciaDelta !== 0 ? `${Math.abs(adherenciaDelta)}% vs semana anterior` : 'igual que la semana anterior'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Filtros + toggle de vista */}
        <View style={styles.controlsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {FILTROS.map((f) => {
              const active = filtro === f.key
              const esAtencion = f.key === 'atencion'
              const chipStyle = active
                ? { backgroundColor: P.purple, borderColor: P.purple }
                : esAtencion
                  ? { backgroundColor: P.orangeSoft, borderColor: 'rgba(255,138,61,0.35)' }
                  : { backgroundColor: 'transparent', borderColor: P.border }
              const textColor = active ? P.white : esAtencion ? P.orange : P.purpleSoft
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, chipStyle]}
                  activeOpacity={0.75}
                  onPress={() => setFiltro(f.key)}
                >
                  <Text style={[styles.chipText, { color: textColor }]}>{f.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, vista === 'lista' && styles.toggleBtnActive]}
              activeOpacity={0.8}
              onPress={() => setVista('lista')}
            >
              <IconList color={vista === 'lista' ? P.white : P.purpleSoft} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, vista === 'grid' && styles.toggleBtnActive]}
              activeOpacity={0.8}
              onPress={() => setVista('grid')}
            >
              <IconGrid color={vista === 'grid' ? P.white : P.purpleSoft} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenido */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={P.purpleMid} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => cargar(true)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : atletas.length === 0 ? (
          <View style={styles.emptyCartera}>
            <Text style={styles.emptyTitle}>Aún no tienes atletas</Text>
            <Text style={styles.emptySub}>
              Comparte tu código de coach para que tus atletas se vinculen a tu cartera.
            </Text>
            {!!codigo && (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>TU CÓDIGO</Text>
                <Text style={styles.codeValue}>{codigo}</Text>
              </View>
            )}
          </View>
        ) : filtrados.length === 0 ? (
          <Text style={styles.empty}>No hay atletas en este filtro.</Text>
        ) : vista === 'lista' ? (
          <>
            {conAlerta.length > 0 && (
              <View style={styles.section}>
                <SectionLabel>Requieren atención hoy</SectionLabel>
                {conAlerta.map((a) => <ListCard key={a.id} a={a} />)}
              </View>
            )}
            {resto.length > 0 && (
              <View style={styles.section}>
                <SectionLabel>Resto de cartera</SectionLabel>
                {resto.map((a) => <ListCard key={a.id} a={a} />)}
              </View>
            )}
          </>
        ) : (
          <View style={styles.gridWrap}>
            {grid.map((a) => <GridCard key={a.id} a={a} />)}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },

  // Barra superior
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  saludo: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    color: P.purpleFaint,
  },
  coachNombre: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 22,
    color: P.ink,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  coachAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: P.badgeBg,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: P.purpleMid,
  },

  // Métricas
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  metricCard: {
    flex: 1,
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    padding: 16,
  },
  metricValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 30,
    color: P.ink,
    letterSpacing: -0.8,
  },
  metricLabel: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    color: P.purpleSoft,
    marginTop: 2,
  },
  metricNote: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    color: P.purpleMid,
    marginTop: 10,
  },
  skeletonLg: { height: 34, borderRadius: 6, backgroundColor: P.purpleFaint, width: '60%' },
  skeletonSm: { height: 13, borderRadius: 4, backgroundColor: P.purpleFaint, width: '80%' },
  skeletonXs: { height: 11, borderRadius: 4, backgroundColor: P.purpleFaint, width: '70%' },

  // Controles
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  chipsScroll: { flex: 1 },
  chipsRow: { gap: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: P.inputBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    width: 34,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toggleBtnActive: { backgroundColor: P.purple },

  // Secciones
  section: { marginBottom: 18 },
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: P.purpleFaint,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  empty: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    color: P.purpleFaint,
    textAlign: 'center',
    marginTop: 40,
  },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  errorBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,77,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.3)',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.red, textAlign: 'center' },
  retryText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12, color: P.purpleMid, letterSpacing: 0.4 },
  emptyCartera: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 12, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 18, color: P.ink },
  emptySub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.purpleFaint, textAlign: 'center', lineHeight: 20 },
  codeBox: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    gap: 4,
  },
  codeLabel: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: P.purpleFaint, letterSpacing: 2 },
  codeValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 30, color: P.purpleMid, letterSpacing: 4 },

  // Cards comunes
  cardWarm: {
    backgroundColor: P.warmBg,
    borderColor: P.warmBorder,
  },
  cardNeutral: {
    backgroundColor: P.cardBgAlt,
    borderColor: P.border,
  },

  // Lista
  listCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listCenter: { flex: 1, minWidth: 0 },
  nombre: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: P.ink,
  },
  ultima: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    color: P.purpleFaint,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },

  // Grid
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  gridText: { textAlign: 'center', alignSelf: 'stretch' },
  gridTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },

  // Badge
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: P.purple, alignItems: 'center', justifyContent: 'center',
  },
  unreadBadgeText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: P.white },
  badgeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 0.3,
  },

  // Tag
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 0.2,
  },
})
