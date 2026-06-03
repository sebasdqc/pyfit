import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { P, iniciales } from '../../lib/coachTheme'
import { getCoachUser } from '../../lib/storage'
import { Estado, Atleta, ATLETAS, hasAlert } from '../../lib/coachMockData'

// Adherencia semanal de la cartera (placeholder + delta vs semana anterior).
const ADHERENCIA = 78
const ADHERENCIA_DELTA = 4   // +subió / -bajó

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
      <View style={{ marginVertical: 8 }}><EstadoBadge estado={a.estado} /></View>
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

  useEffect(() => {
    getCoachUser().then((u) => setNombre(u?.nombre || 'Coach'))
  }, [])

  const activos = ATLETAS.length
  const atencionHoy = ATLETAS.filter(hasAlert).length

  const filtrados = useMemo(() => ATLETAS.filter((a) => matchesFiltro(a, filtro)), [filtro])
  const conAlerta = filtrados.filter(hasAlert)
  const resto = filtrados.filter((a) => !hasAlert(a))
  // En grid mostramos todo lo filtrado, con las alertas primero.
  const grid = [...conAlerta, ...resto]

  const subio = ADHERENCIA_DELTA >= 0

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Barra superior */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saludo}>Buen día,</Text>
            <Text style={styles.coachNombre} numberOfLines={1}>{nombre}</Text>
          </View>
          <View style={styles.coachAvatar}>
            <Text style={styles.coachAvatarText}>{iniciales(nombre)}</Text>
          </View>
        </View>

        {/* Métricas rápidas */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{activos}</Text>
            <Text style={styles.metricLabel}>Atletas activos</Text>
            <Text style={styles.metricNote}>{atencionHoy} necesitan atención hoy</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{ADHERENCIA}%</Text>
            <Text style={styles.metricLabel}>Adherencia semanal</Text>
            <Text style={[styles.metricNote, { color: subio ? P.green : P.red }]}>
              {subio ? '▲' : '▼'} {Math.abs(ADHERENCIA_DELTA)}% vs semana anterior
            </Text>
          </View>
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
        {filtrados.length === 0 ? (
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
