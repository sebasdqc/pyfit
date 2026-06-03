import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { P, iniciales } from '../../lib/coachTheme'
import { ATLETAS, type Atleta, type Estado } from '../../lib/coachMockData'

// ─── Helpers de datos (placeholder — derivados de la cartera mock) ──────────────

const PERIODOS = [
  { key: '4s',  label: 'Últimas 4 sem.',  semanas: 4 },
  { key: '8s',  label: 'Últimas 8 sem.',  semanas: 8 },
  { key: '12s', label: 'Últimas 12 sem.', semanas: 12 },
] as const
type PeriodoKey = (typeof PERIODOS)[number]['key']

// Sesiones por semana de toda la cartera (12 sem; tomamos las últimas N). El
// valor 31 es la caída significativa que se pinta en naranja; está dentro de las
// últimas 4 semanas para que la vista por defecto ya muestre el caso de alerta.
const SESIONES_SEMANA_12 = [40, 44, 39, 46, 42, 38, 45, 48, 43, 31, 46, 44]

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

// Componentes del Zyfit Score derivados del score (placeholder).
function scoreComponentes(a: Atleta) {
  const s = a.score ?? 70
  return {
    consistencia: clamp(s + 6),
    adaptabilidad: clamp(s),
    progresion: clamp(s - 9),
  }
}

// Carga semanal individual (4 sem): progresa si está al día, decae si tiene alerta.
function cargaSemanal(a: Atleta, n = 4): number[] {
  const sube = a.estado === 'al_dia'
  return Array.from({ length: n }, (_, i) => (sube ? 54 + i * 7 : 74 - i * 4))
}

// Color de adherencia por nivel.
function adherColor(pct: number): string {
  if (pct >= 85) return P.green
  if (pct >= 70) return P.purple
  if (pct >= 55) return P.amber
  return P.red
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────────

function MiniAvatar({ nombre, estado, size = 36 }: { nombre: string; estado: Estado; size?: number }) {
  const tone = estado === 'al_dia' ? { bg: P.greenSoft, fg: P.green }
    : estado === 'pendiente' ? { bg: P.amberSoft, fg: P.amber }
    : { bg: P.orangeSoft, fg: P.orange }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: size * 0.34, color: tone.fg }}>{iniciales(nombre)}</Text>
    </View>
  )
}

function MetricCard({ value, label, extra, extraColor }: { value: string; label: string; extra?: string; extraColor?: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={styles.metricValue}>{value}</Text>
        {!!extra && <Text style={[styles.metricExtra, { color: extraColor || P.purpleFaint }]}>{extra}</Text>}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

function HBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={styles.hbarTrack}>
      <View style={[styles.hbarFill, { width: `${Math.max(4, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
  )
}

type Bar = { label: string; value: number; tone?: 'purple' | 'orange' | 'green' }
function VBars({ data, height = 120 }: { data: Bar[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const barW = data.length > 8 ? 9 : data.length > 5 ? 13 : 20
  return (
    <View style={styles.vbarsRow}>
      {data.map((d, i) => {
        const color = d.tone === 'orange' ? P.orange : d.tone === 'green' ? P.green : P.purple
        return (
          <View key={i} style={styles.vbarCol}>
            <View style={{ height, justifyContent: 'flex-end' }}>
              <View style={{ width: barW, height: Math.max(4, (d.value / max) * height), borderRadius: 4, backgroundColor: color }} />
            </View>
            <Text style={styles.vbarLabel} numberOfLines={1}>{d.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

// Hoja inferior reutilizable para los selectores (período / atleta).
function PickerSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

type Vista = 'cartera' | 'individual'

export default function CoachAnalytics() {
  const insets = useSafeAreaInsets()
  const [vista, setVista] = useState<Vista>('cartera')
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>('4s')
  const [periodoOpen, setPeriodoOpen] = useState(false)
  const [atletaId, setAtletaId] = useState(ATLETAS[0].id)
  const [atletaOpen, setAtletaOpen] = useState(false)

  const periodo = PERIODOS.find((p) => p.key === periodoKey)!
  const sel = ATLETAS.find((a) => a.id === atletaId) || ATLETAS[0]

  // Agregados de cartera (placeholder).
  const adherenciaMedia = Math.round(ATLETAS.reduce((s, a) => s + (a.adherencia ?? 0), 0) / ATLETAS.length)
  const scorePromedio = Math.round(ATLETAS.reduce((s, a) => s + (a.score ?? 0), 0) / ATLETAS.length)
  const totalSesiones = 142
  const ranking = useMemo(() => [...ATLETAS].sort((a, b) => (b.adherencia ?? 0) - (a.adherencia ?? 0)), [])

  // Sesiones por semana según período + detección de caída significativa.
  const sesionesData: Bar[] = useMemo(() => {
    const vals = SESIONES_SEMANA_12.slice(SESIONES_SEMANA_12.length - periodo.semanas)
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length
    return vals.map((v, i) => ({ label: `S${i + 1}`, value: v, tone: v < avg * 0.8 ? 'orange' : 'purple' }))
  }, [periodo.semanas])

  function abrirAtleta(a: Atleta) {
    setAtletaId(a.id)
    setVista('individual')
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Barra superior */}
        <View style={styles.topBar}>
          <Text style={styles.title}>Analytics</Text>
          <TouchableOpacity style={styles.periodPill} activeOpacity={0.75} onPress={() => setPeriodoOpen(true)}>
            <Text style={styles.periodText}>{periodo.label}</Text>
            <Text style={styles.periodCaret}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle de vista */}
        <View style={styles.toggle}>
          {(['cartera', 'individual'] as Vista[]).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, vista === v && styles.toggleBtnActive]}
              activeOpacity={0.85}
              onPress={() => setVista(v)}
            >
              <Text style={[styles.toggleText, { color: vista === v ? P.white : P.purpleFaint }]}>
                {v === 'cartera' ? 'Cartera' : 'Individual'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {vista === 'cartera' ? (
          <>
            {/* Métricas agregadas */}
            <View style={styles.grid}>
              <MetricCard value={`${adherenciaMedia}%`} label="Adherencia media" extra="▲ 3%" extraColor={P.green} />
              <MetricCard value="74%" label="Consistencia media" extra="▼ 2%" extraColor={P.orange} />
              <MetricCard value={`${totalSesiones}`} label="Sesiones ejecutadas" extra={`${ATLETAS.length} activos`} extraColor={P.purpleFaint} />
              <MetricCard value={`${scorePromedio}`} label="Zyfit Score medio" extra="▲ 2" extraColor={P.green} />
            </View>

            {/* Sesiones por semana */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Sesiones por semana — cartera</Text>
              <VBars data={sesionesData} />
            </View>

            {/* Ranking de adherencia */}
            <Text style={styles.sectionLabel}>Ranking de adherencia</Text>
            <View style={styles.rankCard}>
              {ranking.map((a, i) => {
                const pct = a.adherencia ?? 0
                const color = adherColor(pct)
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.rankRow, i > 0 && styles.rankRowBorder]}
                    activeOpacity={0.7}
                    onPress={() => abrirAtleta(a)}
                  >
                    <MiniAvatar nombre={a.nombre} estado={a.estado} size={34} />
                    <View style={styles.rankMid}>
                      <Text style={styles.rankNombre} numberOfLines={1}>{a.nombre}</Text>
                      <HBar pct={pct} color={color} />
                    </View>
                    <Text style={[styles.rankPct, { color }]}>{pct}%</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        ) : (
          <>
            {/* Selector de atleta */}
            <TouchableOpacity style={styles.selector} activeOpacity={0.8} onPress={() => setAtletaOpen(true)}>
              <MiniAvatar nombre={sel.nombre} estado={sel.estado} size={40} />
              <Text style={styles.selectorName} numberOfLines={1}>{sel.nombre}</Text>
              <Text style={styles.selectorCaret}>▾</Text>
            </TouchableOpacity>

            {/* Desglose del Zyfit Score */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreNum}>{sel.score ?? '—'}</Text>
              <Text style={styles.scoreLabel}>Zyfit Score</Text>

              {(() => {
                const c = scoreComponentes(sel)
                const comps = [
                  { nombre: 'Consistencia',  valor: c.consistencia,  peso: '40%', color: P.green },
                  { nombre: 'Adaptabilidad', valor: c.adaptabilidad, peso: '35%', color: P.purpleMid },
                  { nombre: 'Progresión',    valor: c.progresion,    peso: '25%', color: P.purpleLight },
                ]
                return comps.map((cp) => (
                  <View key={cp.nombre} style={styles.compRow}>
                    <View style={styles.compTop}>
                      <Text style={styles.compNombre}>{cp.nombre}</Text>
                      <Text style={styles.compVal}>{cp.valor} <Text style={styles.compPeso}>· {cp.peso}</Text></Text>
                    </View>
                    <HBar pct={cp.valor} color={cp.color} />
                  </View>
                ))
              })()}
            </View>

            {/* Métricas individuales */}
            {(() => {
              const rpe = sel.estado === 'al_dia' ? 7.4 : 8.6
              const optima = rpe >= 6.5 && rpe <= 8.0
              return (
                <View style={styles.grid}>
                  <MetricCard
                    value={`${sel.adherencia ?? 0}%`}
                    label="Adherencia"
                    extra={sel.estado === 'al_dia' ? '▲ 4%' : '▼ 5%'}
                    extraColor={sel.estado === 'al_dia' ? P.green : P.orange}
                  />
                  <MetricCard
                    value={rpe.toFixed(1)}
                    label="RPE promedio"
                    extra={optima ? 'zona óptima' : 'fuera de zona'}
                    extraColor={optima ? P.green : P.orange}
                  />
                </View>
              )
            })()}

            {/* Carga semanal */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Carga semanal — últimas 4 semanas</Text>
              {(() => {
                const carga = cargaSemanal(sel, 4)
                const max = Math.max(...carga)
                const data: Bar[] = carga.map((v, i) => ({
                  label: `S${i + 1}`,
                  value: v,
                  tone: i === carga.length - 1 && v === max ? 'green' : 'purple',
                }))
                return <VBars data={data} />
              })()}
            </View>
          </>
        )}
      </ScrollView>

      {/* Selector de período */}
      <PickerSheet visible={periodoOpen} title="Período de análisis" onClose={() => setPeriodoOpen(false)}>
        {PERIODOS.map((p) => {
          const active = p.key === periodoKey
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.optionRow, active && styles.optionRowActive]}
              activeOpacity={0.8}
              onPress={() => { setPeriodoKey(p.key); setPeriodoOpen(false) }}
            >
              <Text style={[styles.optionText, { color: active ? P.white : P.ink }]}>{p.label}</Text>
              {active && <Text style={styles.optionCheck}>✓</Text>}
            </TouchableOpacity>
          )
        })}
      </PickerSheet>

      {/* Selector de atleta */}
      <PickerSheet visible={atletaOpen} title="Selecciona un atleta" onClose={() => setAtletaOpen(false)}>
        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
          {ATLETAS.map((a) => {
            const active = a.id === atletaId
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.atletaRow, active && styles.optionRowActive]}
                activeOpacity={0.8}
                onPress={() => { setAtletaId(a.id); setAtletaOpen(false) }}
              >
                <MiniAvatar nombre={a.nombre} estado={a.estado} size={32} />
                <Text style={[styles.atletaRowName, { color: active ? P.white : P.ink }]} numberOfLines={1}>{a.nombre}</Text>
                <Text style={[styles.atletaRowPct, { color: adherColor(a.adherencia ?? 0) }]}>{a.adherencia ?? 0}%</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </PickerSheet>
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },

  // Barra superior
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 24, color: P.ink, letterSpacing: -0.5 },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P.badgeBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  periodText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, color: P.purpleSoft, letterSpacing: 0.3 },
  periodCaret: { fontSize: 11, color: P.purpleSoft },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: P.inputBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 20,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  toggleBtnActive: { backgroundColor: P.purple },
  toggleText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 },

  // Grid de métricas
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
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

  // Cards de gráfico
  chartCard: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    padding: 18,
    marginTop: 10,
    marginBottom: 8,
  },
  chartTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.ink, marginBottom: 18 },
  vbarsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  vbarCol: { flex: 1, alignItems: 'center', gap: 8 },
  vbarLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: P.purpleFaint },

  // Sección
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: P.purpleFaint,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 12,
  },

  // Ranking
  rankCard: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rankRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.divider },
  rankMid: { flex: 1, minWidth: 0, gap: 7 },
  rankNombre: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: P.ink },
  rankPct: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, minWidth: 42, textAlign: 'right' },

  // Barra horizontal
  hbarTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(150,128,255,0.14)', overflow: 'hidden' },
  hbarFill: { height: 6, borderRadius: 3 },

  // Selector de atleta (individual)
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  selectorName: { flex: 1, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: P.ink },
  selectorCaret: { fontSize: 14, color: P.purpleSoft },

  // Score breakdown
  scoreCard: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    padding: 20,
    marginBottom: 8,
    alignItems: 'stretch',
  },
  scoreNum: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 46, color: P.purpleMid, letterSpacing: -1.5, textAlign: 'center' },
  scoreLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: P.purpleFaint, letterSpacing: 0.6, textAlign: 'center', marginTop: -2, marginBottom: 18 },
  compRow: { marginBottom: 14, gap: 7 },
  compTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  compNombre: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: P.ink },
  compVal: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: P.ink },
  compPeso: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: P.purpleFaint },

  // Picker sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: P.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.borderBright, marginBottom: 16 },
  sheetTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: P.ink, marginBottom: 12 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  optionRowActive: { backgroundColor: P.purple },
  optionText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15 },
  optionCheck: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: P.white },
  atletaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  atletaRowName: { flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 15 },
  atletaRowPct: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13 },
})
