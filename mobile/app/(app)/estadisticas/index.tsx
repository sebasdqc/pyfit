import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
import { COLORS, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyData {
  label: string   // e.g. "S-4", "S-3", "S-2", "S-1"
  cumplimiento: number
  sesiones: number
}

interface Alerta {
  tipo: 'warning' | 'info'
  emoji: string
  mensaje: string
}

interface Logro {
  id: string
  label: string
  icon: string
}

interface EjercicioAdaptacion {
  nombre: string
  veces: number
  cumplimiento: number | null
  patron?: string
}

interface PatronDistribucion {
  patron: string
  veces: number
}

interface MesocicloData {
  necesita_deload: boolean
  recomendacion: string
}

interface AdaptacionData {
  tiene_datos: boolean
  total_sesiones?: number
  rpe_bias?: number | null
  rpe_bias_label?: string | null
  cumplimiento_promedio?: number | null
  rating_promedio?: number | null
  volumen_tolerado_semana?: number | null
  patron_preferido?: string
  semanas_carga_consecutivas?: number
  ejercicios_top?: EjercicioAdaptacion[]
  ejercicios_mejora?: EjercicioAdaptacion[]
  patron_distribucion?: PatronDistribucion[]
  mesociclo?: MesocicloData
}

interface StatsData {
  fatiga_porcentaje: number
  volumen_porcentaje: number
  racha_actual: number
  puntos_totales: number
  nivel: string
  logros: Logro[]
  cumplimiento_semanal: WeeklyData[]
  rpe_historico: number[]
  sesiones_esta_semana: number
  sesiones_semana_anterior: number
  series_por_semana: number
  distribucion_foco: { nombre: string; porcentaje: number }[]
  alertas: Alerta[]
  adaptacion?: AdaptacionData | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nivelLabel(nivel: string): string {
  const map: Record<string, string> = {
    rookie: 'Rookie',
    atleta: 'Atleta',
    elite: 'Élite',
    leyenda: 'Leyenda',
  }
  return map[nivel?.toLowerCase()] ?? nivel ?? 'Rookie'
}

function average(arr: number[]): number {
  if (!arr.length) return 0
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
}

const PATRON_LABELS: Record<string, string> = {
  empuje_horizontal: 'Empuje horiz.',
  empuje_vertical: 'Empuje vert.',
  jale_horizontal: 'Jale horiz.',
  jale_vertical: 'Jale vert.',
  sentadilla: 'Sentadilla',
  bisagra: 'Bisagra',
  core: 'Core',
  cardio: 'Cardio',
  movilidad: 'Movilidad',
}

function patronLabel(p: string): string {
  return PATRON_LABELS[p] ?? p
}

// ─── Circulo Progreso ─────────────────────────────────────────────────────────

function CirculoProgreso({
  porcentaje,
  color,
  size = 90,
  label,
}: {
  porcentaje: number
  color: string
  size?: number
  label: string
}) {
  const { colors } = useTheme()
  const radio = (size - 14) / 2
  const circunferencia = 2 * Math.PI * radio
  const clamped = Math.min(Math.max(porcentaje, 0), 100)
  const offset = circunferencia - (clamped / 100) * circunferencia

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2} cy={size / 2} r={radio}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7"
          />
          <Circle
            cx={size / 2} cy={size / 2} r={radio}
            fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${circunferencia} ${circunferencia}`}
            strokeDashoffset={offset} strokeLinecap="round"
          />
        </Svg>
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: size, height: size,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: colors.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 17 }}>
            {porcentaje}%
          </Text>
        </View>
      </View>
      <Text style={{
        color: colors.inkMuted,
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 9,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        {label}
      </Text>
    </View>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: WeeklyData[] }) {
  const { colors } = useTheme()
  const MAX_HEIGHT = 80
  const maxVal = Math.max(...data.map(d => d.cumplimiento), 1)

  return (
    <View style={barStyles.container}>
      {data.map((week, i) => {
        const barH = Math.max((week.cumplimiento / maxVal) * MAX_HEIGHT, 4)
        const barColor =
          week.cumplimiento >= 90 ? colors.green
          : week.cumplimiento >= 70 ? colors.accent
          : colors.orange
        return (
          <View key={i} style={barStyles.barCol}>
            <Text style={[barStyles.barValue, { color: colors.inkSecondary }]}>{week.cumplimiento}%</Text>
            <View style={[barStyles.barTrack, { height: MAX_HEIGHT }]}>
              <View style={[barStyles.bar, { height: barH, backgroundColor: barColor }]} />
            </View>
            <Text style={[barStyles.barLabel, { color: colors.inkMuted }]}>{week.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  barValue: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 0.2,
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
})

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EstadisticasScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const adaptStyles = useMemo(() => makeAdaptStyles(colors), [colors])

  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      const res = await apiGet('/api/stats/full/')
      setData(res)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Build fallback weekly data if backend doesn't send it
  const weeklyData: WeeklyData[] = data?.cumplimiento_semanal?.length
    ? data.cumplimiento_semanal
    : [
        { label: 'S-4', cumplimiento: 0, sesiones: 0 },
        { label: 'S-3', cumplimiento: 0, sesiones: 0 },
        { label: 'S-2', cumplimiento: 0, sesiones: 0 },
        { label: 'S-1', cumplimiento: 0, sesiones: 0 },
      ]

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={['rgba(37,99,255,0.25)', 'transparent']}
          style={styles.gradient}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calculando estadísticas...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={['rgba(37,99,255,0.25)', 'transparent']}
          style={styles.gradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchStats} style={styles.retryBtn} activeOpacity={0.8}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const fatigaPct = data?.fatiga_porcentaje ?? 0
  const fatigaColor = fatigaPct >= 70 ? colors.red : fatigaPct >= 40 ? colors.orange : colors.green

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(37,99,255,0.25)', 'transparent']}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Estadísticas</Text>

        {/* ── SECTION 1: RENDIMIENTO ── */}
        <SectionHeader title="RENDIMIENTO" />

        {/* Cumplimiento semanal bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cumplimiento semanal</Text>
          <BarChart data={weeklyData} />
        </View>

        {/* RPE promedio */}
        <View style={styles.card}>
          <View style={styles.statInlineRow}>
            <View>
              <Text style={styles.cardTitle}>RPE promedio</Text>
              <Text style={styles.statSubtitle}>Basado en historial de sesiones</Text>
            </View>
            <View style={styles.bigValueBox}>
              <Text style={styles.bigValue}>
                {data?.rpe_historico?.length ? average(data.rpe_historico) : '—'}
              </Text>
              <Text style={styles.bigValueLabel}>/ 10</Text>
            </View>
          </View>
        </View>

        {/* ── SECTION 2: CARGA ── */}
        <SectionHeader title="CARGA" />

        {/* Circles */}
        <View style={[styles.card, styles.circlesCard]}>
          <CirculoProgreso
            porcentaje={fatigaPct}
            color={fatigaColor}
            label="Fatiga"
          />
          <View style={styles.circlesDivider} />
          <CirculoProgreso
            porcentaje={data?.volumen_porcentaje ?? 0}
            color={colors.accent}
            label="Volumen sem."
          />
        </View>

        {/* Series y sesiones */}
        <View style={[styles.card, { flexDirection: 'row', gap: 12 }]}>
          <View style={styles.metaStatBox}>
            <Text style={styles.metaStatValue}>{data?.series_por_semana ?? 0}</Text>
            <Text style={styles.metaStatLabel}>Series / semana</Text>
          </View>
          <View style={[styles.metaStatBox, { borderLeftWidth: 1, borderLeftColor: colors.borderDefault, paddingLeft: 12 }]}>
            <Text style={styles.metaStatValue}>{data?.sesiones_esta_semana ?? 0}</Text>
            <Text style={styles.metaStatLabel}>Sesiones / semana</Text>
          </View>
        </View>

        {/* Distribución foco muscular */}
        {data?.distribucion_foco?.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Distribución foco muscular</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {data.distribucion_foco.map((item, i) => (
                <View key={i} style={styles.focusRow}>
                  <Text style={styles.focusLabel}>{item.nombre}</Text>
                  <View style={styles.focusBarTrack}>
                    <View style={[styles.focusBar, { width: `${Math.min(item.porcentaje, 100)}%` }]} />
                  </View>
                  <Text style={styles.focusPct}>{item.porcentaje}%</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Alertas */}
        {data?.alertas?.length ? (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {data.alertas.map((alerta, i) => (
              <View
                key={i}
                style={[
                  styles.alertaCard,
                  {
                    borderColor: alerta.tipo === 'warning'
                      ? 'rgba(255,170,50,0.3)'
                      : 'rgba(79,140,255,0.3)',
                    backgroundColor: alerta.tipo === 'warning'
                      ? 'rgba(255,170,50,0.07)'
                      : 'rgba(79,140,255,0.07)',
                  },
                ]}
              >
                <Text style={styles.alertaEmoji}>{alerta.emoji}</Text>
                <Text style={[
                  styles.alertaMensaje,
                  { color: alerta.tipo === 'warning' ? colors.orange : colors.accent },
                ]}>
                  {alerta.mensaje}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── SECTION 3: PREVENCIÓN ── */}
        <SectionHeader title="PREVENCIÓN" />

        {/* Perfil de riesgo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Perfil de riesgo</Text>
          <View style={styles.riesgoRow}>
            <View style={[styles.riesgoDot, { backgroundColor: fatigaColor }]} />
            <Text style={styles.riesgoLabel}>
              Fatiga actual:{' '}
              <Text style={{ color: fatigaColor, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                {fatigaPct >= 70 ? 'Alta' : fatigaPct >= 40 ? 'Media' : 'Baja'} ({fatigaPct}%)
              </Text>
            </Text>
          </View>
        </View>

        {/* Señales de sobreentrenamiento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Señales de sobreentrenamiento</Text>
          {data?.alertas?.filter(a => a.tipo === 'warning').length ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              {data.alertas.filter(a => a.tipo === 'warning').map((alerta, i) => (
                <View key={i} style={styles.senalRow}>
                  <Text style={styles.senalEmoji}>{alerta.emoji}</Text>
                  <Text style={styles.senalText}>{alerta.mensaje}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.sinAlertas}>
              <Text style={styles.sinAlertasText}>Sin alertas activas ✓</Text>
              <Text style={styles.sinAlertasSubtext}>Tu carga de entrenamiento está bajo control.</Text>
            </View>
          )}
        </View>

        {/* ── SECTION 4: PROGRESIÓN ── */}
        <SectionHeader title="PROGRESIÓN" />

        {/* Nivel y racha */}
        <View style={[styles.card, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
          <View style={styles.nivelBadge}>
            <Text style={styles.nivelText}>{nivelLabel(data?.nivel ?? 'rookie')}</Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={styles.nivelStat}>
              <Text style={{ color: colors.orange, fontFamily: 'SpaceGrotesk-Bold' }}>
                {data?.racha_actual ?? 0}
              </Text>
              {' días de racha'}
            </Text>
            <Text style={styles.nivelStat}>
              <Text style={{ color: colors.accent, fontFamily: 'SpaceGrotesk-Bold' }}>
                {data?.puntos_totales ?? 0}
              </Text>
              {' puntos totales'}
            </Text>
          </View>
        </View>

        {/* Esta semana vs anterior */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Semana actual vs. anterior</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonBox}>
              <Text style={styles.comparisonValue}>{data?.sesiones_esta_semana ?? 0}</Text>
              <Text style={styles.comparisonLabel}>Esta semana</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonBox}>
              <Text style={[styles.comparisonValue, { color: colors.inkSecondary }]}>
                {data?.sesiones_semana_anterior ?? 0}
              </Text>
              <Text style={styles.comparisonLabel}>Sem. anterior</Text>
            </View>
          </View>
        </View>

        {/* Logros */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Logros</Text>
          {data?.logros?.length ? (
            <View style={styles.logrosGrid}>
              {data.logros.map(logro => (
                <View key={logro.id} style={styles.logroBadge}>
                  <Text style={styles.logroIcon}>{logro.icon}</Text>
                  <Text style={styles.logroLabel}>{logro.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.sinLogros}>
              <Text style={styles.sinLogrosText}>Sin logros aún</Text>
              <Text style={styles.sinLogrosSubtext}>Completa sesiones para desbloquear logros.</Text>
            </View>
          )}
        </View>

        {/* ── SECTION 5: ADAPTACIÓN IA ── */}
        <SectionHeader title="ADAPTACIÓN IA" />

        {!data?.adaptacion || !data.adaptacion.tiene_datos ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Aprendizaje en progreso</Text>
            <Text style={[styles.statSubtitle, { marginTop: 6, lineHeight: 20 }]}>
              PyFit necesita al menos 3 sesiones con feedback completado para comenzar a personalizar tu entrenamiento de forma adaptativa.
            </Text>
            <View style={adaptStyles.progressRow}>
              <View style={[adaptStyles.progressBar, {
                width: `${Math.min(((data?.adaptacion?.total_sesiones ?? 0) / 3) * 100, 100)}%`
              }]} />
            </View>
            <Text style={adaptStyles.progressLabel}>
              {data?.adaptacion?.total_sesiones ?? 0} / 3 sesiones completadas
            </Text>
          </View>
        ) : (
          <>
            {/* RPE Bias card */}
            {data.adaptacion.rpe_bias != null && (
              <View style={[styles.card, {
                borderColor: Math.abs(data.adaptacion.rpe_bias) > 1
                  ? 'rgba(255,170,50,0.35)'
                  : 'rgba(50,200,150,0.3)',
              }]}>
                <View style={adaptStyles.biasRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Calibración RPE</Text>
                    <Text style={[styles.statSubtitle, { marginTop: 4 }]}>
                      {data.adaptacion.rpe_bias_label}
                    </Text>
                  </View>
                  <View style={[adaptStyles.biasBadge, {
                    backgroundColor: Math.abs(data.adaptacion.rpe_bias) > 1
                      ? 'rgba(255,170,50,0.12)'
                      : 'rgba(50,200,150,0.12)',
                  }]}>
                    <Text style={[adaptStyles.biasValue, {
                      color: Math.abs(data.adaptacion.rpe_bias) > 1
                        ? colors.orange
                        : colors.green,
                    }]}>
                      {data.adaptacion.rpe_bias > 0 ? '+' : ''}{data.adaptacion.rpe_bias.toFixed(1)}
                    </Text>
                    <Text style={adaptStyles.biasUnit}>RPE</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Resumen de métricas */}
            <View style={[styles.card, { flexDirection: 'row', gap: 0 }]}>
              <View style={[adaptStyles.metricBox, { flex: 1 }]}>
                <Text style={adaptStyles.metricValue}>
                  {data.adaptacion.cumplimiento_promedio != null
                    ? `${Math.round(data.adaptacion.cumplimiento_promedio)}%`
                    : '—'}
                </Text>
                <Text style={adaptStyles.metricLabel}>Cumpl. histórico</Text>
              </View>
              <View style={adaptStyles.metricDivider} />
              <View style={[adaptStyles.metricBox, { flex: 1 }]}>
                <Text style={adaptStyles.metricValue}>
                  {data.adaptacion.volumen_tolerado_semana != null
                    ? `${data.adaptacion.volumen_tolerado_semana} ses.`
                    : '—'}
                </Text>
                <Text style={adaptStyles.metricLabel}>Vol. óptimo/sem.</Text>
              </View>
              <View style={adaptStyles.metricDivider} />
              <View style={[adaptStyles.metricBox, { flex: 1 }]}>
                <Text style={adaptStyles.metricValue}>
                  {data.adaptacion.rating_promedio != null
                    ? data.adaptacion.rating_promedio.toFixed(1)
                    : '—'}
                </Text>
                <Text style={adaptStyles.metricLabel}>Rating medio</Text>
              </View>
            </View>

            {/* Ejercicios más realizados */}
            {(data.adaptacion.ejercicios_top?.length ?? 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ejercicios más realizados</Text>
                <View style={{ marginTop: 10, gap: 8 }}>
                  {data.adaptacion.ejercicios_top!.map((ej, i) => (
                    <View key={i} style={adaptStyles.ejRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={adaptStyles.ejNombre}>{ej.nombre}</Text>
                        {ej.patron ? (
                          <Text style={adaptStyles.ejPatron}>{patronLabel(ej.patron)}</Text>
                        ) : null}
                      </View>
                      <View style={adaptStyles.ejStats}>
                        <Text style={adaptStyles.ejVeces}>{ej.veces}×</Text>
                        {ej.cumplimiento != null && (
                          <View style={[adaptStyles.ejCumplBadge, {
                            backgroundColor: ej.cumplimiento >= 80
                              ? 'rgba(50,200,150,0.12)'
                              : 'rgba(255,170,50,0.12)',
                          }]}>
                            <Text style={[adaptStyles.ejCumplText, {
                              color: ej.cumplimiento >= 80 ? colors.green : colors.orange,
                            }]}>
                              {Math.round(ej.cumplimiento)}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Ejercicios que necesitan atención */}
            {(data.adaptacion.ejercicios_mejora?.length ?? 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ejercicios a mejorar</Text>
                <Text style={[styles.statSubtitle, { marginBottom: 10 }]}>
                  Cumplimiento consistentemente bajo — considera ajustar carga o técnica
                </Text>
                {data.adaptacion.ejercicios_mejora!.map((ej, i) => (
                  <View key={i} style={[adaptStyles.ejRow, { marginBottom: 6 }]}>
                    <Text style={[adaptStyles.ejNombre, { flex: 1 }]}>{ej.nombre}</Text>
                    <Text style={[adaptStyles.ejCumplText, { color: colors.orange }]}>
                      {ej.cumplimiento != null ? `${Math.round(ej.cumplimiento)}%` : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Distribución de patrones */}
            {(data.adaptacion.patron_distribucion?.length ?? 0) > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Patrones de movimiento</Text>
                <View style={{ marginTop: 10, gap: 8 }}>
                  {data.adaptacion.patron_distribucion!.slice(0, 6).map((p, i) => {
                    const maxVeces = data.adaptacion!.patron_distribucion![0].veces
                    const pct = Math.round((p.veces / maxVeces) * 100)
                    return (
                      <View key={i} style={styles.focusRow}>
                        <Text style={[styles.focusLabel, { minWidth: 90 }]}>{patronLabel(p.patron)}</Text>
                        <View style={styles.focusBarTrack}>
                          <View style={[styles.focusBar, { width: `${pct}%`, backgroundColor: colors.accent }]} />
                        </View>
                        <Text style={styles.focusPct}>{p.veces}×</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Mesociclo */}
            {data.adaptacion.mesociclo && (
              <View style={[styles.card, {
                borderColor: data.adaptacion.mesociclo.necesita_deload
                  ? 'rgba(255,170,50,0.4)'
                  : 'rgba(79,140,255,0.25)',
              }]}>
                <View style={adaptStyles.mesocicloHeader}>
                  <Text style={styles.cardTitle}>Estado del mesociclo</Text>
                  <View style={[adaptStyles.mesocicloBadge, {
                    backgroundColor: data.adaptacion.mesociclo.necesita_deload
                      ? 'rgba(255,170,50,0.15)'
                      : 'rgba(79,140,255,0.12)',
                  }]}>
                    <Text style={[adaptStyles.mesocicloBadgeText, {
                      color: data.adaptacion.mesociclo.necesita_deload
                        ? colors.orange
                        : colors.accent,
                    }]}>
                      {data.adaptacion.mesociclo.necesita_deload ? 'DELOAD' : 'EN PROGRESO'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.statSubtitle, { marginTop: 8, lineHeight: 20 }]}>
                  {data.adaptacion.mesociclo.recomendacion}
                </Text>
                {(data.adaptacion.semanas_carga_consecutivas ?? 0) > 0 && (
                  <Text style={adaptStyles.semanasCarga}>
                    {data.adaptacion.semanas_carga_consecutivas} sem. de carga consecutivas
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 400,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 60,
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
    },
    errorText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: 'rgba(255,68,68,0.15)',
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 12,
    },
    retryText: {
      color: c.red,
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
    },
    pageTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      letterSpacing: -0.8,
      marginBottom: 24,
    },
    // Section header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
      marginTop: 8,
    },
    sectionAccent: {
      width: 3,
      height: 14,
      borderRadius: 2,
      backgroundColor: c.accent,
    },
    sectionTitle: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    // Card
    card: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      letterSpacing: -0.2,
      marginBottom: 4,
    },
    // Stat inline
    statInlineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statSubtitle: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      marginTop: 2,
    },
    bigValueBox: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
    },
    bigValue: {
      color: c.accent,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 32,
      letterSpacing: -1,
    },
    bigValueLabel: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
    },
    // Circles
    circlesCard: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    circlesDivider: {
      width: 1,
      height: 70,
      backgroundColor: c.borderDefault,
    },
    // Meta stats
    metaStatBox: {
      flex: 1,
      gap: 4,
    },
    metaStatValue: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 24,
      letterSpacing: -0.8,
    },
    metaStatLabel: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
    },
    // Focus distribution
    focusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    focusLabel: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      width: 80,
    },
    focusBarTrack: {
      flex: 1,
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    focusBar: {
      height: 6,
      backgroundColor: c.accent,
      borderRadius: 3,
    },
    focusPct: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      width: 32,
      textAlign: 'right',
    },
    // Alertas
    alertaCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },
    alertaEmoji: {
      fontSize: 18,
      lineHeight: 22,
    },
    alertaMensaje: {
      flex: 1,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      lineHeight: 19,
    },
    // Riesgo
    riesgoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
    },
    riesgoDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    riesgoLabel: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
    },
    // Señales
    senalRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    senalEmoji: {
      fontSize: 14,
      lineHeight: 20,
    },
    senalText: {
      flex: 1,
      color: c.orange,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      lineHeight: 19,
    },
    sinAlertas: {
      paddingTop: 12,
      gap: 4,
    },
    sinAlertasText: {
      color: c.green,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
    },
    sinAlertasSubtext: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
    },
    // Nivel
    nivelBadge: {
      backgroundColor: 'rgba(79,140,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(79,140,255,0.25)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    nivelText: {
      color: c.accent,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      letterSpacing: -0.3,
    },
    nivelStat: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
    },
    // Comparison
    comparisonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    comparisonBox: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    comparisonValue: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 32,
      letterSpacing: -1,
    },
    comparisonLabel: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
    },
    comparisonDivider: {
      width: 1,
      height: 50,
      backgroundColor: c.borderDefault,
    },
    // Logros
    logrosGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    logroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    logroIcon: {
      fontSize: 14,
    },
    logroLabel: {
      color: c.inkSecondary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
    },
    sinLogros: {
      paddingTop: 12,
      gap: 4,
    },
    sinLogrosText: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
    },
    sinLogrosSubtext: {
      color: c.inkMuted,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
    },
  })
}

function makeAdaptStyles(c: Colors) {
  return StyleSheet.create({
    progressRow: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 3,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: c.accent,
      borderRadius: 3,
    },
    progressLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.4,
      marginTop: 6,
    },
    biasRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    biasBadge: {
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },
    biasValue: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      letterSpacing: -0.5,
    },
    biasUnit: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.4,
      marginTop: 2,
    },
    metricBox: {
      alignItems: 'center',
      paddingVertical: 4,
    },
    metricDivider: {
      width: 1,
      backgroundColor: c.borderDefault,
      marginVertical: 4,
    },
    metricValue: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      letterSpacing: -0.5,
    },
    metricLabel: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginTop: 4,
      textAlign: 'center',
    },
    ejRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    ejNombre: {
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
    },
    ejPatron: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    ejStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ejVeces: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
    },
    ejCumplBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    ejCumplText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.3,
    },
    mesocicloHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mesocicloBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    mesocicloBadgeText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.8,
    },
    semanasCarga: {
      color: c.inkMuted,
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.3,
      marginTop: 8,
    },
  })
}
