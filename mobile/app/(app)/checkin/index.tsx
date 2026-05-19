import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Rect, Circle, Ellipse } from 'react-native-svg'
import { router } from 'expo-router'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'
import { apiGet, apiPost } from '../../../lib/api'

// ─── Types + Constants ────────────────────────────────────────────────────────

const ESTADO_FISICO_OPTS = [
  { id: 'fresco'   as const, label: 'Fresco, listo para todo',             color: '#32c896', bg: 'rgba(50,200,150,0.1)',  border: 'rgba(50,200,150,0.45)'  },
  { id: 'bien'     as const, label: 'Bien, con algo de cansancio normal',   color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.45)'  },
  { id: 'pesado'   as const, label: 'Pesado, dormí mal o vengo de mucho',   color: '#ffaa32', bg: 'rgba(255,170,50,0.1)', border: 'rgba(255,170,50,0.45)'  },
  { id: 'molestia' as const, label: 'Algo me molesta físicamente',          color: '#ff6b6b', bg: 'rgba(255,68,68,0.1)',  border: 'rgba(255,107,107,0.45)' },
]
type EstadoFisico = typeof ESTADO_FISICO_OPTS[number]['id']

const ESTADO_MENTAL_OPTS = [
  { id: 'enfocado'  as const, label: 'Enfocado y con energía',              color: '#32c896', bg: 'rgba(50,200,150,0.1)',  border: 'rgba(50,200,150,0.45)'  },
  { id: 'normal'    as const, label: 'Normal, día corriente',               color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.45)'  },
  { id: 'distraido' as const, label: 'Distraído o con cosas encima',        color: '#ffaa32', bg: 'rgba(255,170,50,0.1)', border: 'rgba(255,170,50,0.45)'  },
  { id: 'agotado'   as const, label: 'Agotado mentalmente',                 color: '#ff6b6b', bg: 'rgba(255,68,68,0.1)',  border: 'rgba(255,107,107,0.45)' },
]
type EstadoMental = typeof ESTADO_MENTAL_OPTS[number]['id']

const MENTAL_TO_ANIMO: Record<EstadoMental, number> = {
  enfocado: 5, normal: 3, distraido: 2, agotado: 1,
}

const FISICO_TO_NUM: Record<EstadoFisico, number> = {
  fresco: 4, bien: 3, pesado: 2, molestia: 1,
}

const TIEMPO_OPTS = [
  { id: 'menos20'  as const, label: 'Menos de 20 min', minutos: 15,  color: '#ffaa32', bg: 'rgba(255,170,50,0.1)',  border: 'rgba(255,170,50,0.45)'  },
  { id: 'treinta'  as const, label: '30–40 min',        minutos: 35,  color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.45)'  },
  { id: 'cuarenta' as const, label: '45–60 min',        minutos: 52,  color: '#32c896', bg: 'rgba(50,200,150,0.1)',  border: 'rgba(50,200,150,0.45)'  },
  { id: 'hora'     as const, label: 'Más de una hora',  minutos: 75,  color: '#6ce5ff', bg: 'rgba(108,229,255,0.1)', border: 'rgba(108,229,255,0.45)' },
]
type TiempoDispo = typeof TIEMPO_OPTS[number]['id']

const DISCIPLINA_OPTS = [
  { id: 'musculacion' as const, label: 'Musculación',        sub: 'Fuerza e hipertrofia',              foco: 'serio',    color: '#4f8cff', bg: 'rgba(79,140,255,0.1)',  border: 'rgba(79,140,255,0.45)'  },
  { id: 'running'     as const, label: 'Running',            sub: 'Trabajo aeróbico y resistencia',    foco: 'descargar', color: '#ff8c42', bg: 'rgba(255,140,66,0.1)', border: 'rgba(255,140,66,0.45)'  },
  { id: 'libre'       as const, label: 'Entrenamiento Libre', sub: 'Sin estructura fija, fluye contigo', foco: 'moverme', color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.45)'  },
]
type TipoDisciplina = typeof DISCIPLINA_OPTS[number]['id']

const ZONE_LABELS: Record<string, string> = {
  cabeza:      'Cabeza / Cuello',
  hombro_izq:  'Hombro izq.',
  hombro_der:  'Hombro der.',
  brazo_izq:   'Codo / Brazo izq.',
  brazo_der:   'Codo / Brazo der.',
  muneca_izq:  'Muñeca izq.',
  muneca_der:  'Muñeca der.',
  pecho:       'Pecho',
  abdomen:     'Abdomen',
  lumbar:      'Lumbar',
  cadera:      'Cadera',
  muslo_izq:   'Muslo izq.',
  muslo_der:   'Muslo der.',
  rodilla_izq: 'Rodilla izq.',
  rodilla_der: 'Rodilla der.',
  tobillo_izq: 'Tobillo izq.',
  tobillo_der: 'Tobillo der.',
}

const ZONE_DOTS: Record<string, [number, number]> = {
  cabeza: [90, 26], hombro_izq: [55, 65], hombro_der: [125, 65],
  brazo_izq: [48, 100], brazo_der: [132, 100],
  muneca_izq: [48, 172], muneca_der: [132, 172],
  pecho: [90, 84], abdomen: [90, 132], cadera: [90, 167],
  muslo_izq: [73, 210], muslo_der: [107, 210],
  rodilla_izq: [73, 243], rodilla_der: [107, 243],
  tobillo_izq: [73, 278], tobillo_der: [107, 278],
}

const SCREENS = ['d4', 'd1', 'd2', 'd3', 'd5', 'd6_procesando', 'd7_resumen'] as const
const N_INTERACTIVE = 5

interface Location { id: number; nombre: string; tipo: string; implementos?: string[] }

// ─── Body Map ─────────────────────────────────────────────────────────────────

function CheckinBodyMap({
  selectedZones,
  onZonePress,
  defaultFill,
  defaultStroke,
}: {
  selectedZones: string[]
  onZonePress: (id: string) => void
  defaultFill:   string
  defaultStroke: string
}) {
  const SEL  = 'rgba(255,107,107,0.26)'
  const SSEL = '#ff6b6b'
  const DEF  = defaultFill
  const SDEF = defaultStroke

  function f(id: string) { return selectedZones.includes(id) ? SEL  : DEF  }
  function s(id: string) { return selectedZones.includes(id) ? SSEL : SDEF }
  function p(id: string) { return () => onZonePress(id) }

  return (
    <Svg width={160} height={320} viewBox="0 0 180 360">
      <Circle cx={90} cy={26} r={20} fill={f('cabeza')} stroke={s('cabeza')} strokeWidth={1.2} />
      <Rect x={82} y={46} width={16} height={13} rx={4} fill={f('cabeza')} stroke={s('cabeza')} strokeWidth={1.2} />

      <Ellipse cx={57}  cy={65} rx={17} ry={10} fill={f('hombro_izq')} stroke={s('hombro_izq')} strokeWidth={1.2} />
      <Ellipse cx={123} cy={65} rx={17} ry={10} fill={f('hombro_der')} stroke={s('hombro_der')} strokeWidth={1.2} />

      <Rect x={63} y={57}  width={54} height={54} rx={10} fill={f('pecho')}   stroke={s('pecho')}   strokeWidth={1.2} />
      <Rect x={65} y={111} width={50} height={43} rx={8}  fill={f('abdomen')} stroke={s('abdomen')} strokeWidth={1.2} />
      <Rect x={58} y={153} width={64} height={29} rx={10} fill={f('cadera')}  stroke={s('cadera')}  strokeWidth={1.2} />

      <Rect   x={38}  y={60}  width={20} height={52} rx={10} fill={f('brazo_izq')}  stroke={s('brazo_izq')}  strokeWidth={1.2} />
      <Circle cx={48} cy={117} r={9}                          fill={f('brazo_izq')}  stroke={s('brazo_izq')}  strokeWidth={1.2} />
      <Rect   x={39}  y={125} width={18} height={36} rx={9}  fill={f('brazo_izq')}  stroke={s('brazo_izq')}  strokeWidth={1.2} />
      <Rect   x={37}  y={162} width={22} height={20} rx={7}  fill={f('muneca_izq')} stroke={s('muneca_izq')} strokeWidth={1.2} />

      <Rect   x={122} y={60}  width={20} height={52} rx={10} fill={f('brazo_der')}  stroke={s('brazo_der')}  strokeWidth={1.2} />
      <Circle cx={132} cy={117} r={9}                         fill={f('brazo_der')}  stroke={s('brazo_der')}  strokeWidth={1.2} />
      <Rect   x={123} y={125} width={18} height={36} rx={9}  fill={f('brazo_der')}  stroke={s('brazo_der')}  strokeWidth={1.2} />
      <Rect   x={121} y={162} width={22} height={20} rx={7}  fill={f('muneca_der')} stroke={s('muneca_der')} strokeWidth={1.2} />

      <Rect   x={60}  y={182} width={26} height={56} rx={9}  fill={f('muslo_izq')}   stroke={s('muslo_izq')}   strokeWidth={1.2} />
      <Circle cx={73} cy={243} r={11}                         fill={f('rodilla_izq')} stroke={s('rodilla_izq')} strokeWidth={1.2} />
      <Rect   x={62}  y={254} width={22} height={48} rx={9}  fill={f('tobillo_izq')} stroke={s('tobillo_izq')} strokeWidth={1.2} />
      <Rect   x={58}  y={300} width={28} height={18} rx={7}  fill={f('tobillo_izq')} stroke={s('tobillo_izq')} strokeWidth={1.2} />

      <Rect   x={94}  y={182} width={26} height={56} rx={9}  fill={f('muslo_der')}   stroke={s('muslo_der')}   strokeWidth={1.2} />
      <Circle cx={107} cy={243} r={11}                        fill={f('rodilla_der')} stroke={s('rodilla_der')} strokeWidth={1.2} />
      <Rect   x={96}  y={254} width={22} height={48} rx={9}  fill={f('tobillo_der')} stroke={s('tobillo_der')} strokeWidth={1.2} />
      <Rect   x={94}  y={300} width={28} height={18} rx={7}  fill={f('tobillo_der')} stroke={s('tobillo_der')} strokeWidth={1.2} />

      {Object.keys(ZONE_DOTS).filter(id => selectedZones.includes(id)).map(id => {
        const [cx, cy] = ZONE_DOTS[id]
        return <Circle key={id} cx={cx} cy={cy} r={5} fill={SSEL} opacity={0.9} />
      })}

      <Rect x={65}  y={57}  width={50} height={56} fill="transparent" onPress={p('pecho')} />
      <Rect x={65}  y={111} width={50} height={44} fill="transparent" onPress={p('abdomen')} />
      <Rect x={54}  y={153} width={72} height={30} fill="transparent" onPress={p('cadera')} />
      <Rect x={56}  y={182} width={32} height={64} fill="transparent" onPress={p('muslo_izq')} />
      <Rect x={88}  y={182} width={32} height={64} fill="transparent" onPress={p('muslo_der')} />
      <Rect x={56}  y={234} width={30} height={24} fill="transparent" onPress={p('rodilla_izq')} />
      <Rect x={90}  y={234} width={30} height={24} fill="transparent" onPress={p('rodilla_der')} />
      <Rect x={54}  y={252} width={34} height={72} fill="transparent" onPress={p('tobillo_izq')} />
      <Rect x={92}  y={252} width={34} height={72} fill="transparent" onPress={p('tobillo_der')} />
      <Rect x={32}  y={88}  width={32} height={80} fill="transparent" onPress={p('brazo_izq')} />
      <Rect x={116} y={88}  width={32} height={80} fill="transparent" onPress={p('brazo_der')} />
      <Rect x={32}  y={158} width={32} height={28} fill="transparent" onPress={p('muneca_izq')} />
      <Rect x={116} y={158} width={32} height={28} fill="transparent" onPress={p('muneca_der')} />
      <Rect x={32}  y={56}  width={36} height={34} fill="transparent" onPress={p('hombro_izq')} />
      <Rect x={112} y={56}  width={36} height={34} fill="transparent" onPress={p('hombro_der')} />
      <Rect x={64}  y={2}   width={52} height={66} fill="transparent" onPress={p('cabeza')} />
    </Svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(): string {
  const d = new Date()
  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CheckinScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  // ── Init ──────────────────────────────────────────────────────────────────
  const [initializing, setInitializing] = useState(true)
  const [locationId, setLocationId] = useState<number | null>(null)
  const [locations, setLocations] = useState<Location[]>([])

  const loadData = useCallback(async () => {
    try {
      const locsRes = await apiGet('/api/locations/').catch(() => null)
      const locs: Location[] = locsRes ?? []
      setLocations(locs)
    } catch {
      // non-fatal
    } finally {
      setInitializing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Form state ────────────────────────────────────────────────────────────
  const [estadoFisico, setEstadoFisico] = useState<EstadoFisico | null>(null)
  const [zonasDolorHoy, setZonasDolorHoy] = useState<string[]>([])
  const [estadoMental, setEstadoMental] = useState<EstadoMental | null>(null)
  const [tiempoDispo, setTiempoDispo] = useState<TiempoDispo | null>(null)
  const [disciplina, setDisciplina] = useState<TipoDisciplina | null>(null)

  // ── Nav state ─────────────────────────────────────────────────────────────
  const [screenIndex, setScreenIndex] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [procesandoTimer, setProcesandoTimer] = useState(false)

  const currentScreen = SCREENS[screenIndex]
  const isInteractive = screenIndex < N_INTERACTIVE
  const isLastInteractive = screenIndex === N_INTERACTIVE - 1
  const canContinue = isInteractive && !submitting && (
    screenIndex === 0 ? !!disciplina :
    screenIndex === 1 ? !!estadoFisico :
    screenIndex === 2 ? !!estadoMental :
    screenIndex === 3 ? !!tiempoDispo :
    true  // D5 ubicación is optional
  )

  function toggleZona(id: string) {
    setZonasDolorHoy(prev => prev.includes(id) ? prev.filter(z => z !== id) : [...prev, id])
  }

  function validate(): string | null {
    if (screenIndex === 0 && !disciplina)   return 'Indica qué quieres entrenar hoy.'
    if (screenIndex === 1 && !estadoFisico) return 'Indica cómo está tu cuerpo hoy.'
    if (screenIndex === 2 && !estadoMental) return 'Indica cómo está tu cabeza hoy.'
    if (screenIndex === 3 && !tiempoDispo)  return 'Indica cuánto tiempo tienes hoy.'
    return null
  }

  function goNext() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setScreenIndex(i => i + 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const zonaLabels = zonasDolorHoy.map(z => ZONE_LABELS[z] ?? z)
      const tiempoOpt = TIEMPO_OPTS.find(t => t.id === tiempoDispo)
      const discOpt = DISCIPLINA_OPTS.find(d => d.id === disciplina)
      const focos: string[] = []
      if (discOpt) { focos.push(discOpt.foco); focos.push(discOpt.id) }
      await apiPost('/api/checkins/', {
        foco_entrenamiento: focos,
        estado_animo: estadoMental ? MENTAL_TO_ANIMO[estadoMental] : 3,
        estado_fisico: estadoFisico ? FISICO_TO_NUM[estadoFisico] : null,
        calidad_sueno: 7,
        hrv: null,
        location: locationId,
        duracion_disponible: tiempoOpt?.minutos ?? 45,
        dolor_hoy: zonaLabels.length > 0 ? zonaLabels.join(', ') : null,
        notas: discOpt ? `Disciplina: ${discOpt.label}` : null,
      })
      setCheckinSaved(true)
    } catch (e: any) {
      setScreenIndex(3)
      setError(e.message ?? 'No se pudo guardar. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── D5 processing orchestration ───────────────────────────────────────────

  useEffect(() => {
    if (currentScreen !== 'd6_procesando') return
    setCheckinSaved(false)
    setProcesandoTimer(false)
    handleSubmit()
    const t = setTimeout(() => setProcesandoTimer(true), 2500)
    return () => clearTimeout(t)
  }, [currentScreen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentScreen !== 'd6_procesando') return
    if (checkinSaved && procesandoTimer) setScreenIndex(i => i + 1)
  }, [checkinSaved, procesandoTimer, currentScreen])

  // ── Summary builders ─────────────────────────────────────────────────────

  function buildSummaryText(): string {
    const parts: string[] = []
    const tiempoOpt = TIEMPO_OPTS.find(t => t.id === tiempoDispo)
    const discOpt = DISCIPLINA_OPTS.find(d => d.id === disciplina)
    if (discOpt) parts.push(discOpt.label)
    if (tiempoOpt) parts.push(`${tiempoOpt.minutos} min`)
    const mentalLabels: Record<EstadoMental, string> = {
      enfocado: 'foco alto', normal: 'estado normal',
      distraido: 'estrés moderado', agotado: 'agotamiento mental',
    }
    if (estadoMental) parts.push(mentalLabels[estadoMental])
    if (zonasDolorHoy.length > 0) {
      const labels = zonasDolorHoy.slice(0, 2).map(z => (ZONE_LABELS[z] ?? z).split('/')[0].trim().toLowerCase())
      const extra = zonasDolorHoy.length > 2 ? ` (+${zonasDolorHoy.length - 2})` : ''
      parts.push(`molestia en ${labels.join(' y ')}${extra}`)
    }
    const loc = locations.find(l => l.id === locationId)
    if (loc) parts.push(loc.nombre)
    return parts.join(' · ')
  }

  function buildPronosticoText(): string {
    if (!disciplina) return ''
    const discOpt = DISCIPLINA_OPTS.find(d => d.id === disciplina)
    let text = discOpt?.sub ?? disciplina
    if (zonasDolorHoy.length > 0) {
      const labels = zonasDolorHoy.slice(0, 2).map(z =>
        (ZONE_LABELS[z] ?? z).split('/')[0].trim().toLowerCase()
      )
      text += ` — sin carga directa en ${labels.join(' ni ')}`
    }
    if (tiempoDispo === 'menos20') text = 'sesión express: ' + text
    else if (tiempoDispo === 'hora') text += ', con tiempo para trabajar cada detalle'
    return text + '.'
  }

  // ── Dimension renders ─────────────────────────────────────────────────────

  function renderD1() {
    return (
      <>
        <Text style={styles.eyebrow}>DIMENSIÓN 1 — ESTADO FÍSICO</Text>
        <Text style={styles.question}>¿Cómo está{'\n'}tu cuerpo hoy?</Text>
        <Text style={styles.questionSub}>La pregunta más honesta primero</Text>

        <View style={styles.optionsWrap}>
          {ESTADO_FISICO_OPTS.map(opt => {
            const on = estadoFisico === opt.id
            return (
              <TouchableOpacity key={opt.id}
                style={[styles.estadoCard, on && { backgroundColor: opt.bg, borderColor: opt.border, borderWidth: 1.5 }]}
                onPress={() => { setEstadoFisico(opt.id); setError('') }}
                activeOpacity={0.82}>
                <View style={[styles.estadoBar, { backgroundColor: on ? opt.color : 'transparent' }]} />
                <Text style={[styles.estadoLabel, on && { color: opt.color }]}>{opt.label}</Text>
                <View style={[styles.estadoRadio, on && { borderColor: opt.color }]}>
                  {on && <View style={[styles.estadoRadioDot, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {estadoFisico === 'molestia' && (
          <View style={styles.zonaSection}>
            <View style={styles.zonaDivider} />
            <Text style={styles.zonaEyebrow}>¿EN QUÉ ZONA?</Text>
            <Text style={styles.zonaSub}>
              Toca las zonas que te molestan. El sistema las tomará en cuenta al diseñar tu rutina.
            </Text>
            <View style={styles.bodyMapWrap}>
              <CheckinBodyMap
                selectedZones={zonasDolorHoy}
                onZonePress={toggleZona}
                defaultFill={colors.cardBg}
                defaultStroke={colors.borderBright}
              />
              <TouchableOpacity
                style={[styles.lumbarChip, zonasDolorHoy.includes('lumbar') && styles.lumbarChipOn]}
                onPress={() => toggleZona('lumbar')} activeOpacity={0.8}>
                <Text style={[styles.lumbarChipText, zonasDolorHoy.includes('lumbar') && styles.lumbarChipTextOn]}>
                  + Lumbar / Espalda
                </Text>
              </TouchableOpacity>
            </View>
            {zonasDolorHoy.length > 0 ? (
              <View style={styles.selectedZonas}>
                {zonasDolorHoy.map(z => (
                  <TouchableOpacity key={z} style={styles.zonaChip} onPress={() => toggleZona(z)} activeOpacity={0.8}>
                    <Text style={styles.zonaChipText}>{ZONE_LABELS[z] ?? z}</Text>
                    <Text style={styles.zonaChipX}> ×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.zonaHint}>Toca el mapa para indicar las zonas afectadas</Text>
            )}
          </View>
        )}
      </>
    )
  }

  function renderD2() {
    return (
      <>
        <Text style={styles.eyebrow}>DIMENSIÓN 2 — ESTADO MENTAL</Text>
        <Text style={styles.question}>¿Cómo está{'\n'}tu cabeza hoy?</Text>
        <Text style={styles.questionSub}>La variable más subestimada en fitness</Text>

        <View style={styles.optionsWrap}>
          {ESTADO_MENTAL_OPTS.map(opt => {
            const on = estadoMental === opt.id
            return (
              <TouchableOpacity key={opt.id}
                style={[styles.estadoCard, on && { backgroundColor: opt.bg, borderColor: opt.border, borderWidth: 1.5 }]}
                onPress={() => { setEstadoMental(opt.id); setError('') }}
                activeOpacity={0.82}>
                <View style={[styles.estadoBar, { backgroundColor: on ? opt.color : 'transparent' }]} />
                <Text style={[styles.estadoLabel, on && { color: opt.color }]}>{opt.label}</Text>
                <View style={[styles.estadoRadio, on && { borderColor: opt.color }]}>
                  {on && <View style={[styles.estadoRadioDot, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </>
    )
  }

  function renderD3() {
    return (
      <>
        <Text style={styles.eyebrow}>DIMENSIÓN 3 — TIEMPO DISPONIBLE</Text>
        <Text style={styles.question}>¿Cuánto tiempo{'\n'}tienes hoy?</Text>
        <Text style={styles.questionSub}>La variable más práctica</Text>

        <View style={styles.optionsWrap}>
          {TIEMPO_OPTS.map(opt => {
            const on = tiempoDispo === opt.id
            return (
              <TouchableOpacity key={opt.id}
                style={[styles.estadoCard, on && { backgroundColor: opt.bg, borderColor: opt.border, borderWidth: 1.5 }]}
                onPress={() => { setTiempoDispo(opt.id); setError('') }}
                activeOpacity={0.82}>
                <View style={[styles.estadoBar, { backgroundColor: on ? opt.color : 'transparent' }]} />
                <Text style={[styles.estadoLabel, on && { color: opt.color }]}>{opt.label}</Text>
                <Text style={[styles.tiempoMinutos, on && { color: opt.color }]}>
                  {opt.minutos} min
                </Text>
                <View style={[styles.estadoRadio, on && { borderColor: opt.color }]}>
                  {on && <View style={[styles.estadoRadioDot, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.tiempoNote}>
          Sin esto el sistema no puede calibrar volumen ni densidad de carga.
        </Text>
      </>
    )
  }

  function renderD4() {
    return (
      <>
        <Text style={styles.eyebrow}>DIMENSIÓN 4 — DISCIPLINA</Text>
        <Text style={styles.question}>¿Qué quieres{'\n'}entrenar hoy?</Text>
        <Text style={styles.questionSub}>Elige el tipo de entrenamiento</Text>

        <View style={styles.optionsWrap}>
          {DISCIPLINA_OPTS.map(opt => {
            const on = disciplina === opt.id
            return (
              <TouchableOpacity key={opt.id}
                style={[styles.estadoCard, on && { backgroundColor: opt.bg, borderColor: opt.border, borderWidth: 1.5 }]}
                onPress={() => { setDisciplina(opt.id); setError('') }}
                activeOpacity={0.82}>
                <View style={[styles.estadoBar, { backgroundColor: on ? opt.color : 'transparent' }]} />
                <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 18 }}>
                  <Text style={[styles.estadoLabel, { paddingVertical: 0, paddingHorizontal: 0 }, on && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.intencionNota, on && { color: opt.color, opacity: 0.75 }]}>
                    {opt.sub}
                  </Text>
                </View>
                <View style={[styles.estadoRadio, on && { borderColor: opt.color }]}>
                  {on && <View style={[styles.estadoRadioDot, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </>
    )
  }

  const TIPO_ICON: Record<string, string> = {
    gimnasio: '🏋️', casa: '🏠', exterior: '🌳',
  }

  function renderD5() {
    return (
      <>
        <Text style={styles.eyebrow}>DIMENSIÓN 5 — UBICACIÓN</Text>
        <Text style={styles.question}>¿Dónde vas a{'\n'}entrenar hoy?</Text>
        <Text style={styles.questionSub}>Filtra el equipamiento disponible</Text>

        {locations.length === 0 ? (
          <View style={styles.locEmptyWrap}>
            <Text style={styles.locEmptyText}>
              No tienes ubicaciones guardadas.{'\n'}Puedes añadirlas en Perfil → Datos de entrenamiento.
            </Text>
            <Text style={[styles.locEmptyText, { color: colors.inkFaint, marginTop: 8, fontSize: 12 }]}>
              La IA usará tu equipamiento predeterminado.
            </Text>
          </View>
        ) : (
          <View style={styles.optionsWrap}>
            {locations.map(loc => {
              const on = locationId === loc.id
              const icon = TIPO_ICON[loc.tipo?.toLowerCase()] ?? '📍'
              return (
                <TouchableOpacity key={loc.id}
                  style={[styles.estadoCard, on && { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: 'rgba(79,140,255,0.45)', borderWidth: 1.5 }]}
                  onPress={() => { setLocationId(on ? null : loc.id); setError('') }}
                  activeOpacity={0.82}>
                  <View style={[styles.estadoBar, { backgroundColor: on ? colors.accent : 'transparent' }]} />
                  <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 22 }}>{icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.estadoLabel, { paddingVertical: 0, paddingHorizontal: 0 }, on && { color: colors.accent }]}>
                        {loc.nombre}
                      </Text>
                      {loc.implementos && loc.implementos.length > 0 && (
                        <Text style={[styles.intencionNota, on && { color: colors.accent, opacity: 0.75 }]}>
                          {loc.implementos.slice(0, 3).join(' · ')}{loc.implementos.length > 3 ? ` +${loc.implementos.length - 3}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.estadoRadio, on && { borderColor: colors.accent }]}>
                    {on && <View style={[styles.estadoRadioDot, { backgroundColor: colors.accent }]} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <Text style={styles.tiempoNote}>
          La selección de ubicación es opcional — puedes continuar sin elegir.
        </Text>
      </>
    )
  }

  function renderD6() {
    return (
      <View style={styles.procesandoWrap}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.procesandoTitle}>Construyendo tu{'\n'}entrenamiento de hoy...</Text>
        <Text style={styles.procesandoSub}>Analizando tus 5 dimensiones</Text>
      </View>
    )
  }

  function renderD7() {
    const discOpt = DISCIPLINA_OPTS.find(d => d.id === disciplina)
    const tiempoOpt = TIEMPO_OPTS.find(t => t.id === tiempoDispo)
    const loc = locations.find(l => l.id === locationId)
    return (
      <View style={[styles.resumenWrap, { paddingTop: insets.top + 24 }]}>
        <View style={styles.resumenCheckCircle}>
          <Text style={styles.resumenCheckMark}>✓</Text>
        </View>
        <Text style={styles.resumenEyebrow}>CHECKIN LISTO</Text>
        <Text style={styles.resumenTitle}>Tu análisis de hoy</Text>

        {/* Pills */}
        <View style={styles.resumenPills}>
          {discOpt && (
            <View style={[styles.resumenPill, { borderColor: discOpt.color }]}>
              <Text style={[styles.resumenPillText, { color: discOpt.color }]}>
                {discOpt.label}
              </Text>
            </View>
          )}
          {tiempoOpt && (
            <View style={[styles.resumenPill, { borderColor: tiempoOpt.color }]}>
              <Text style={[styles.resumenPillText, { color: tiempoOpt.color }]}>
                {tiempoOpt.minutos} min
              </Text>
            </View>
          )}
          {loc && (
            <View style={[styles.resumenPill, { borderColor: colors.borderBright }]}>
              <Text style={[styles.resumenPillText, { color: colors.inkSecondary }]}>
                {loc.nombre}
              </Text>
            </View>
          )}
        </View>

        {/* Card */}
        <View style={styles.resumenCard}>
          <Text style={styles.resumenDataText}>{buildSummaryText()}</Text>
          <View style={styles.resumenDivider} />
          <Text style={styles.resumenSesionEyebrow}>TU SESIÓN DE HOY SERÁ</Text>
          <Text style={styles.resumenSesionText}>{buildPronosticoText()}</Text>
        </View>

        <Text style={styles.resumenNote}>
          Este es el punto de partida. La IA ajusta cada variable en tiempo real.
        </Text>

        {/* CTA */}
        <View style={[styles.resumenFooter, { paddingBottom: Math.max(insets.bottom, 28) }]}>
          <TouchableOpacity
            style={styles.nextWrap}
            onPress={() => router.replace(`/(app)/generate?t=${Date.now()}`)}
            activeOpacity={0.88}>
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>Ver mi entrenamiento</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (initializing) {
    return (
      <View style={[styles.root, styles.centered]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // D6 and D7 are full-screen overlays — no chrome
  if (currentScreen === 'd6_procesando') {
    return (
      <View style={[styles.root, styles.centered]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        {renderD6()}
      </View>
    )
  }

  if (currentScreen === 'd7_resumen') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}>
          {renderD7()}
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* Progress bar + header (D1–D4 only) */}
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${Math.round((screenIndex + 1) / N_INTERACTIVE * 100)}%` as any,
          }]} />
        </View>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => screenIndex === 0 ? router.back() : setScreenIndex(i => i - 1)}
            style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerDate}>{formatDate()}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        key={screenIndex}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        { screenIndex === 0 ? renderD4()
        : screenIndex === 1 ? renderD1()
        : screenIndex === 2 ? renderD2()
        : screenIndex === 3 ? renderD3()
        : renderD5() }
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 28) }]}>
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.nextWrap, !canContinue && styles.nextWrapDisabled]}
          onPress={goNext}
          disabled={!canContinue}
          activeOpacity={0.88}>
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>
              {isLastInteractive ? 'Construir mi entrenamiento' : 'Continuar'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    centered: { alignItems: 'center', justifyContent: 'center' },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },

    progressTrack: { height: 3, backgroundColor: c.borderDefault },
    progressFill: { height: 3, backgroundColor: c.accent },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 24, paddingTop: 16, paddingBottom: 6,
    },
    backBtn: { padding: 4 },
    backArrow: { fontSize: 22, color: c.inkSecondary },
    headerDate: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.inkMuted, letterSpacing: 0.3,
    },

    scrollContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 },

    eyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.accent, letterSpacing: 2, marginBottom: 18,
    },
    question: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 32,
      color: c.inkPrimary, letterSpacing: -0.9, lineHeight: 40, marginBottom: 8,
    },
    questionSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 20, marginBottom: 32, fontStyle: 'italic',
    },

    optionsWrap: { gap: 10 },
    estadoCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, overflow: 'hidden', minHeight: 72,
    },
    estadoBar: { width: 4, alignSelf: 'stretch' },
    estadoLabel: {
      flex: 1, paddingVertical: 22, paddingHorizontal: 18,
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16,
      color: c.inkPrimary, lineHeight: 22,
    },
    estadoRadio: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center',
      marginRight: 20, flexShrink: 0,
    },
    estadoRadioDot: { width: 10, height: 10, borderRadius: 5 },

    // Zone sub-question
    zonaSection: { marginTop: 28 },
    zonaDivider: { height: 1, backgroundColor: c.borderDefault, marginBottom: 24 },
    zonaEyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: '#ff6b6b', letterSpacing: 2, marginBottom: 10,
    },
    zonaSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 21, marginBottom: 24,
    },
    bodyMapWrap: { alignItems: 'center', marginBottom: 8 },
    lumbarChip: {
      marginTop: 12, paddingHorizontal: 18, paddingVertical: 9,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 20,
    },
    lumbarChipOn: { backgroundColor: 'rgba(255,68,68,0.1)', borderColor: '#ff6b6b' },
    lumbarChipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkSecondary },
    lumbarChipTextOn: { color: '#ff6b6b' },
    selectedZonas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    zonaChip: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1,
      borderColor: 'rgba(255,107,107,0.4)', borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    zonaChipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: '#ff6b6b' },
    zonaChipX: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: '#ff6b6b', lineHeight: 18 },
    zonaHint: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkFaint, textAlign: 'center', marginTop: 16, fontStyle: 'italic',
    },

    tiempoMinutos: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.inkMuted, letterSpacing: 0.5, marginRight: 12,
    },
    tiempoNote: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkFaint, lineHeight: 19, marginTop: 24,
      fontStyle: 'italic', textAlign: 'center',
    },

    // D4 — Disciplina
    intencionNota: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
      color: c.inkMuted, lineHeight: 17, marginTop: 3,
    },

    // D5 — Ubicación
    locEmptyWrap: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 20, marginTop: 8,
    },
    locEmptyText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 22, textAlign: 'center',
    },

    // D6 — Processing
    procesandoWrap: { alignItems: 'center', paddingHorizontal: 40 },
    procesandoTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 24,
      color: c.inkPrimary, letterSpacing: -0.6, lineHeight: 32,
      textAlign: 'center', marginTop: 32, marginBottom: 10,
    },
    procesandoSub: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.inkMuted, letterSpacing: 1.5, textAlign: 'center',
    },

    // D6 — Resumen
    resumenWrap: {
      flex: 1, paddingHorizontal: 24, alignItems: 'center',
    },
    resumenCheckCircle: {
      width: 64, height: 64, borderRadius: 32,
      borderWidth: 2, borderColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
    },
    resumenCheckMark: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 28,
      color: c.accent, lineHeight: 32,
    },
    resumenEyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.accent, letterSpacing: 2.5, marginBottom: 6,
    },
    resumenTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 26,
      color: c.inkPrimary, letterSpacing: -0.6, marginBottom: 20,
    },
    resumenPills: {
      flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center',
    },
    resumenPill: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1,
      backgroundColor: c.glassBg,
    },
    resumenPillText: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13, letterSpacing: 0.1,
    },
    resumenCard: {
      width: '100%',
      backgroundColor: c.cardBg, borderWidth: 1,
      borderColor: c.borderBright, borderRadius: 20, padding: 20,
      marginBottom: 16,
    },
    resumenDataText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 20, marginBottom: 16,
      fontStyle: 'italic',
    },
    resumenDivider: { height: 1, backgroundColor: c.borderDefault, marginBottom: 14 },
    resumenSesionEyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.accent, letterSpacing: 2, marginBottom: 8,
    },
    resumenSesionText: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16,
      color: c.inkPrimary, lineHeight: 24, letterSpacing: -0.2,
    },
    resumenNote: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
      color: c.inkFaint, textAlign: 'center', lineHeight: 18,
      fontStyle: 'italic', paddingHorizontal: 16, marginBottom: 24,
    },
    resumenFooter: { width: '100%', marginTop: 'auto' as any, paddingTop: 8 },

    // Footer
    footer: { paddingHorizontal: 24, paddingTop: 12 },
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.25)', borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
    },
    errorText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.red },
    nextWrap: { borderRadius: 14, overflow: 'hidden' },
    nextWrapDisabled: { opacity: 0.3 },
    nextBtn: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
    nextBtnText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 15,
      color: '#ffffff', letterSpacing: 0.3,
    },
  })
}
