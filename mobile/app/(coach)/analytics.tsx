import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { P, iniciales } from '../../lib/coachTheme'
import { type Estado } from '../../lib/coachTypes'
import { fetchAnalytics, type AnalyticsResponse, type AnalyticsAtleta } from '../../lib/coachApi'
import { useTranslation, type ScalarKey } from '../../lib/i18n'

// ─── Config ─────────────────────────────────────────────────────────────────────

const PERIODOS = [
  { key: '4s',  labelKey: 'coach_periodo_4s' as ScalarKey,  semanas: 4 },
  { key: '8s',  labelKey: 'coach_periodo_8s' as ScalarKey,  semanas: 8 },
  { key: '12s', labelKey: 'coach_periodo_12s' as ScalarKey, semanas: 12 },
] as const
type PeriodoKey = (typeof PERIODOS)[number]['key']

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
  const { t } = useTranslation()
  const [vista, setVista] = useState<Vista>('cartera')
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>('4s')
  const [periodoOpen, setPeriodoOpen] = useState(false)
  const [atletaId, setAtletaId] = useState<string | null>(null)
  const [atletaOpen, setAtletaOpen] = useState(false)

  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodo = PERIODOS.find((p) => p.key === periodoKey)!

  const cargar = React.useCallback(async (spinner = true) => {
    if (spinner) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetchAnalytics(periodo.semanas)
      setData(res)
      setAtletaId((prev) =>
        prev && res.atletas.some((a) => a.id === prev) ? prev : (res.atletas[0]?.id ?? null))
    } catch (e: any) {
      setError(e?.message || t('coach_error_analytics'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [periodo.semanas, t])

  useEffect(() => { cargar(true) }, [cargar])

  const atletas = data?.atletas ?? []
  const m = data?.metrics
  const sel: AnalyticsAtleta | null = atletas.find((a) => a.id === atletaId) || atletas[0] || null

  const adherenciaMedia = m?.adherencia_media ?? 0
  const consistenciaMedia = m?.consistencia_media ?? 0
  const scorePromedio = m?.score_promedio ?? 0
  const totalSesiones = m?.sesiones_total ?? 0
  const activos = m?.activos ?? 0
  const adherenciaDelta = m?.adherencia_delta ?? 0

  const ranking = useMemo(() => [...atletas].sort((a, b) => b.adherencia - a.adherencia), [atletas])

  const sesionesData: Bar[] = useMemo(() => {
    const vals = data?.sesiones_semana ?? []
    const avg = vals.length ? vals.reduce((s, v) => s + v.value, 0) / vals.length : 0
    return vals.map((v) => ({ label: v.label, value: v.value, tone: v.value < avg * 0.8 ? 'orange' : 'purple' }))
  }, [data])

  function abrirAtleta(a: AnalyticsAtleta) {
    setAtletaId(a.id)
    setVista('individual')
  }

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
          <Text style={styles.title}>{t('coach_tab_analytics')}</Text>
          <TouchableOpacity style={styles.periodPill} activeOpacity={0.75} onPress={() => setPeriodoOpen(true)}>
            <Text style={styles.periodText}>{t(periodo.labelKey)}</Text>
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
                {v === 'cartera' ? t('coach_toggle_cartera') : t('coach_toggle_individual')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !data ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={P.purpleMid} /></View>
        ) : error ? (
          <Text style={styles.emptyText}>{error}</Text>
        ) : atletas.length === 0 ? (
          <Text style={styles.emptyText}>{t('coach_analytics_empty')}</Text>
        ) : vista === 'cartera' ? (
          <>
            {/* Métricas agregadas */}
            <View style={styles.grid}>
              <MetricCard value={`${adherenciaMedia}%`} label={t('coach_metric_adherencia_media')}
                extra={adherenciaDelta !== 0 ? `${adherenciaDelta > 0 ? '▲' : '▼'} ${Math.abs(adherenciaDelta)}%` : t('coach_estable')}
                extraColor={adherenciaDelta >= 0 ? P.green : P.orange} />
              <MetricCard value={`${consistenciaMedia}%`} label={t('coach_metric_consistencia_media')} />
              <MetricCard value={`${totalSesiones}`} label={t('coach_metric_sesiones_ejecutadas')} extra={`${activos} ${t('coach_activos_suffix')}`} extraColor={P.purpleFaint} />
              <MetricCard value={`${scorePromedio}`} label={t('coach_metric_zyfit_score_medio')} />
            </View>

            {/* Sesiones por semana */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('coach_chart_sesiones_semana_cartera')}</Text>
              <VBars data={sesionesData} />
            </View>

            {/* Ranking de adherencia */}
            <Text style={styles.sectionLabel}>{t('coach_ranking_adherencia')}</Text>
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
        ) : sel ? (
          <>
            {/* Selector de atleta */}
            <TouchableOpacity style={styles.selector} activeOpacity={0.8} onPress={() => setAtletaOpen(true)}>
              <MiniAvatar nombre={sel.nombre} estado={sel.estado} size={40} />
              <Text style={styles.selectorName} numberOfLines={1}>{sel.nombre}</Text>
              <Text style={styles.selectorCaret}>▾</Text>
            </TouchableOpacity>

            {/* Desglose del Zyfit Score (componentes reales) */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreNum}>{sel.score}</Text>
              <Text style={styles.scoreLabel}>Zyfit Score</Text>

              {[
                { nombre: t('coach_word_consistencia'), valor: sel.consistencia, peso: '45%', color: P.green },
                { nombre: t('coach_word_adherencia'),    valor: sel.adherencia,   peso: '40%', color: P.purpleMid },
                { nombre: t('coach_word_recencia'),      valor: sel.recencia,     peso: '15%', color: P.purpleLight },
              ].map((cp) => (
                <View key={cp.nombre} style={styles.compRow}>
                  <View style={styles.compTop}>
                    <Text style={styles.compNombre}>{cp.nombre}</Text>
                    <Text style={styles.compVal}>{cp.valor} <Text style={styles.compPeso}>· {cp.peso}</Text></Text>
                  </View>
                  <HBar pct={cp.valor} color={cp.color} />
                </View>
              ))}
            </View>

            {/* Métricas individuales */}
            <View style={styles.grid}>
              <MetricCard
                value={`${sel.adherencia}%`}
                label={t('coach_word_adherencia')}
                extra={sel.recencia >= 80 ? t('coach_activo_word') : t('coach_irregular_word')}
                extraColor={sel.recencia >= 80 ? P.green : P.orange}
              />
              {(() => {
                const rpe = sel.rpe_promedio
                const optima = rpe != null && rpe >= 6.5 && rpe <= 8.0
                return (
                  <MetricCard
                    value={rpe != null ? rpe.toFixed(1) : '—'}
                    label={t('coach_rpe_promedio_label')}
                    extra={rpe == null ? t('coach_sin_datos_lower') : optima ? t('coach_zona_optima') : t('coach_fuera_de_zona')}
                    extraColor={rpe == null ? P.purpleFaint : optima ? P.green : P.orange}
                  />
                )
              })()}
            </View>

            {/* Carga semanal (sesiones/semana reales) */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t('coach_carga_semanal_title')} {periodo.semanas})</Text>
              {(() => {
                const carga = sel.carga_semanal
                const max = Math.max(...carga, 1)
                const data: Bar[] = carga.map((v, i) => ({
                  label: `S${i + 1}`,
                  value: v,
                  tone: i === carga.length - 1 && v === max ? 'green' : 'purple',
                }))
                return <VBars data={data} />
              })()}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Selector de período */}
      <PickerSheet visible={periodoOpen} title={t('coach_periodo_analisis_title')} onClose={() => setPeriodoOpen(false)}>
        {PERIODOS.map((p) => {
          const active = p.key === periodoKey
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.optionRow, active && styles.optionRowActive]}
              activeOpacity={0.8}
              onPress={() => { setPeriodoKey(p.key); setPeriodoOpen(false) }}
            >
              <Text style={[styles.optionText, { color: active ? P.white : P.ink }]}>{t(p.labelKey)}</Text>
              {active && <Text style={styles.optionCheck}>✓</Text>}
            </TouchableOpacity>
          )
        })}
      </PickerSheet>

      {/* Selector de atleta */}
      <PickerSheet visible={atletaOpen} title={t('coach_selecciona_atleta_title')} onClose={() => setAtletaOpen(false)}>
        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
          {atletas.map((a) => {
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
                <Text style={[styles.atletaRowPct, { color: adherColor(a.adherencia) }]}>{a.adherencia}%</Text>
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
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.purpleFaint, textAlign: 'center', marginTop: 48 },

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
