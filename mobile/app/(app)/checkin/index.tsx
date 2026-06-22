import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, TextInput, Animated, PanResponder, Modal,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Rect, Circle, Ellipse } from 'react-native-svg'
import { router, useFocusEffect } from 'expo-router'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'
import { useTranslation } from '../../../lib/i18n'
import { getRestPhrase } from '../../../lib/restPhrases'
import { apiGet, apiPost } from '../../../lib/api'
import { fetchMiCoach, fetchAssignedToday } from '../../../lib/coachApi'
import { runModeForEntorno } from '../../../lib/runMode'
import { getUser } from '../../../lib/storage'
import WorkoutShareCard from '../../../components/WorkoutShareCard'

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

// Calidad de sueño REAL preguntada en el check-in (pantalla d_sueno). `horas` es
// el punto medio del rango y alimenta directamente calidad_sueno — el generador la
// usa como horas reales para ajustar el RPE. Antes se fabricaba desde estadoFisico.
const SUENO_OPTS = [
  { id: 'poco'      as const, label: 'Menos de 6h', sub: 'Corto o fragmentado',     horas: 5.0, color: '#ff6b6b', bg: 'rgba(255,68,68,0.1)',  border: 'rgba(255,107,107,0.45)' },
  { id: 'irregular' as const, label: '6 – 7h',       sub: 'Algo justo o variable',   horas: 6.5, color: '#ffaa32', bg: 'rgba(255,170,50,0.1)', border: 'rgba(255,170,50,0.45)'  },
  { id: 'bien'      as const, label: '7 – 8h',       sub: 'La cantidad recomendada', horas: 7.5, color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.45)'  },
  { id: 'optimo'    as const, label: 'Más de 8h',    sub: 'Bien descansado',         horas: 8.5, color: '#32c896', bg: 'rgba(50,200,150,0.1)',  border: 'rgba(50,200,150,0.45)'  },
]
type CalidadSueno = typeof SUENO_OPTS[number]['id']

const TIEMPO_OPTS = [
  { id: 'menos20'  as const, label: 'Menos de 20 min', minutos: 15,  color: '#ffaa32', bg: 'rgba(255,170,50,0.1)',  border: 'rgba(255,170,50,0.45)'  },
  { id: 'treinta'  as const, label: '30–40 min',        minutos: 35,  color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.45)'  },
  { id: 'cuarenta' as const, label: '45–60 min',        minutos: 52,  color: '#32c896', bg: 'rgba(50,200,150,0.1)',  border: 'rgba(50,200,150,0.45)'  },
  { id: 'hora'     as const, label: 'Más de una hora',  minutos: 75,  color: '#6ce5ff', bg: 'rgba(108,229,255,0.1)', border: 'rgba(108,229,255,0.45)' },
]
type TiempoDispo = typeof TIEMPO_OPTS[number]['id']

// Disciplinas del check-in, agrupadas por categoría. `cat` es solo la cabecera
// visible (CARDIOVASCULAR / FUERZA / MOVILIDAD); `path` define el comportamiento
// del flujo —idéntico al de antes—: 'running' → paso GPS, 'musculacion' → grupo
// muscular, 'libre' → flujo genérico. `foco` es el token que consume el backend
// para categorizar la sesión (serio=Fuerza, descargar=Cardio, moverme=Movilidad),
// por lo que la estructura de `foco_entrenamiento` NO cambia.
const CAT_CARDIO = { cat: 'CARDIOVASCULAR' as const, path: 'running'     as const, foco: 'descargar', color: '#ff8c42', bg: 'rgba(255,140,66,0.1)', border: 'rgba(255,140,66,0.45)' }
const CAT_FUERZA = { cat: 'FUERZA'         as const, path: 'musculacion' as const, foco: 'serio',     color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.45)' }
const CAT_MOVIL  = { cat: 'MOVILIDAD'      as const, path: 'libre'       as const, foco: 'moverme',   color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.45)' }

// Día de descanso: 4ª categoría SIN disciplina ni ubicación. No abre subdisciplinas
// (d4_sub) ni genera entrenamiento; recorre el estado de hoy, guarda el check-in y
// termina en un resumen con tarjeta para compartir. Acento violeta calmo.
const REST_COLOR = '#a78bfa'
const REST_COLOR_DARK = '#7c5cf0'
// La frase del día de descanso viene de lib/restPhrases (15 frases, rota por día).

const DISCIPLINA_OPTS = [
  { id: 'running'      as const, label: 'Running',              sub: 'Trabajo aeróbico en ruta',        ...CAT_CARDIO },
  { id: 'ciclismo'     as const, label: 'Ciclismo',             sub: 'Resistencia sobre la bici',       ...CAT_CARDIO },
  { id: 'trail'        as const, label: 'Trail',                sub: 'Carrera en montaña o sendero',    ...CAT_CARDIO },
  { id: 'natacion'     as const, label: 'Natación',             sub: 'Trabajo aeróbico en el agua',     ...CAT_CARDIO },
  { id: 'gym'          as const, label: 'Gym',                  sub: 'Fuerza e hipertrofia con cargas', ...CAT_FUERZA },
  { id: 'casa'         as const, label: 'En casa',              sub: 'Fuerza con poco material',        ...CAT_FUERZA },
  { id: 'calistenia'   as const, label: 'Calistenia',          sub: 'Fuerza con tu propio peso',       ...CAT_FUERZA },
  { id: 'stretching'   as const, label: 'Stretching',          sub: 'Estiramientos y flexibilidad',    ...CAT_MOVIL  },
  { id: 'yoga'         as const, label: 'Yoga',                 sub: 'Movilidad y respiración',         ...CAT_MOVIL  },
  { id: 'recuperacion' as const, label: 'Recuperación activa', sub: 'Movimiento suave para recuperar', ...CAT_MOVIL  },
]
type TipoDisciplina = typeof DISCIPLINA_OPTS[number]['id']
type DisciplinaCat = typeof DISCIPLINA_OPTS[number]['cat']

// Tarjetas de la primera pantalla (d4): SOLO las 3 categorías. Al tocar una, la
// card parpadea 2 veces y se avanza a d4_sub, que muestra sus subdisciplinas.
const CATEGORIA_OPTS = [
  { cat: 'CARDIOVASCULAR' as const, label: 'Cardiovascular', sub: 'Resistencia y trabajo aeróbico',    color: '#ff8c42', bg: 'rgba(255,140,66,0.1)', border: 'rgba(255,140,66,0.45)' },
  { cat: 'FUERZA'         as const, label: 'Fuerza',         sub: 'Fuerza, hipertrofia y potencia',    color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.45)' },
  { cat: 'MOVILIDAD'      as const, label: 'Movilidad',      sub: 'Flexibilidad, yoga y recuperación', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.45)' },
  { cat: 'DESCANSO'       as const, label: 'Día de descanso', sub: 'Recuperación, sueño y bienestar',  color: REST_COLOR, bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.45)' },
]
// Categoría incluye DESCANSO (que NO existe como disciplina en DISCIPLINA_OPTS).
type Categoria = DisciplinaCat | 'DESCANSO'

// Para disciplinas al aire libre / agua, "¿dónde entrenas hoy?" se reduce a 2
// entornos simples (sin lugares guardados ni implementos). La elección se guarda
// en `notas` y `location` queda en null: la estructura de datos no cambia.
const ENTORNO_OPTS: Record<string, { id: string; label: string; icon: string }[]> = {
  running:  [{ id: 'exteriores', label: 'Exteriores', icon: '🌳' }, { id: 'interiores', label: 'Interiores', icon: '🏠' }],
  ciclismo: [{ id: 'exteriores', label: 'Exteriores', icon: '🌳' }, { id: 'interiores', label: 'Interiores', icon: '🏠' }],
  trail:    [{ id: 'exteriores', label: 'Exteriores', icon: '🌳' }, { id: 'interiores', label: 'Interiores', icon: '🏠' }],
  natacion: [{ id: 'aguas_abiertas', label: 'Aguas abiertas', icon: '🌊' }, { id: 'piscina', label: 'Piscina', icon: '🏊' }],
}

const GRUPO_MUSCULAR_OPTS = [
  { id: 'empujes'      as const, label: 'Empujes',   sub: 'Pecho, Hombro y Tríceps',  color: '#4f8cff', bg: 'rgba(79,140,255,0.1)',  border: 'rgba(79,140,255,0.45)'  },
  { id: 'tracciones'   as const, label: 'Tracciones', sub: 'Espalda y Bíceps',         color: '#32c896', bg: 'rgba(50,200,150,0.1)',  border: 'rgba(50,200,150,0.45)'  },
  { id: 'piernas_quad' as const, label: 'Piernas',   sub: 'Foco en Cuádriceps',        color: '#ff8c42', bg: 'rgba(255,140,66,0.1)', border: 'rgba(255,140,66,0.45)'  },
  { id: 'piernas_glut' as const, label: 'Piernas',   sub: 'Foco en Glúteos y Femoral', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.45)' },
]
type GrupoMuscular = typeof GRUPO_MUSCULAR_OPTS[number]['id']

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

// Flujo: d4 (categoría) → d4_sub (disciplina) → [d4b_running solo cardio] →
// d_estado (cuerpo+cabeza+sueño en una pantalla con sliders) → d3 → d5 → …
const SCREENS = ['d4', 'd4_sub', 'd4b_running', 'd_estado', 'd3', 'd5', 'd5b_grupo', 'd6_procesando', 'd7_resumen'] as const
type ScreenId = typeof SCREENS[number]

// Ordered interactive steps per disciplina path (drives progress bar)
const SEQ_RUNNING:     ScreenId[] = ['d4', 'd4_sub', 'd4b_running', 'd_estado', 'd5']
const SEQ_MUSCULACION: ScreenId[] = ['d4', 'd4_sub', 'd_estado', 'd3', 'd5', 'd5b_grupo']
const SEQ_OTHER:       ScreenId[] = ['d4', 'd4_sub', 'd_estado', 'd3', 'd5']
// Descanso: solo categoría → estado de hoy (sin disciplina, tiempo, ubicación ni grupo).
const SEQ_DESCANSO:    ScreenId[] = ['d4', 'd_estado']

interface Location { id: number; nombre: string; tipo: string; implementos?: string[] }

const IMPLEMENTOS_LIST = ['Barras', 'Mancuernas', 'Máquinas', 'TRX', 'Kettlebells', 'Bandas elásticas', 'Cajón pliométrico', 'Anillas']
const TIPOS_LUGAR = ['Gimnasio', 'Casa', 'Exterior']

// ─── Body Map ─────────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Punto de zona seleccionada — entra con un "pop" elástico (spring sobre el radio)
// para confirmar visualmente el toque. useNativeDriver: false porque animamos una
// prop de SVG, no un transform.
function AnimatedZoneDot({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const r = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(r, { toValue: 5, useNativeDriver: false, tension: 140, friction: 5 }).start()
  }, [r])
  return <AnimatedCircle cx={cx} cy={cy} r={r} fill={color} opacity={0.9} />
}

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
  const SEL  = 'rgba(255,107,107,0.45)'   // más opaco → la selección se nota en dark mode
  const SSEL = '#ff6b6b'
  const DEF  = defaultFill
  const SDEF = defaultStroke

  function f(id: string) { return selectedZones.includes(id) ? SEL  : DEF  }
  function s(id: string) { return selectedZones.includes(id) ? SSEL : SDEF }
  // Haptic ligero al tocar una zona → feedback táctil que confirma el registro.
  function p(id: string) { return () => { Haptics.selectionAsync(); onZonePress(id) } }

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
        return <AnimatedZoneDot key={id} cx={cx} cy={cy} color={SSEL} />
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

function formatDate(lang: string): string {
  const d = new Date()
  const DAYS_ES   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const DAYS_EN   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  if (lang === 'en') {
    return `${DAYS_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`
  }
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`
}

// Footer de la tarjeta para compartir: fecha de hoy "21 JUN 2026" y @handle.
const MESES_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
function formatShareDate(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')} ${MESES_SHORT[d.getMonth()]} ${d.getFullYear()}`
}
function handleFromUser(u: { nombre?: string; email?: string } | null): string | undefined {
  if (!u) return undefined
  const base = (u.nombre || u.email?.split('@')[0] || '').trim().toLowerCase().replace(/\s+/g, '')
  return base ? `@${base}` : undefined
}

// ─── Point slider ─────────────────────────────────────────────────────────────
// Slider horizontal de N puntos discretos (mismo patrón que el DurationSlider del
// onboarding, sin libs nativas → 100% Expo Go). Al arrastrar el thumb sobre cada
// punto cambia `value` y se muestra el mensaje (label/sub) de esa opción. Conserva
// exactamente los mismos ids que los cards originales, así el mapeo a la BD no cambia.
type SliderOpt = { id: string; label: string; sub?: string; color: string }

function PointSlider({
  opts, value, onChange, styles, label = '',
}: {
  opts: readonly SliderOpt[]
  value: string | null
  onChange: (id: string) => void
  styles: ReturnType<typeof makeStyles>
  label?: string
}) {
  const [trackW, setTrackW] = useState(0)
  const steps = opts.length
  const idx = Math.max(0, opts.findIndex(o => o.id === value))
  const current = opts[idx] ?? opts[0]
  const frac = steps > 1 ? idx / (steps - 1) : 0
  const accent = current.color

  const trackWRef = useRef(trackW); trackWRef.current = trackW
  const valueRef = useRef(value); valueRef.current = value

  // Posición fraccionaria animada (0..1). En vez de saltar al punto destino, el
  // thumb y el relleno se deslizan suavemente hacia él. `bounciness: 0` evita que
  // se pase del tick (overshoot) en los extremos. useNativeDriver: false porque
  // animamos width/left (props de layout, no soportadas por el driver nativo).
  const posAnim = useRef(new Animated.Value(frac)).current
  useEffect(() => {
    Animated.spring(posAnim, {
      toValue: frac,
      bounciness: 0,
      speed: 14,
      useNativeDriver: false,
    }).start()
  }, [frac, posAnim])

  const commitFromX = useCallback((x: number) => {
    const w = trackWRef.current
    if (w <= 0 || steps <= 1) return
    const f = Math.max(0, Math.min(1, x / w))
    const newIdx = Math.round(f * (steps - 1))
    const newId = opts[newIdx].id
    if (newId !== valueRef.current) {
      onChange(newId)
      Haptics.selectionAsync().catch(() => {})
    }
  }, [opts, steps, onChange])

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => commitFromX(e.nativeEvent.locationX),
    onPanResponderMove: e => commitFromX(e.nativeEvent.locationX),
  }), [commitFromX])

  return (
    <View
      style={styles.psSlider}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ now: idx, min: 0, max: steps - 1, text: current.label }}
      accessibilityActions={[
        { name: 'increment', label: 'Incrementar' },
        { name: 'decrement', label: 'Decrementar' },
      ]}
      onAccessibilityAction={({ nativeEvent: { actionName } }) => {
        if (actionName === 'increment' && idx < steps - 1) onChange(opts[idx + 1].id)
        if (actionName === 'decrement' && idx > 0) onChange(opts[idx - 1].id)
      }}
    >
      <View style={styles.psValueRow}>
        <Text style={[styles.psValueLabel, { color: accent }]}>{current.label}</Text>
        {current.sub ? <Text style={styles.psValueSub}>{current.sub}</Text> : null}
      </View>

      <View
        style={styles.psTrackTouch}
        onLayout={e => setTrackW(e.nativeEvent.layout.width)}
        {...pan.panHandlers}>
        <View style={styles.psTrack} />
        <Animated.View style={[styles.psTrackFill, { width: Animated.multiply(posAnim, trackW), backgroundColor: accent, opacity: 0.65 }]} />
        {opts.map((o, i) => {
          const on = i <= idx
          const left = trackW * (steps > 1 ? i / (steps - 1) : 0) - 4
          return (
            <View key={o.id} pointerEvents="none"
              style={[styles.psTick, { left }, on && { borderColor: accent }]} />
          )
        })}
        <Animated.View pointerEvents="none"
          style={[styles.psThumb, { left: Animated.subtract(Animated.multiply(posAnim, trackW), 12), backgroundColor: accent, shadowColor: accent, opacity: 0.82 }]} />
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CheckinScreen() {
  const { colors } = useTheme()
  const { t, lang } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  // ── Init ──────────────────────────────────────────────────────────────────
  const [initializing, setInitializing] = useState(true)
  const [locationId, setLocationId] = useState<number | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [addingLoc, setAddingLoc] = useState(false)
  const [newLocNombre, setNewLocNombre] = useState('')
  const [newLocTipo, setNewLocTipo] = useState('')
  const [newLocImplementos, setNewLocImplementos] = useState<string[]>([])
  const [savingLoc, setSavingLoc] = useState(false)
  const [savedLocName, setSavedLocName] = useState<string | null>(null)

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

  // Handle del usuario para el footer de la tarjeta de descanso (failure-safe).
  useEffect(() => {
    getUser().then(u => setUserLabel(handleFromUser(u))).catch(() => {})
  }, [])

  // Coach vinculado (si existe) → aviso en la 1ª página. Failure-safe: sin coach
  // o sin red, no se muestra nada.
  const [coachNombre, setCoachNombre] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // 1) ¿El coach preparó una sesión para hoy? → ir directo a ejecutarla
      // (precede a todo; los días sin rutina del coach siguen el flujo de IA).
      try {
        const at = await fetchAssignedToday()
        if (cancelled) return
        if (at.sesion_id) { router.replace(`/(app)/ejecutar/${at.sesion_id}`); return }
      } catch {}
      // 2) Coach + config: alimenta el aviso y, si el coach quitó el check-in,
      // salta a generación (el backend provisiona un check-in neutro).
      try {
        const r = await fetchMiCoach()
        if (cancelled) return
        setCoachNombre(r.coach?.nombre ?? null)
        if (r.config?.checkin === false) router.replace(`/(app)/generate?t=${Date.now()}`)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  async function saveNewLoc() {
    if (!newLocNombre.trim() || !newLocTipo) {
      setError('Completa el nombre y el tipo de ubicación.')
      return
    }
    setSavingLoc(true)
    try {
      const nombre = newLocNombre.trim()
      const saved = await apiPost('/api/locations/', {
        nombre,
        tipo: newLocTipo.toLowerCase(),
        implementos: newLocImplementos,
      })
      setNewLocNombre('')
      setNewLocTipo('')
      setNewLocImplementos([])
      setAddingLoc(false)
      await loadData()
      if (saved?.id) {
        setLocationId(saved.id)
        setSavedLocName(nombre)
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar la ubicación.')
    } finally {
      setSavingLoc(false)
    }
  }

  // ── Form state ────────────────────────────────────────────────────────────
  // Los 3 estados que ahora son sliders arrancan en su punto central (valor por
  // defecto), no en null: el slider siempre tiene posición y Continuar está activo.
  const [estadoFisico, setEstadoFisico] = useState<EstadoFisico | null>('bien')
  const [calidadSueno, setCalidadSueno] = useState<CalidadSueno | null>('bien')
  const [zonasDolorHoy, setZonasDolorHoy] = useState<string[]>([])
  const [estadoMental, setEstadoMental] = useState<EstadoMental | null>('normal')
  const [tiempoDispo, setTiempoDispo] = useState<TiempoDispo | null>(null)
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [disciplina, setDisciplina] = useState<TipoDisciplina | null>(null)
  // Entorno simple (exteriores/interiores · aguas abiertas/piscina) para cardio
  // al aire libre; reemplaza la selección de lugar guardado en esas disciplinas.
  const [entornoCardio, setEntornoCardio] = useState<string | null>(null)
  const [grupoMuscular, setGrupoMuscular] = useState<GrupoMuscular | null>(null)
  const [runningMode, setRunningMode] = useState<'libre' | 'inteligente' | null>(null)
  // Frase del día de descanso: estable durante la sesión (misma en el resumen y la tarjeta).
  const restFrase = useMemo(() => getRestPhrase(), [])
  // Animación de "parpadeo x2" de la card de categoría antes de avanzar a d4_sub.
  const [pendingCat, setPendingCat] = useState<Categoria | null>(null)
  // Idem para la disciplina concreta en d4_sub.
  const [pendingDisc, setPendingDisc] = useState<TipoDisciplina | null>(null)
  const flashAnim = useRef(new Animated.Value(1)).current

  // ── Nav state ─────────────────────────────────────────────────────────────
  const [screenIndex, setScreenIndex] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [procesandoTimer, setProcesandoTimer] = useState(false)
  // Tarjeta para compartir del día de descanso (modal en el resumen).
  const [shareOpen, setShareOpen] = useState(false)
  const [userLabel, setUserLabel] = useState<string | undefined>(undefined)

  const currentScreen = SCREENS[screenIndex]
  const selectedLocation = locations.find(l => l.id === locationId)
  const isGimnasio = selectedLocation?.tipo?.toLowerCase() === 'gimnasio'
  // El flujo (GPS / grupo muscular / genérico) se decide por la CATEGORÍA de la
  // disciplina elegida, no por su id concreto. Así Ciclismo/Trail/Natación heredan
  // el flujo de Running, y En casa/Calistenia el de Gym, sin tocar el ruteo.
  const discPath = useMemo(
    () => DISCIPLINA_OPTS.find(d => d.id === disciplina)?.path ?? null,
    [disciplina],
  )
  const showGrupoMuscular = discPath === 'musculacion'
  // Día de descanso: la categoría sola define el flujo (no hay disciplina).
  const isDescanso = categoria === 'DESCANSO'

  // Progress bar: pick the right sequence based on the disciplina's path
  const interactiveSeq: ScreenId[] = useMemo(() => {
    if (isDescanso)                 return SEQ_DESCANSO
    if (discPath === 'running')     return SEQ_RUNNING
    if (discPath === 'musculacion') return SEQ_MUSCULACION
    return SEQ_OTHER
  }, [discPath, isDescanso])

  const nInteractive = interactiveSeq.length
  const interactiveStep = interactiveSeq.indexOf(currentScreen as ScreenId) + 1 // 0 if not in seq
  const isInteractive = interactiveStep > 0                                       // show header/footer
  // d4b_running navega inline; d4 y d4_sub avanzan al tocar (parpadeo) → sin footer.
  const showFooterBtn = isInteractive && currentScreen !== 'd4b_running' && currentScreen !== 'd4' && currentScreen !== 'd4_sub'
  const isLastInteractive = showFooterBtn && interactiveStep === nInteractive

  const canContinue = showFooterBtn && !submitting && (
    currentScreen === 'd3'        ? !!tiempoDispo :
    currentScreen === 'd5b_grupo' ? !!grupoMuscular :
    true  // d_estado (sliders con valor por defecto) y d5 (ubicación) no bloquean
  )

  function toggleZona(id: string) {
    setZonasDolorHoy(prev => prev.includes(id) ? prev.filter(z => z !== id) : [...prev, id])
  }

  function validate(): string | null {
    if (currentScreen === 'd3'        && !tiempoDispo)   return 'Indica cuánto tiempo tienes hoy.'
    if (currentScreen === 'd5b_grupo' && !grupoMuscular) return 'Elige el grupo muscular a trabajar hoy.'
    return null
  }

  function resetCheckin() {
    setScreenIndex(0)
    setCategoria(null)
    setDisciplina(null)
    setEntornoCardio(null)
    setGrupoMuscular(null)
    setRunningMode(null)
    setPendingCat(null)
    setPendingDisc(null)
    setEstadoFisico('bien')
    setCalidadSueno('bien')
    setEstadoMental('normal')
    setZonasDolorHoy([])
    setTiempoDispo(null)
    setLocationId(null)
    setSavedLocName(null)
    setError('')
    setCheckinSaved(false)
    setProcesandoTimer(false)
    setAddingLoc(false)
  }

  // Al volver a la pantalla ENTRENAR tras COMPLETAR un check-in (incluido el día de
  // descanso), reiniciar para empezar uno nuevo en vez de quedar atascado en el
  // resumen ("Día de descanso · Compartir"). Solo dispara si ya se había guardado:
  // un check-in a medias (sin guardar) conserva su progreso al cambiar de pestaña.
  const checkinSavedRef = useRef(false)
  useEffect(() => { checkinSavedRef.current = checkinSaved }, [checkinSaved])
  useFocusEffect(
    useCallback(() => {
      if (checkinSavedRef.current) resetCheckin()
    }, []),
  )

  // Tocar una categoría en d4: parpadea 2 veces y avanza a d4_sub. Resetea la
  // subdisciplina para que d4_sub arranque sin selección al cambiar de categoría.
  function pickCategoria(cat: Categoria) {
    if (pendingCat) return
    setCategoria(cat)
    setDisciplina(null)
    setEntornoCardio(null)
    setRunningMode(null)   // se exige re-elegir libre/inteligente al entrar al subflujo
    setError('')
    flashAnim.setValue(1)
    setPendingCat(cat)
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.25, duration: 110, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,    duration: 110, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0.25, duration: 110, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,    duration: 110, useNativeDriver: true }),
    ]).start(() => {
      setPendingCat(null)
      // Descanso no tiene subdisciplinas → salta directo al estado de hoy.
      setScreenIndex(SCREENS.indexOf(cat === 'DESCANSO' ? 'd_estado' : 'd4_sub'))
    })
  }

  // Tocar una disciplina en d4_sub: parpadea 2 veces y avanza al siguiente paso.
  function pickDisciplina(id: TipoDisciplina) {
    if (pendingDisc) return
    setDisciplina(id)
    setEntornoCardio(null)
    setRunningMode(null)   // cambiar de disciplina invalida el modo elegido antes
    setError('')
    flashAnim.setValue(1)
    setPendingDisc(id)
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.25, duration: 110, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,    duration: 110, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0.25, duration: 110, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1,    duration: 110, useNativeDriver: true }),
    ]).start(() => {
      const path = DISCIPLINA_OPTS.find(d => d.id === id)?.path ?? null
      setPendingDisc(null)
      setScreenIndex(path === 'running' ? SCREENS.indexOf('d4b_running') : SCREENS.indexOf('d_estado'))
    })
  }

  function goBack() {
    if (screenIndex === 0) { router.back(); return }
    // Desde el estado combinado: descanso vuelve a la categoría; cardio al paso
    // GPS; el resto a la subdisciplina.
    if (currentScreen === 'd_estado') {
      if (isDescanso) { setScreenIndex(SCREENS.indexOf('d4')); return }
      setScreenIndex(discPath === 'running' ? SCREENS.indexOf('d4b_running') : SCREENS.indexOf('d4_sub'))
      return
    }
    setScreenIndex(i => i - 1)
  }

  function goNext() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')

    // d4_sub → cardio abre el paso GPS; el resto va al estado combinado
    if (currentScreen === 'd4_sub') {
      setScreenIndex(discPath === 'running' ? SCREENS.indexOf('d4b_running') : SCREENS.indexOf('d_estado'))
      return
    }

    // d_estado → descanso no pide tiempo, ubicación ni grupo: va directo a guardar
    if (currentScreen === 'd_estado' && isDescanso) {
      setScreenIndex(SCREENS.indexOf('d6_procesando'))
      return
    }

    // d_estado → cardio no pregunta tiempo disponible
    if (currentScreen === 'd_estado' && discPath === 'running') {
      setScreenIndex(SCREENS.indexOf('d5'))
      return
    }

    // D5 → skip D5b unless musculacion
    if (currentScreen === 'd5') {
      setScreenIndex(showGrupoMuscular ? SCREENS.indexOf('d5b_grupo') : SCREENS.indexOf('d6_procesando'))
      return
    }

    setScreenIndex(i => i + 1)
  }

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const zonaLabels = zonasDolorHoy.map(z => ZONE_LABELS[z] ?? z)
      const tiempoOpt = TIEMPO_OPTS.find(t => t.id === tiempoDispo)
      const discOpt = DISCIPLINA_OPTS.find(d => d.id === disciplina)
      const grupoOpt = GRUPO_MUSCULAR_OPTS.find(g => g.id === grupoMuscular)
      // Disciplinas con entorno simple (running/ciclismo/trail/natación): no usan
      // un lugar guardado → location va null y el entorno se anota en `notas`.
      const entornoList = disciplina ? ENTORNO_OPTS[disciplina] : undefined
      const entornoLabel = entornoList?.find(o => o.id === entornoCardio)?.label ?? null
      const focos: string[] = []
      if (isDescanso) focos.push('descanso')
      if (discOpt) { focos.push(discOpt.foco); focos.push(discOpt.id) }
      if (grupoOpt && showGrupoMuscular) focos.push(grupoOpt.id)
      const notasParts: string[] = []
      if (isDescanso) notasParts.push('Día de descanso')
      if (discOpt) notasParts.push(`Disciplina: ${discOpt.label}`)
      if (grupoOpt && showGrupoMuscular) notasParts.push(`Grupo muscular: ${grupoOpt.label} — ${grupoOpt.sub}`)
      if (entornoLabel) notasParts.push(`Entorno: ${entornoLabel}`)
      await apiPost('/api/checkins/', {
        foco_entrenamiento: focos,
        estado_animo: estadoMental ? MENTAL_TO_ANIMO[estadoMental] : 3,
        estado_fisico: estadoFisico ? FISICO_TO_NUM[estadoFisico] : null,
        calidad_sueno: SUENO_OPTS.find(s => s.id === calidadSueno)?.horas ?? 7,
        hrv: null,
        location: entornoList ? null : locationId,
        duracion_disponible: tiempoOpt?.minutos ?? (DISCIPLINA_OPTS.find(d => d.id === disciplina)?.path === 'running' ? 60 : 45),
        dolor_hoy: zonaLabels.length > 0 ? zonaLabels.join(', ') : null,
        notas: notasParts.length > 0 ? notasParts.join('. ') : null,
      })
      setCheckinSaved(true)
    } catch (e: any) {
      // Stay on d6_procesando — the screen renders the error inline
      setError(e.message ?? 'No se pudo guardar. Inténtalo de nuevo.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [zonasDolorHoy, tiempoDispo, disciplina, grupoMuscular, showGrupoMuscular, estadoMental, estadoFisico, calidadSueno, locationId, entornoCardio, isDescanso])

  // ── D5 processing orchestration ───────────────────────────────────────────

  const handleSubmitRef = useRef(handleSubmit)
  useEffect(() => { handleSubmitRef.current = handleSubmit }, [handleSubmit])

  useEffect(() => {
    if (currentScreen !== 'd6_procesando') return
    setCheckinSaved(false)
    setProcesandoTimer(false)
    handleSubmitRef.current()
    const t = setTimeout(() => setProcesandoTimer(true), 2500)
    return () => clearTimeout(t)
  }, [currentScreen])

  useEffect(() => {
    if (currentScreen !== 'd6_procesando') return
    if (checkinSaved && procesandoTimer) setScreenIndex(i => i + 1)
  }, [checkinSaved, procesandoTimer, currentScreen])

  // ── Summary builders ─────────────────────────────────────────────────────

  function buildSummaryText(): string {
    const parts: string[] = []
    const tiempoOpt = TIEMPO_OPTS.find(t => t.id === tiempoDispo)
    const discOpt = DISCIPLINA_OPTS.find(d => d.id === disciplina)
    const grupoOpt = GRUPO_MUSCULAR_OPTS.find(g => g.id === grupoMuscular)
    if (discOpt) parts.push(discOpt.label)
    if (grupoOpt && showGrupoMuscular) parts.push(grupoOpt.sub)
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
    const grupoOpt = GRUPO_MUSCULAR_OPTS.find(g => g.id === grupoMuscular)
    let text = discOpt?.sub ?? disciplina
    if (grupoOpt && showGrupoMuscular) {
      text += ` · ${grupoOpt.label}: ${grupoOpt.sub}`
    }
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

  // Subdisciplinas de la categoría elegida (pantalla d4_sub).
  // Al tocar una disciplina parpadea 2 veces y avanza automáticamente.
  function renderSubDisciplina() {
    const opts = DISCIPLINA_OPTS.filter(o => o.cat === categoria)
    const catLabel = CATEGORIA_OPTS.find(c => c.cat === categoria)?.label ?? ''
    return (
      <>
        <Text style={styles.eyebrow}>{t('checkin_dim4_eyebrow')}</Text>
        <Text style={styles.question}>{catLabel}</Text>
        <Text style={styles.questionSub}>Elige tu disciplina de hoy.</Text>

        <View style={styles.optionsWrap}>
          {opts.map(opt => {
            const flashing = pendingDisc === opt.id
            return (
              <Animated.View key={opt.id} style={flashing ? { opacity: flashAnim } : undefined}>
                <TouchableOpacity
                  style={[styles.estadoCard, flashing && { backgroundColor: opt.bg, borderColor: opt.border, borderWidth: 1.5 }]}
                  onPress={() => pickDisciplina(opt.id)}
                  disabled={!!pendingDisc}
                  activeOpacity={0.82}>
                  <View style={[styles.estadoBar, { backgroundColor: flashing ? opt.color : 'transparent' }]} />
                  <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 18 }}>
                    <Text style={[styles.estadoLabel, { paddingVertical: 0, paddingHorizontal: 0 }, flashing && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.intencionNota, flashing && { color: opt.color, opacity: 0.75 }]}>
                      {opt.sub}
                    </Text>
                  </View>
                  <Text style={[styles.catChevron, { color: flashing ? opt.color : colors.inkMuted }]}>→</Text>
                </TouchableOpacity>
              </Animated.View>
            )
          })}
        </View>
      </>
    )
  }

  // Cuerpo + Cabeza + Horas de sueño en una sola pantalla (d_estado), cada uno con
  // un slider de 4 puntos. Reemplaza las antiguas d1 / d2 / d_sueno. Los valores
  // (estadoFisico, estadoMental, calidadSueno) y su mapeo a la BD no cambian.
  function renderEstado() {
    return (
      <>
        <Text style={styles.eyebrow}>TU ESTADO DE HOY</Text>
        <Text style={styles.question}>¿Cómo llegas hoy?</Text>
        <Text style={styles.questionSub}>Mueve cada control hasta cómo te sientes.</Text>

        <View style={styles.estadoSliderBlock}>
          <Text style={styles.estadoSliderLabel}>CUERPO</Text>
          <PointSlider
            opts={ESTADO_FISICO_OPTS}
            value={estadoFisico}
            onChange={v => { setEstadoFisico(v as EstadoFisico); setError('') }}
            styles={styles}
            label="Estado físico de hoy"
          />
        </View>

        {/* Mapa corporal — solo si el cuerpo está en "molestia" (igual que antes). */}
        {estadoFisico === 'molestia' && (
          <View style={styles.zonaSection}>
            <View style={styles.zonaDivider} />
            <Text style={styles.zonaEyebrow}>{t('checkin_dim1_zone_eyebrow')}</Text>
            <Text style={styles.zonaSub}>
              {t('checkin_dim1_zone_hint')}
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
              <Text style={styles.zonaHint}>{t('checkin_dim1_zone_hint')}</Text>
            )}
          </View>
        )}

        <View style={styles.estadoSliderBlock}>
          <Text style={styles.estadoSliderLabel}>CABEZA</Text>
          <PointSlider
            opts={ESTADO_MENTAL_OPTS}
            value={estadoMental}
            onChange={v => { setEstadoMental(v as EstadoMental); setError('') }}
            styles={styles}
            label="Estado mental de hoy"
          />
        </View>

        <View style={styles.estadoSliderBlock}>
          <Text style={styles.estadoSliderLabel}>HORAS DE SUEÑO</Text>
          <PointSlider
            opts={SUENO_OPTS}
            value={calidadSueno}
            onChange={v => { setCalidadSueno(v as CalidadSueno); setError('') }}
            styles={styles}
            label="Horas de sueño anoche"
          />
        </View>
      </>
    )
  }

  function renderD3() {
    return (
      <>
        <Text style={styles.eyebrow}>{t('checkin_dim3_eyebrow')}</Text>
        <Text style={styles.question}>{t('checkin_dim3_question')}</Text>
        <Text style={styles.questionSub}>{t('checkin_dim3_sub')}</Text>

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
                  {opt.minutos} {t('checkin_min')}
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
        <Text style={styles.eyebrow}>{t('checkin_dim4_eyebrow')}</Text>
        <Text style={styles.question}>{t('checkin_dim4_question')}</Text>
        <Text style={styles.questionSub}>{t('checkin_dim4_sub')}</Text>

        {coachNombre ? (
          <View style={styles.coachNotice}>
            <Text style={styles.coachNoticeIcon}>🧑‍🏫</Text>
            <Text style={styles.coachNoticeText}>
              {t('checkin_coach_notice_pre')}{' '}
              <Text style={styles.coachNoticeName}>{coachNombre}</Text>{' '}
              {t('checkin_coach_notice_post')}
            </Text>
          </View>
        ) : null}

        <View style={styles.optionsWrap}>
          {CATEGORIA_OPTS.map(opt => {
            const flashing = pendingCat === opt.cat
            return (
              <Animated.View key={opt.cat} style={flashing ? { opacity: flashAnim } : undefined}>
                <TouchableOpacity
                  style={[styles.estadoCard, flashing && { backgroundColor: opt.bg, borderColor: opt.border, borderWidth: 1.5 }]}
                  onPress={() => pickCategoria(opt.cat)}
                  disabled={!!pendingCat}
                  activeOpacity={0.82}>
                  <View style={[styles.estadoBar, { backgroundColor: flashing ? opt.color : 'transparent' }]} />
                  <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 18 }}>
                    <Text style={[styles.estadoLabel, { paddingVertical: 0, paddingHorizontal: 0 }, flashing && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.intencionNota, flashing && { color: opt.color, opacity: 0.75 }]}>
                      {opt.sub}
                    </Text>
                  </View>
                  <Text style={[styles.catChevron, { color: flashing ? opt.color : colors.inkMuted }]}>→</Text>
                </TouchableOpacity>
              </Animated.View>
            )
          })}
        </View>
      </>
    )
  }

  function renderD4b() {
    const opts = [
      {
        id: 'libre' as const,
        label: 'Entrenamiento libre',
        sub: 'Sal a correr y registra tu ruta con GPS',
        color: '#ff8c42',
        bg: 'rgba(255,140,66,0.1)',
        border: 'rgba(255,140,66,0.45)',
        tag: null,
      },
      {
        id: 'inteligente' as const,
        label: 'Entrenamiento inteligente',
        sub: 'Plan de running adaptativo con IA',
        color: '#4f8cff',
        bg: 'rgba(79,140,255,0.1)',
        border: 'rgba(79,140,255,0.45)',
        tag: null,
      },
    ]

    return (
      <>
        <Text style={styles.eyebrow}>{t('checkin_running_eyebrow')}</Text>
        <Text style={styles.question}>{t('checkin_running_question')}</Text>
        <Text style={styles.questionSub}>{t('checkin_running_sub')}</Text>

        <View style={styles.optionsWrap}>
          {opts.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.estadoCard, { minHeight: 84 }]}
              onPress={() => {
                setRunningMode(opt.id)
                setError('')
                setScreenIndex(SCREENS.indexOf('d_estado'))
              }}
              activeOpacity={0.82}
            >
              <View style={[styles.estadoBar, { backgroundColor: opt.color }]} />
              <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={[styles.estadoLabel, { paddingVertical: 0, paddingHorizontal: 0, color: opt.color }]}>
                    {opt.label}
                  </Text>
                  {opt.tag && (
                    <View style={{
                      backgroundColor: colors.glassBg,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}>
                      <Text style={{
                        fontFamily: 'JetBrainsMono-Regular',
                        fontSize: 8,
                        color: colors.inkMuted,
                        letterSpacing: 0.8,
                      }}>{opt.tag}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.intencionNota, { color: opt.color, opacity: 0.75 }]}>
                  {opt.sub}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </>
    )
  }

  const TIPO_ICON: Record<string, string> = {
    gimnasio: '🏋️', casa: '🏠', exterior: '🌳',
  }

  function renderD5() {
    // Disciplinas al aire libre / agua → selector de entorno (2 opciones); el
    // resto mantiene la lista de lugares guardados con implementos.
    const entornoOpts = disciplina ? ENTORNO_OPTS[disciplina] : undefined
    return (
      <>
        <Text style={styles.eyebrow}>{t('checkin_dim5_eyebrow')}</Text>
        <Text style={styles.question}>{t('checkin_dim5_question')}</Text>
        <Text style={styles.questionSub}>{t('checkin_dim5_sub')}</Text>

        {entornoOpts && (
          <View style={styles.optionsWrap}>
            {entornoOpts.map(opt => {
              const on = entornoCardio === opt.id
              return (
                <TouchableOpacity key={opt.id}
                  style={[styles.estadoCard, on && { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: 'rgba(79,140,255,0.45)', borderWidth: 1.5 }]}
                  onPress={() => { setEntornoCardio(on ? null : opt.id); setError('') }}
                  activeOpacity={0.82}>
                  <View style={[styles.estadoBar, { backgroundColor: on ? colors.accent : 'transparent' }]} />
                  <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                    <Text style={[styles.estadoLabel, { paddingVertical: 0, paddingHorizontal: 0 }, on && { color: colors.accent }]}>
                      {opt.label}
                    </Text>
                  </View>
                  <View style={[styles.estadoRadio, on && { borderColor: colors.accent }]}>
                    {on && <View style={[styles.estadoRadioDot, { backgroundColor: colors.accent }]} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {!entornoOpts && locations.length > 0 && (
          <View style={[styles.optionsWrap, { marginBottom: 12 }]}>
            {locations.map(loc => {
              const on = locationId === loc.id
              const icon = TIPO_ICON[loc.tipo?.toLowerCase()] ?? '📍'
              return (
                <TouchableOpacity key={loc.id}
                  style={[styles.estadoCard, on && { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: 'rgba(79,140,255,0.45)', borderWidth: 1.5 }]}
                  onPress={() => { setLocationId(on ? null : loc.id); setSavedLocName(null); setError('') }}
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

        {!entornoOpts && savedLocName && (
          <View style={{
            backgroundColor: 'rgba(50,200,150,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(50,200,150,0.35)',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ color: '#32c896', fontSize: 14 }}>✓</Text>
            <Text style={{ color: '#32c896', fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 }}>
              {savedLocName} añadido y seleccionado para esta sesión
            </Text>
          </View>
        )}

        {!entornoOpts && (addingLoc ? (
          <View style={styles.addLocForm}>
            <Text style={styles.addLocLabel}>NOMBRE</Text>
            <TextInput
              value={newLocNombre}
              onChangeText={setNewLocNombre}
              placeholder="Ej: Mi gimnasio"
              placeholderTextColor={colors.inkMuted}
              style={styles.addLocInput}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Text style={[styles.addLocLabel, { marginTop: 14 }]}>TIPO</Text>
            <View style={styles.addLocChipsRow}>
              {TIPOS_LUGAR.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[styles.addLocChip, newLocTipo === tipo && styles.addLocChipActive]}
                  onPress={() => setNewLocTipo(tipo)}
                  activeOpacity={0.7}>
                  <Text style={[styles.addLocChipText, newLocTipo === tipo && styles.addLocChipTextActive]}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.addLocLabel, { marginTop: 14 }]}>IMPLEMENTOS (opcional)</Text>
            <View style={styles.addLocChipsRow}>
              {IMPLEMENTOS_LIST.map(imp => {
                const on = newLocImplementos.includes(imp)
                return (
                  <TouchableOpacity
                    key={imp}
                    style={[styles.addLocChip, on && styles.addLocChipActive]}
                    onPress={() => setNewLocImplementos(prev =>
                      on ? prev.filter(i => i !== imp) : [...prev, imp]
                    )}
                    activeOpacity={0.7}>
                    <Text style={[styles.addLocChipText, on && styles.addLocChipTextActive]}>{imp}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.addLocSaveBtn, { flex: 1, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderDefault }]}
                onPress={() => { setAddingLoc(false); setNewLocNombre(''); setNewLocTipo(''); setNewLocImplementos([]) }}
                activeOpacity={0.7}>
                <Text style={[styles.addLocSaveBtnText, { color: colors.inkSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addLocSaveBtn, { flex: 1 }, savingLoc && { opacity: 0.5 }]}
                onPress={saveNewLoc}
                disabled={savingLoc}
                activeOpacity={0.85}>
                <Text style={styles.addLocSaveBtnText}>{savingLoc ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addLocBtn}
            onPress={() => setAddingLoc(true)}
            activeOpacity={0.7}>
            <Text style={styles.addLocBtnText}>+ Agregar lugar de entrenamiento</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.tiempoNote}>
          La selección de ubicación es opcional — puedes continuar sin elegir.
        </Text>
      </>
    )
  }

  function renderD5b() {
    return (
      <>
        <Text style={styles.eyebrow}>{t('checkin_dim5b_eyebrow')}</Text>
        <Text style={styles.question}>{t('checkin_dim5b_question')}</Text>
        <Text style={styles.questionSub}>{t('checkin_dim5b_sub')}</Text>

        <View style={styles.optionsWrap}>
          {GRUPO_MUSCULAR_OPTS.map(opt => {
            const on = grupoMuscular === opt.id
            return (
              <TouchableOpacity key={opt.id}
                style={[styles.estadoCard, on && { backgroundColor: opt.bg, borderColor: opt.border, borderWidth: 1.5 }]}
                onPress={() => { setGrupoMuscular(opt.id); setError('') }}
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

  function renderD6() {
    const isRunning = discPath === 'running'
    if (error) {
      return (
        <View style={styles.procesandoWrap}>
          <Text style={styles.procesandoErrorTitle}>Algo salió mal</Text>
          <Text style={styles.procesandoErrorSub}>{error}</Text>
          <TouchableOpacity
            style={styles.procesandoRetryBtn}
            onPress={() => { setError(''); setCheckinSaved(false); setProcesandoTimer(true); handleSubmit() }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Intentar de nuevo">
            <Text style={styles.procesandoRetryText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return (
      <View style={styles.procesandoWrap}>
        <ActivityIndicator color={isDescanso ? REST_COLOR : isRunning ? '#ff8c42' : colors.accent} size="large" />
        <Text style={styles.procesandoTitle}>
          {isDescanso ? 'Guardando tu\ndía de descanso...' : isRunning ? 'Guardando tu\ncheck-in...' : 'Construyendo tu\nentrenamiento de hoy...'}
        </Text>
        <Text style={styles.procesandoSub}>
          {isDescanso ? 'Registrando tu recuperación' : isRunning ? 'Preparando tu sesión de running' : 'Calibrando tu sesión...'}
        </Text>
      </View>
    )
  }

  function renderD7() {
    // Día de descanso: sin pronóstico de sesión ni CTA de entrenamiento. Muestra la
    // frase y un botón para compartir la tarjeta (se rasteriza a PNG en el modal).
    if (isDescanso) {
      return (
        <View style={[styles.resumenWrap, { paddingTop: insets.top + 24 }]}>
          <View style={[styles.resumenCheckCircle, { borderColor: REST_COLOR }]}>
            <Text style={[styles.resumenCheckMark, { color: REST_COLOR }]}>✓</Text>
          </View>
          <Text style={[styles.resumenEyebrow, { color: REST_COLOR }]}>DÍA DE DESCANSO</Text>
          <Text style={styles.resumenTitle}>Check-in guardado</Text>

          <View style={styles.resumenCard}>
            <Text style={styles.resumenDataText}>{buildSummaryText() || 'Tu estado de hoy quedó registrado.'}</Text>
            <View style={styles.resumenDivider} />
            <Text style={[styles.resumenSesionEyebrow, { color: REST_COLOR }]}>HOY</Text>
            <Text style={styles.resumenSesionText}>{restFrase}</Text>
          </View>

          <Text style={styles.resumenNote}>
            Recuperar también es progreso. Vuelve mañana para tu próxima sesión.
          </Text>

          <View style={[styles.resumenFooter, { paddingBottom: Math.max(insets.bottom, 28) }]}>
            <TouchableOpacity
              style={styles.nextWrap}
              onPress={() => setShareOpen(true)}
              activeOpacity={0.88}>
              <LinearGradient
                colors={[REST_COLOR, REST_COLOR_DARK]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>Compartir</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/(app)/dashboard')}
              style={styles.resetCheckinBtn}
              activeOpacity={0.6}>
              <Text style={[styles.resetCheckinText, { color: colors.inkMuted }]}>
                Volver al inicio
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }
    const discOpt = DISCIPLINA_OPTS.find(d => d.id === disciplina)
    const tiempoOpt = TIEMPO_OPTS.find(t => t.id === tiempoDispo)
    const grupoOpt = GRUPO_MUSCULAR_OPTS.find(g => g.id === grupoMuscular)
    const loc = locations.find(l => l.id === locationId)
    return (
      <View style={[styles.resumenWrap, { paddingTop: insets.top + 24 }]}>
        <View style={styles.resumenCheckCircle}>
          <Text style={styles.resumenCheckMark}>✓</Text>
        </View>
        <Text style={styles.resumenEyebrow}>{t('checkin_summary_eyebrow')}</Text>
        <Text style={styles.resumenTitle}>{t('checkin_summary_title')}</Text>

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
                {tiempoOpt.minutos} {t('checkin_min')}
              </Text>
            </View>
          )}
          {grupoOpt && showGrupoMuscular && (
            <View style={[styles.resumenPill, { borderColor: grupoOpt.color }]}>
              <Text style={[styles.resumenPillText, { color: grupoOpt.color }]}>
                {grupoOpt.sub}
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
          <Text style={styles.resumenSesionEyebrow}>{t('checkin_session_eyebrow')}</Text>
          <Text style={styles.resumenSesionText}>{buildPronosticoText()}</Text>
        </View>

        <Text style={styles.resumenNote}>
          Este es el punto de partida. La IA ajusta cada variable en tiempo real.
        </Text>

        {/* CTA */}
        <View style={[styles.resumenFooter, { paddingBottom: Math.max(insets.bottom, 28) }]}>
          {discPath === 'running' ? (
            runningMode === 'inteligente' ? (
              <TouchableOpacity
                style={styles.nextWrap}
                onPress={() => router.replace(`/(app)/running?modo=${runModeForEntorno(entornoCardio)}`)}
                activeOpacity={0.88}>
                <LinearGradient
                  colors={['#4f8cff', '#2563ff']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>Generar mi sesión</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.nextWrap}
                onPress={() => router.replace(`/(app)/run?modo=${runModeForEntorno(entornoCardio)}`)}
                activeOpacity={0.88}>
                <LinearGradient
                  colors={['#ff8c42', '#e06c28']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>{t('checkin_btn_run')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={styles.nextWrap}
              onPress={() => router.replace(`/(app)/generate?t=${Date.now()}`)}
              activeOpacity={0.88}>
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>{t('checkin_btn_workout')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={resetCheckin}
            style={styles.resetCheckinBtn}
            activeOpacity={0.6}
          >
            <Text style={[styles.resetCheckinText, { color: colors.inkMuted }]}>
              ↩  Cambiar parámetros
            </Text>
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

        {/* Modal de la tarjeta para compartir (solo día de descanso). */}
        {isDescanso && (
          <Modal
            visible={shareOpen}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShareOpen(false)}
          >
            <View style={styles.shareModalRoot}>
              <View style={[styles.shareModalClose, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                  onPress={() => setShareOpen(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.shareModalCloseText}>×</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                contentContainerStyle={styles.shareModalContent}
                showsVerticalScrollIndicator={false}
              >
                <WorkoutShareCard
                  sessionType="descanso"
                  title="Hoy descanso"
                  phrase={restFrase}
                  userLabel={userLabel}
                  dateLabel={formatShareDate()}
                />
              </ScrollView>
            </View>
          </Modal>
        )}
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
            width: `${Math.round((interactiveStep || 1) / nInteractive * 100)}%` as any,
          }]} />
        </View>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerDate}>{formatDate(lang)}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        key={screenIndex}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        { currentScreen === 'd4'          ? renderD4()
        : currentScreen === 'd4_sub'      ? renderSubDisciplina()
        : currentScreen === 'd4b_running' ? renderD4b()
        : currentScreen === 'd_estado'    ? renderEstado()
        : currentScreen === 'd3'          ? renderD3()
        : currentScreen === 'd5b_grupo'   ? renderD5b()
        : renderD5() }
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer — hidden on d4b_running (it navigates inline) */}
      {showFooterBtn && (
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
                {isLastInteractive ? (isDescanso ? 'Registrar mi descanso' : 'Construir mi entrenamiento') : 'Continuar'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
    coachNotice: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: 'rgba(79,140,255,0.08)',
      borderWidth: 1, borderColor: 'rgba(79,140,255,0.25)',
      borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
      marginTop: -16, marginBottom: 28,
    },
    coachNoticeIcon: { fontSize: 16, marginTop: 1 },
    coachNoticeText: {
      flex: 1, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkSecondary, lineHeight: 19,
    },
    coachNoticeName: { fontFamily: 'SpaceGrotesk-SemiBold', color: c.accent },

    optionsWrap: { gap: 10 },

    // Chevron de las tarjetas de categoría (d4) — indica que avanzan al tocar.
    catChevron: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      paddingHorizontal: 18,
    },

    // Pantalla de estado combinado (d_estado): bloque por slider.
    estadoSliderBlock: { marginBottom: 26 },
    estadoSliderLabel: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 10, color: c.inkMuted,
      letterSpacing: 2, textTransform: 'uppercase',
      marginBottom: 10,
    },

    // Slider discreto de N puntos (PointSlider).
    psSlider: { marginTop: 2, marginBottom: 2 },
    psValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    psValueLabel: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, letterSpacing: -0.4 },
    psValueSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkSecondary, flexShrink: 1 },
    psTrackTouch: { height: 40, justifyContent: 'center' },
    psTrack: {
      position: 'absolute', left: 0, right: 0, top: 18, height: 3,
      borderRadius: 2, backgroundColor: c.inkFaint,
    },
    psTrackFill: {
      position: 'absolute', left: 0, top: 18, height: 3, borderRadius: 2,
    },
    psTick: {
      position: 'absolute', top: 16, width: 7, height: 7, borderRadius: 3.5,
      backgroundColor: c.bg, borderWidth: 1.5, borderColor: c.inkFaint,
    },
    psThumb: {
      position: 'absolute', top: 8, width: 24, height: 24, borderRadius: 12,
      borderWidth: 2, borderColor: c.bg,
      shadowOpacity: 0.18, shadowRadius: 2.5,
      shadowOffset: { width: 0, height: 0 }, elevation: 2,
    },

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
    addLocBtn: {
      borderWidth: 1, borderColor: c.accent, borderStyle: 'dashed',
      borderRadius: 14, paddingVertical: 13, alignItems: 'center',
      backgroundColor: 'rgba(79,140,255,0.05)',
    },
    addLocBtnText: { color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 },
    addLocForm: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 16,
    },
    addLocLabel: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
    },
    addLocInput: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    },
    addLocChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    addLocChip: {
      paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg,
    },
    addLocChipActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.12)' },
    addLocChipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    addLocChipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    addLocSaveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    addLocSaveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14 },

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
    procesandoErrorTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      color: c.red, letterSpacing: -0.4, textAlign: 'center', marginBottom: 12,
    },
    procesandoErrorSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22,
    },
    procesandoRetryBtn: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    },
    procesandoRetryText: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary,
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
    resetCheckinBtn: {
      marginTop: 12, paddingVertical: 12, alignItems: 'center',
    },
    resetCheckinText: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 14,
      textDecorationLine: 'underline',
    },

    // Modal de la tarjeta para compartir (día de descanso)
    shareModalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
    shareModalClose: {
      flexDirection: 'row', justifyContent: 'flex-end',
      paddingHorizontal: 20, paddingBottom: 4,
    },
    shareModalCloseText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 32,
      color: '#ffffff', lineHeight: 36,
    },
    shareModalContent: {
      flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24,
    },
  })
}
