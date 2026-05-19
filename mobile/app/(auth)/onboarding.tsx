import React, { useState, useMemo, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { G, Rect, Circle, Ellipse } from 'react-native-svg'
import { router } from 'expo-router'
import { useTheme } from '../../lib/theme'
import { Colors } from '../../lib/colors'
import { apiPut } from '../../lib/api'
import { getUser, saveUser } from '../../lib/storage'

// ─── Types ────────────────────────────────────────────────────────────────────

type Sexo = 'masculino' | 'femenino' | 'otro' | ''
type LesionEstado = 'activa' | 'superada'
type LesionGravedad = 'leve' | 'moderada' | 'severa'
type LesionTiempo = '1-3m' | '3-6m' | '6-12m' | '+1a'

type Lesion = {
  zona: string
  estado: LesionEstado
  gravedad?: LesionGravedad
  especialista?: boolean
  tiempo?: LesionTiempo
}

type ScreenId =
  | 'b1_personal' | 'b1_ciclo' | 'b1_historial' | 'b1_sueno'
  | 'b2_lesiones' | 'b2_limitaciones' | 'b2_historial_medico'
  | 'b3_lugar' | 'b3_equipamiento' | 'b3_tiempo_horario'
  | 'b4_objetivo' | 'b4_horizonte'
  | 'b5_abandono' | 'b5_coaching' | 'b5_entreno'
  | 'b6_procesando' | 'b6_beta'

type FormData = {
  nombre: string
  fechaNacimiento: Date | null
  sexo: Sexo
  peso: string
  pesoUnit: 'kg' | 'lb'
  altura: string
  alturaUnit: 'cm' | 'ft'
  usaCicloMenstrual: boolean
  frecuenciaHistorica: number | null
  deportes: string[]
  calidadSueno: string | null
  lesiones: Lesion[]
  ejerciciosEvitar: string[]
  motivoLimitacion: string
  condicionesMedicas: string[]
  condicionOtra: string
  notasMedicas: string
  lugares: string[]
  equipamiento: string[]
  tiempoNormal: string | null
  tiempoOcupado: string | null
  horarios: string[]
  diasFijos: boolean | null
  objetivos: string[]
  objetivoSecundario: string | null
  horizonteTemporal: string | null
  motivacion: string
  razonesAbandono: string[]
  estiloCoaching: 'directo' | 'calido' | 'tecnico' | null
  tiposEntrenamiento: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRECUENCIA_OPTIONS = [
  { label: 'Casi nunca',           sublabel: '0 o 1 días por semana',   value: 1, badge: '0–1' },
  { label: '1–2 veces por semana', sublabel: 'Entrenamiento ocasional', value: 2, badge: '1–2' },
  { label: '3–4 veces por semana', sublabel: 'La frecuencia más común', value: 3, badge: '3–4' },
  { label: '5–6 veces por semana', sublabel: 'Alta dedicación',          value: 5, badge: '5–6' },
  { label: 'Todos los días',       sublabel: '7 días por semana',        value: 7, badge: '7'   },
]

const SUENO_OPTIONS = [
  { value: '<6h',  label: 'Menos de 6h',   sublabel: 'Sueño corto o fragmentado', icon: '😓' },
  { value: '6-7h', label: '6–7h irregular', sublabel: 'Varía mucho cada noche',    icon: '😐' },
  { value: '7-8h', label: '7–8h estable',  sublabel: 'La cantidad recomendada',   icon: '😴' },
  { value: '>8h',  label: 'Más de 8h',     sublabel: 'Largo o con mucha fatiga',  icon: '💤' },
]

const ZONE_LABELS: Record<string, string> = {
  cabeza:      'Cabeza / Cuello',
  hombro_izq:  'Hombro izquierdo',
  hombro_der:  'Hombro derecho',
  brazo_izq:   'Brazo / Codo izq.',
  brazo_der:   'Brazo / Codo der.',
  muneca_izq:  'Muñeca / Mano izq.',
  muneca_der:  'Muñeca / Mano der.',
  pecho:       'Pecho / Tórax',
  abdomen:     'Abdomen / Core',
  lumbar:      'Espalda / Lumbar',
  cadera:      'Cadera / Glúteos',
  muslo_izq:   'Muslo izquierdo',
  muslo_der:   'Muslo derecho',
  rodilla_izq: 'Rodilla izquierda',
  rodilla_der: 'Rodilla derecha',
  tobillo_izq: 'Tobillo / Pie izq.',
  tobillo_der: 'Tobillo / Pie der.',
}

const TIEMPO_LABELS: Record<LesionTiempo, string> = {
  '1-3m': '1–3 meses',
  '3-6m': '3–6 meses',
  '6-12m': '6–12 meses',
  '+1a':  'Más de 1 año',
}

const GRAVEDAD_CONFIG: Record<LesionGravedad, { color: string; bg: string; label: string }> = {
  leve:     { color: '#32c896', bg: 'rgba(50,200,150,0.15)',  label: 'Leve' },
  moderada: { color: '#ffaa32', bg: 'rgba(255,170,50,0.15)',  label: 'Moderada' },
  severa:   { color: '#ff4444', bg: 'rgba(255,68,68,0.15)',   label: 'Severa' },
}

const EJERCICIOS_COMUNES = [
  // Piernas
  'Sentadilla', 'Sentadilla frontal', 'Sentadilla búlgara', 'Peso muerto', 'Peso muerto rumano',
  'Hip thrust', 'Zancadas / Lunges', 'Leg press', 'Extensión de cuádriceps', 'Curl de piernas',
  'Elevación de talones', 'Step-up', 'Box jumps', 'Saltos pliométricos',
  // Empuje
  'Press de banca', 'Press inclinado', 'Press declinado', 'Aperturas con mancuernas', 'Fondos en paralelas',
  'Press militar', 'Elevaciones laterales', 'Elevaciones frontales', 'Pájaros / Facepull', 'Arnold press',
  // Tracción
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo en máquina', 'Remo con mancuerna',
  'Pull-over', 'Curl de bíceps', 'Curl martillo',
  // Tríceps / Core
  'Extensión de tríceps', 'Press francés', 'Flexiones', 'Plancha', 'Abdominales / Crunches',
  'Elevaciones de piernas', 'Russian twist', 'Rueda abdominal',
  // Cardio / Funcional
  'Burpees', 'Cuerda de batalla', 'Running / Carrera', 'Ciclismo', 'Natación',
  'Remo (ergómetro)', 'Saltar la cuerda', 'Escalador (Mountain climber)',
  // Olímpicos
  'Clean & Jerk', 'Snatch', 'Push press', 'Thruster',
]

const COND_OTRO = 'Otro'

const CONDICIONES_MEDICAS = [
  'Hipertensión (presión alta)',
  'Hipotensión (presión baja)',
  'Diabetes tipo 1',
  'Diabetes tipo 2',
  'Enfermedad cardíaca / Cardiopatía',
  'Asma',
  'EPOC',
  'Escoliosis',
  'Osteoporosis / Osteopenia',
  'Artritis reumatoide',
  'Artrosis',
  'Hernias discales',
  'Hipotiroidismo',
  'Hipertiroidismo',
  'Síndrome metabólico',
  'Apnea del sueño',
  'Fibromialgia',
  'SOP (ovario poliquístico)',
  'Anemia',
  'Epilepsia',
  'Celiaquía',
  'Lupus',
  COND_OTRO,
]

const LUGARES = [
  { id: 'gimnasio_completo', icon: '🏋️', label: 'Gimnasio completo',    desc: 'Máquinas, pesas libres, zonas de cardio — todo disponible' },
  { id: 'gimnasio_basico',   icon: '🔩', label: 'Gimnasio básico',      desc: 'Mancuernas, barras, algo de cardio — lo esencial' },
  { id: 'casa_equipado',     icon: '🏠', label: 'Casa con material',    desc: 'Tengo equipamiento en casa' },
  { id: 'casa_sin',          icon: '🧘', label: 'Casa sin material',    desc: 'Solo mi cuerpo y espacio libre' },
  { id: 'exterior',          icon: '🌳', label: 'Al aire libre',        desc: 'Parque, pista, playa, calle' },
]

const TIPO_BY_LUGAR_ID: Record<string, 'gimnasio' | 'casa' | 'exterior'> = {
  gimnasio_completo: 'gimnasio',
  gimnasio_basico:   'gimnasio',
  casa_equipado:     'casa',
  casa_sin:          'casa',
  exterior:          'exterior',
}

const EQUIPAMIENTO_CATS = [
  {
    cat: 'Pesas y barras',
    items: ['Mancuernas ajustables', 'Mancuernas fijas', 'Barra olímpica + discos', 'Barra corta (EZ)', 'Kettlebell(s)', 'Barra de dominadas'],
  },
  {
    cat: 'Máquinas y accesorios',
    items: ['Banco de pesas', 'Máquina de poleas / Multifuerza', 'TRX / Suspensión', 'Bandas elásticas', 'Balón medicinal', 'Step / Cajón pliométrico', 'Paralelas'],
  },
  {
    cat: 'Cardio y movilidad',
    items: ['Cuerda de saltar', 'Colchoneta / Mat', 'Foam roller', 'Bicicleta estática', 'Cinta de correr', 'Remo (ergómetro)'],
  },
]

const TIEMPO_NORMAL_OPTS = [
  { value: '20-30', label: '20–30 min', sub: 'Sesión corta pero efectiva' },
  { value: '30-45', label: '30–45 min', sub: 'Lo mínimo recomendado' },
  { value: '45-60', label: '45–60 min', sub: 'La duración ideal' },
  { value: '60-90', label: '60–90 min', sub: 'Sesión completa' },
  { value: '90+',   label: '90+ min',   sub: 'Sesión larga, sin prisa' },
]

const TIEMPO_OCUPADO_OPTS = [
  { value: '10-15', label: '10–15 min', sub: 'Microentrenamiento' },
  { value: '15-20', label: '15–20 min', sub: 'Express' },
  { value: '20-30', label: '20–30 min', sub: 'Suficiente para lo esencial' },
  { value: '30-45', label: '30–45 min', sub: 'La mayoría puede con esto' },
]

const HORARIO_OPTS = [
  { value: 'manana',   icon: '🌅', label: 'Mañana',   sub: 'Antes de las 10h' },
  { value: 'mediodia', icon: '☀️', label: 'Mediodía',  sub: '12–15h' },
  { value: 'tarde',    icon: '🌆', label: 'Tarde',     sub: '16–20h' },
  { value: 'noche',    icon: '🌙', label: 'Noche',     sub: 'Después de las 20h' },
]

const OBJETIVOS = [
  { id: 'verse_mejor',     icon: '✨', label: 'Quiero verme mejor',             tagline: 'Composición corporal y estética' },
  { id: 'sentirse_fuerte', icon: '💪', label: 'Quiero sentirme más fuerte',     tagline: 'Ganar fuerza y músculo' },
  { id: 'rendimiento',     icon: '🏆', label: 'Quiero mejorar mi rendimiento',  tagline: 'Velocidad, resistencia, explosividad' },
  { id: 'energia',         icon: '⚡', label: 'Quiero más energía en mi día',   tagline: 'Vitalidad y bienestar diario' },
  { id: 'salud',           icon: '❤️', label: 'Quiero mejorar mi salud',        tagline: 'Prevención y calidad de vida' },
  { id: 'mantener',        icon: '🛡️', label: 'Quiero mantener lo que tengo',   tagline: 'Consistencia y conservación' },
]

const HORIZONTE_OPTS = [
  { value: '4-6w',   label: '4–6 semanas',     sub: 'Quiero ver algo rápido' },
  { value: '3m',     label: '3 meses',          sub: 'Meta a corto plazo' },
  { value: '6m',     label: '6 meses',          sub: 'Transformación real' },
  { value: '1y',     label: '1 año o más',      sub: 'Cambio de estilo de vida' },
  { value: 'evento', label: 'Tengo un evento',  sub: 'Boda, competición, viaje...' },
  { value: 'libre',  label: 'Sin fecha fija',   sub: 'Proceso, no destino' },
]

const ABANDONO_OPTIONS = [
  { id: 'tiempo',       icon: '⏰', label: 'Falta de tiempo',       sub: 'El día a día se come los planes' },
  { id: 'aburrimiento', icon: '😴', label: 'Aburrimiento',          sub: 'Lo mismo una y otra vez' },
  { id: 'lesion',       icon: '🩹', label: 'Lesión',                sub: 'El cuerpo me frenó' },
  { id: 'resultados',   icon: '📉', label: 'No ver resultados',     sub: 'El esfuerzo no se reflejaba' },
  { id: 'no_saber',     icon: '🤷', label: 'No saber qué hacer',    sub: 'Sin guía ni estructura clara' },
  { id: 'motivacion',   icon: '🔋', label: 'Pérdida de motivación', sub: 'El impulso inicial se agotó' },
]

const COACHING_STYLES = [
  {
    id: 'directo' as const,
    icon: '⚡', label: 'Directo y exigente',
    desc: 'Sin rodeos. Me dices exactamente qué hacer y con qué intensidad.',
    color: '#ffaa32', bg: 'rgba(255,170,50,0.1)', border: 'rgba(255,170,50,0.5)',
  },
  {
    id: 'calido' as const,
    icon: '🌱', label: 'Motivacional y cálido',
    desc: 'Me animas, celebras mis avances y me acompañas en los días difíciles.',
    color: '#32c896', bg: 'rgba(50,200,150,0.1)', border: 'rgba(50,200,150,0.5)',
  },
  {
    id: 'tecnico' as const,
    icon: '🔬', label: 'Técnico y explicativo',
    desc: 'Explicas el porqué de cada decisión. Quiero entender, no solo seguir.',
    color: '#6ce5ff', bg: 'rgba(108,229,255,0.1)', border: 'rgba(108,229,255,0.5)',
  },
]

const TIPOS_ENTRENAMIENTO = [
  { id: 'musculacion', icon: '🏋️', label: 'Musculación',        sub: 'Fuerza e hipertrofia' },
  { id: 'running',     icon: '🏃', label: 'Running',            sub: 'Trabajo aeróbico y resistencia' },
  { id: 'libre',       icon: '⚡', label: 'Entrenamiento Libre', sub: 'Sin estructura fija' },
]

const DEPORTES = [
  'Musculación / Fuerza', 'Running / Cardio', 'Movilidad / Flexibilidad', 'HIIT / Funcional',
  'Musculación', 'CrossFit', 'Powerlifting', 'Halterofilia', 'Calistenia', 'Strongman', 'Functional Training',
  'Running', 'Trail Running', 'Maratón', 'Ciclismo de ruta', 'Ciclismo de montaña', 'Triatlón', 'Duatlón',
  'Natación', 'Waterpolo', 'Surf', 'Remo', 'Kayak', 'Vela', 'Nado en aguas abiertas',
  'Fútbol', 'Baloncesto', 'Voleibol', 'Rugby', 'Béisbol', 'Hockey', 'Handball', 'Fútbol americano', 'Ultimate Frisbee', 'Lacrosse',
  'Tenis', 'Pádel', 'Squash', 'Bádminton', 'Tenis de mesa',
  'Boxeo', 'MMA', 'Judo', 'Karate', 'Muay Thai', 'Wrestling', 'Jiu-Jitsu Brasileño', 'Kickboxing', 'Taekwondo', 'Esgrima',
  'Atletismo', 'Velocidad / Sprints', 'Salto de altura', 'Salto de longitud', 'Lanzamiento',
  'Senderismo', 'Escalada en roca', 'Boulder', 'Montañismo', 'Parkour',
  'Yoga', 'Pilates', 'Tai Chi', 'Gimnasia artística', 'Gimnasia rítmica',
  'Danza contemporánea', 'Zumba', 'Baile urbano', 'Pole fitness',
  'Esquí alpino', 'Esquí de fondo', 'Snowboard', 'Patinaje sobre hielo',
  'Golf', 'Equitación', 'Tiro con arco', 'Ciclismo indoor', 'Raquetbol',
]

function formatDate(d: Date) {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function getBlockTitle(screen: ScreenId): string {
  switch (screen) {
    case 'b1_personal':
    case 'b1_ciclo':
    case 'b1_historial':
    case 'b1_sueno':
      return 'Quién eres físicamente'
    case 'b2_lesiones':
    case 'b2_limitaciones':
    case 'b2_historial_medico':
      return 'Tu cuerpo tiene historia'
    case 'b3_lugar':
    case 'b3_equipamiento':
    case 'b3_tiempo_horario':
      return 'Cómo y dónde entrenas'
    case 'b4_objetivo':
    case 'b4_horizonte':
      return 'Lo que quieres lograr'
    case 'b5_abandono':
    case 'b5_coaching':
    case 'b5_entreno':
      return 'Tu relación con el entrenamiento'
    case 'b6_procesando':
    case 'b6_beta':
      return ''
  }
}

// ─── SVG Body Map ─────────────────────────────────────────────────────────────

function BodyMap({
  lesiones,
  editingZona,
  onZonePress,
}: {
  lesiones: Lesion[]
  editingZona: string | null
  onZonePress: (zone: string) => void
}) {
  function zoneFill(id: string) {
    if (editingZona === id) return 'rgba(79,140,255,0.32)'
    const inj = lesiones.find(l => l.zona === id)
    if (!inj) return 'rgba(255,255,255,0.07)'
    return inj.estado === 'activa' ? 'rgba(255,68,68,0.26)' : 'rgba(50,200,150,0.22)'
  }
  function zoneStroke(id: string) {
    if (editingZona === id) return '#4f8cff'
    const inj = lesiones.find(l => l.zona === id)
    if (!inj) return 'rgba(255,255,255,0.14)'
    return inj.estado === 'activa' ? '#ff4444' : '#32c896'
  }
  function dotColor(id: string) {
    const inj = lesiones.find(l => l.zona === id)
    if (!inj) return null
    return inj.estado === 'activa' ? '#ff4444' : '#32c896'
  }
  function press(id: string) { return () => onZonePress(id) }

  // ViewBox: 0 0 180 360  (centered at x=90)
  return (
    <Svg width={160} height={320} viewBox="0 0 180 360">

      {/* ── Decorative body shapes (visual layer) ── */}

      {/* Head */}
      <Circle cx={90} cy={26} r={20} fill={zoneFill('cabeza')} stroke={zoneStroke('cabeza')} strokeWidth={1.2} />
      {/* Neck */}
      <Rect x={82} y={46} width={16} height={13} rx={4} fill={zoneFill('cabeza')} stroke={zoneStroke('cabeza')} strokeWidth={1.2} />

      {/* Left shoulder */}
      <Ellipse cx={57} cy={65} rx={17} ry={10} fill={zoneFill('hombro_izq')} stroke={zoneStroke('hombro_izq')} strokeWidth={1.2} />
      {/* Right shoulder */}
      <Ellipse cx={123} cy={65} rx={17} ry={10} fill={zoneFill('hombro_der')} stroke={zoneStroke('hombro_der')} strokeWidth={1.2} />

      {/* Chest */}
      <Rect x={63} y={57} width={54} height={54} rx={10} fill={zoneFill('pecho')} stroke={zoneStroke('pecho')} strokeWidth={1.2} />
      {/* Abdomen */}
      <Rect x={65} y={111} width={50} height={43} rx={8} fill={zoneFill('abdomen')} stroke={zoneStroke('abdomen')} strokeWidth={1.2} />
      {/* Hips */}
      <Rect x={58} y={153} width={64} height={29} rx={10} fill={zoneFill('cadera')} stroke={zoneStroke('cadera')} strokeWidth={1.2} />

      {/* Left upper arm */}
      <Rect x={38} y={60} width={20} height={52} rx={10} fill={zoneFill('brazo_izq')} stroke={zoneStroke('brazo_izq')} strokeWidth={1.2} />
      {/* Left elbow */}
      <Circle cx={48} cy={117} r={9} fill={zoneFill('brazo_izq')} stroke={zoneStroke('brazo_izq')} strokeWidth={1.2} />
      {/* Left forearm */}
      <Rect x={39} y={125} width={18} height={36} rx={9} fill={zoneFill('brazo_izq')} stroke={zoneStroke('brazo_izq')} strokeWidth={1.2} />
      {/* Left hand */}
      <Rect x={37} y={162} width={22} height={20} rx={7} fill={zoneFill('muneca_izq')} stroke={zoneStroke('muneca_izq')} strokeWidth={1.2} />

      {/* Right upper arm */}
      <Rect x={122} y={60} width={20} height={52} rx={10} fill={zoneFill('brazo_der')} stroke={zoneStroke('brazo_der')} strokeWidth={1.2} />
      {/* Right elbow */}
      <Circle cx={132} cy={117} r={9} fill={zoneFill('brazo_der')} stroke={zoneStroke('brazo_der')} strokeWidth={1.2} />
      {/* Right forearm */}
      <Rect x={123} y={125} width={18} height={36} rx={9} fill={zoneFill('brazo_der')} stroke={zoneStroke('brazo_der')} strokeWidth={1.2} />
      {/* Right hand */}
      <Rect x={121} y={162} width={22} height={20} rx={7} fill={zoneFill('muneca_der')} stroke={zoneStroke('muneca_der')} strokeWidth={1.2} />

      {/* Left thigh */}
      <Rect x={60} y={182} width={26} height={56} rx={9} fill={zoneFill('muslo_izq')} stroke={zoneStroke('muslo_izq')} strokeWidth={1.2} />
      {/* Left knee */}
      <Circle cx={73} cy={243} r={11} fill={zoneFill('rodilla_izq')} stroke={zoneStroke('rodilla_izq')} strokeWidth={1.2} />
      {/* Left calf */}
      <Rect x={62} y={254} width={22} height={48} rx={9} fill={zoneFill('tobillo_izq')} stroke={zoneStroke('tobillo_izq')} strokeWidth={1.2} />
      {/* Left foot */}
      <Rect x={58} y={300} width={28} height={18} rx={7} fill={zoneFill('tobillo_izq')} stroke={zoneStroke('tobillo_izq')} strokeWidth={1.2} />

      {/* Right thigh */}
      <Rect x={94} y={182} width={26} height={56} rx={9} fill={zoneFill('muslo_der')} stroke={zoneStroke('muslo_der')} strokeWidth={1.2} />
      {/* Right knee */}
      <Circle cx={107} cy={243} r={11} fill={zoneFill('rodilla_der')} stroke={zoneStroke('rodilla_der')} strokeWidth={1.2} />
      {/* Right calf */}
      <Rect x={96} y={254} width={22} height={48} rx={9} fill={zoneFill('tobillo_der')} stroke={zoneStroke('tobillo_der')} strokeWidth={1.2} />
      {/* Right foot */}
      <Rect x={94} y={300} width={28} height={18} rx={7} fill={zoneFill('tobillo_der')} stroke={zoneStroke('tobillo_der')} strokeWidth={1.2} />

      {/* ── Injury indicator dots ── */}
      {([
        ['cabeza',      90,  26],
        ['hombro_izq',  55,  65],
        ['hombro_der', 125,  65],
        ['brazo_izq',   48, 100],
        ['brazo_der',  132, 100],
        ['muneca_izq',  48, 172],
        ['muneca_der', 132, 172],
        ['pecho',       90,  84],
        ['abdomen',     90, 132],
        ['cadera',      90, 167],
        ['muslo_izq',   73, 210],
        ['muslo_der',  107, 210],
        ['rodilla_izq', 73, 243],
        ['rodilla_der',107, 243],
        ['tobillo_izq', 73, 278],
        ['tobillo_der',107, 278],
      ] as [string, number, number][]).map(([id, cx, cy]) => {
        const c = dotColor(id)
        return c ? <Circle key={id} cx={cx} cy={cy} r={5} fill={c} opacity={0.9} /> : null
      })}

      {/* ── Touch zones (transparent overlays, drawn last = on top) ── */}

      <Rect x={65} y={57} width={50} height={56} fill="transparent" onPress={press('pecho')} />
      <Rect x={65} y={111} width={50} height={44} fill="transparent" onPress={press('abdomen')} />
      <Rect x={54} y={153} width={72} height={30} fill="transparent" onPress={press('cadera')} />

      <Rect x={56} y={182} width={32} height={64} fill="transparent" onPress={press('muslo_izq')} />
      <Rect x={88} y={182} width={32} height={64} fill="transparent" onPress={press('muslo_der')} />
      <Rect x={56} y={234} width={30} height={24} fill="transparent" onPress={press('rodilla_izq')} />
      <Rect x={90} y={234} width={30} height={24} fill="transparent" onPress={press('rodilla_der')} />
      <Rect x={54} y={252} width={34} height={72} fill="transparent" onPress={press('tobillo_izq')} />
      <Rect x={92} y={252} width={34} height={72} fill="transparent" onPress={press('tobillo_der')} />

      <Rect x={32} y={88} width={32} height={80} fill="transparent" onPress={press('brazo_izq')} />
      <Rect x={116} y={88} width={32} height={80} fill="transparent" onPress={press('brazo_der')} />
      <Rect x={32} y={158} width={32} height={28} fill="transparent" onPress={press('muneca_izq')} />
      <Rect x={116} y={158} width={32} height={28} fill="transparent" onPress={press('muneca_der')} />

      <Rect x={32} y={56} width={36} height={34} fill="transparent" onPress={press('hombro_izq')} />
      <Rect x={112} y={56} width={36} height={34} fill="transparent" onPress={press('hombro_der')} />

      <Rect x={64} y={2} width={52} height={66} fill="transparent" onPress={press('cabeza')} />
    </Svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  // ── Form data ──────────────────────────────────────────────────────────────
  const [data, setData] = useState<FormData>({
    nombre: '', fechaNacimiento: null, sexo: '',
    peso: '', pesoUnit: 'kg', altura: '', alturaUnit: 'cm',
    usaCicloMenstrual: false, frecuenciaHistorica: null, deportes: [],
    calidadSueno: null, lesiones: [],
    ejerciciosEvitar: [], motivoLimitacion: '',
    condicionesMedicas: [], condicionOtra: '', notasMedicas: '',
    lugares: [], equipamiento: [],
    tiempoNormal: null, tiempoOcupado: null,
    horarios: [], diasFijos: null,
    objetivos: [], objetivoSecundario: null, horizonteTemporal: null, motivacion: '',
    razonesAbandono: [], estiloCoaching: null, tiposEntrenamiento: [],
  })

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [screenIndex, setScreenIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Block 1 helpers ────────────────────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempDate, setTempDate] = useState(new Date(2000, 0, 1))
  const [deportesExpanded, setDeportesExpanded] = useState(false)
  const [deportesQuery, setDeportesQuery] = useState('')

  // ── Block 2 — ejercicios evitar ───────────────────────────────────────────
  const [ejerciciosExpanded, setEjerciciosExpanded] = useState(false)
  const [ejerciciosQuery, setEjerciciosQuery] = useState('')

  // ── Block 2 — lesion modal ─────────────────────────────────────────────────
  const [editingZona, setEditingZona] = useState<string | null>(null)
  const [draftEstado, setDraftEstado] = useState<LesionEstado | null>(null)
  const [draftGravedad, setDraftGravedad] = useState<LesionGravedad | null>(null)
  const [draftEspecialista, setDraftEspecialista] = useState(false)
  const [draftTiempo, setDraftTiempo] = useState<LesionTiempo | null>(null)
  const [lesionError, setLesionError] = useState('')

  // ── Block 6 ────────────────────────────────────────────────────────────────
  const [animCount, setAnimCount] = useState(0)
  const [saveComplete, setSaveComplete] = useState(false)

  // ── Screens array ─────────────────────────────────────────────────────────
  const screens = useMemo<ScreenId[]>(() => [
    'b1_personal',
    ...(data.sexo === 'femenino' ? ['b1_ciclo' as ScreenId] : []),
    'b1_historial',
    'b1_sueno',
    'b2_lesiones',
    'b2_limitaciones',
    'b2_historial_medico',
    'b3_lugar',
    'b3_equipamiento',
    'b3_tiempo_horario',
    'b4_objetivo',
    'b4_horizonte',
    'b5_abandono',
    'b5_coaching',
    'b5_entreno',
    'b6_procesando',
    'b6_beta',
  ], [data.sexo])

  const currentScreen = screens[screenIndex]
  const isLast = screenIndex === screens.length - 1
  const progress = (screenIndex + 1) / Math.max(screens.length, 1)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (currentScreen === 'b1_personal') {
      if (!data.nombre.trim()) return 'El nombre es requerido.'
      if (!data.fechaNacimiento) return 'La fecha de nacimiento es requerida.'
      if (!data.sexo) return 'Selecciona tu sexo biológico.'
      const p = Number(data.peso.replace(',', '.'))
      if (!data.peso || isNaN(p) || p <= 0) return 'Ingresa un peso válido.'
      const a = Number(data.altura.replace(',', '.'))
      if (!data.altura || isNaN(a) || a <= 0) return 'Ingresa una altura válida.'
    }
    if (currentScreen === 'b1_historial') {
      if (data.frecuenciaHistorica === null) return 'Selecciona tu frecuencia de entrenamiento.'
    }
    if (currentScreen === 'b1_sueno') {
      if (!data.calidadSueno) return 'Selecciona tu calidad de sueño habitual.'
    }
    if (currentScreen === 'b3_lugar') {
      if (data.lugares.length === 0) return 'Selecciona al menos un lugar de entrenamiento.'
    }
    if (currentScreen === 'b3_tiempo_horario') {
      if (!data.tiempoNormal) return 'Indica cuánto tiempo tienes en un día normal.'
      if (!data.tiempoOcupado) return 'Indica cuánto tiempo tienes en un día ocupado.'
      if (data.horarios.length === 0) return 'Selecciona cuándo sueles entrenar.'
      if (data.diasFijos === null) return 'Indica si tienes días fijos de entrenamiento.'
    }
    if (currentScreen === 'b4_objetivo') {
      if (data.objetivos.length === 0) return 'Elige al menos un objetivo.'
    }
    if (currentScreen === 'b4_horizonte') {
      if (!data.horizonteTemporal) return 'Selecciona un horizonte temporal.'
    }
    if (currentScreen === 'b5_coaching') {
      if (!data.estiloCoaching) return 'Elige cómo quieres que te guíe tu entrenador.'
    }
    return null
  }

  async function goNext() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    if (!isLast) { setScreenIndex(i => i + 1); return }
    await handleSave()
  }

  function goBack() {
    if (screenIndex === 0) { router.back(); return }
    setScreenIndex(i => i - 1)
    setError('')
  }

  async function handleSave() {
    setLoading(true)
    try {
      const pesoNum = Number(data.peso.replace(',', '.'))
      const alturaNum = Number(data.altura.replace(',', '.'))
      const pesoKg = data.pesoUnit === 'lb' ? (pesoNum * 0.453592).toFixed(1) : String(pesoNum)
      const alturaCm = data.alturaUnit === 'ft' ? Math.round(alturaNum * 30.48) : Math.round(alturaNum)

      // Build structured location rows that mirror UserLocation in the backend.
      // Gym locations don't carry the user's personal equipment (their gear comes
      // with the venue); home / outdoor locations inherit the user's kit.
      const lugarLabel = (id: string) => LUGARES.find(l => l.id === id)?.label ?? id
      const lugaresEstructurados = data.lugares.map(id => {
        const tipo = TIPO_BY_LUGAR_ID[id] ?? 'casa'
        return {
          nombre: lugarLabel(id),
          tipo,
          implementos: tipo === 'gimnasio' ? [] : data.equipamiento,
        }
      })

      // Structured injuries — preserve zone laterality (e.g. 'rodilla_izq') so
      // the AI can filter precisely; severidad falls back to 'leve' for resolved
      // injuries that the user marked as superada without a gravedad value.
      const lesionesEstructuradas = data.lesiones.map(l => {
        const partes: string[] = []
        if (l.tiempo)       partes.push(`hace ${TIEMPO_LABELS[l.tiempo].toLowerCase()}`)
        if (l.especialista) partes.push('vio especialista')
        if (l.estado === 'superada') partes.push('superada')
        return {
          zona:        l.zona,
          severidad:   l.gravedad ?? 'leve',
          descripcion: partes.join(', '),
          activa:      l.estado === 'activa',
        }
      })

      await apiPut('/api/profile/', {
        nombre: data.nombre.trim(),
        fecha_nacimiento: data.fechaNacimiento!.toISOString().split('T')[0],
        sexo: data.sexo,
        peso: pesoKg,
        altura: alturaCm,
        usa_ciclo_menstrual: data.usaCicloMenstrual,
        dias_semana: data.frecuenciaHistorica ?? 3,
        experiencia_deportiva: data.deportes.join(', '),
        calidad_sueno_habitual: data.calidadSueno ?? '',
        lesiones: data.lesiones.map(l => {
          const label = ZONE_LABELS[l.zona] ?? l.zona
          const parts: string[] = [label, l.estado]
          if (l.gravedad) parts.push(l.gravedad)
          return parts.join(': ')
        }).join('; '),
        ejercicios_evitar: data.ejerciciosEvitar.join(', '),
        condiciones_medicas: data.condicionesMedicas.flatMap(c => {
          // Si el usuario escribió texto en "Otro", lo emitimos como
          // "Otro: <texto>". Si marcó "Otro" pero no escribió nada, se omite
          // (para no enviar el literal "Otro" sin valor descriptivo).
          if (c !== COND_OTRO) return [c]
          const extra = data.condicionOtra.trim()
          return extra ? [`Otro: ${extra}`] : []
        }),
        notas_medicas: data.notasMedicas.trim(),
        motivo_limitacion: data.motivoLimitacion.trim(),
        horario_preferido: data.horarios.join('/'),
        lugares_entrenamiento: data.lugares,
        implementos_perfil: data.equipamiento,
        duracion_disponible: data.tiempoNormal ? parseInt(data.tiempoNormal) : null,
        duracion_minima: data.tiempoOcupado ? parseInt(data.tiempoOcupado) : null,
        objetivos_multiples: data.objetivos,
        objetivo: data.objetivos[0] ?? '',
        objetivo_secundario: data.objetivoSecundario ?? '',
        horizonte_temporal: data.horizonteTemporal ?? '',
        motivacion: data.motivacion.trim(),
        razones_abandono: data.razonesAbandono,
        estilo_coaching: data.estiloCoaching ?? '',
        tipos_entrenamiento: data.tiposEntrenamiento,
        // Structured rows synced atomically into UserLocation / UserInjury
        lugares_estructurados:   lugaresEstructurados,
        lesiones_estructuradas:  lesionesEstructuradas,
      })

      // Reflect onboarding completion locally so the next cold start doesn't
      // re-route the user back here.
      try {
        const stored = await getUser()
        if (stored) await saveUser({ ...stored, onboarding_completo: true })
      } catch {}

      setSaveComplete(true)
    } catch (e: any) {
      setError(e.message || 'Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Block 6 — variable counter + processing effects ──────────────────────

  function countVariables(): number {
    let n = 5 // nombre, fecha, sexo, peso, altura
    if (data.usaCicloMenstrual) n++
    if (data.frecuenciaHistorica !== null) n++
    n += data.deportes.length
    if (data.calidadSueno) n++
    n += data.lesiones.length
    n += data.ejerciciosEvitar.length
    if (data.motivoLimitacion.trim()) n++
    n += data.condicionesMedicas.length
    n += data.lugares.length
    n += data.equipamiento.length
    if (data.tiempoNormal) n++
    if (data.tiempoOcupado) n++
    n += data.horarios.length
    if (data.diasFijos !== null) n++
    n += data.objetivos.length
    if (data.objetivoSecundario) n++
    if (data.horizonteTemporal) n++
    if (data.motivacion.trim()) n++
    n += data.razonesAbandono.length
    if (data.estiloCoaching) n++
    n += data.tiposEntrenamiento.length
    return Math.max(n, 18)
  }

  useEffect(() => {
    if (currentScreen !== 'b6_procesando') return
    setAnimCount(0)
    setSaveComplete(false)
    const target = countVariables()
    let step = 0
    const totalSteps = 28
    const timer = setInterval(() => {
      step++
      setAnimCount(Math.min(Math.round((step / totalSteps) * target), target))
      if (step >= totalSteps) clearInterval(timer)
    }, 55)
    handleSave()
    return () => clearInterval(timer)
  }, [currentScreen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!saveComplete || currentScreen !== 'b6_procesando') return
    const t = setTimeout(() => setScreenIndex(i => i + 1), 700)
    return () => clearTimeout(t)
  }, [saveComplete, currentScreen])

  // ── Lesion modal handlers ──────────────────────────────────────────────────

  function openLesionModal(zona: string) {
    const existing = data.lesiones.find(l => l.zona === zona)
    setDraftEstado(existing?.estado ?? null)
    setDraftGravedad(existing?.gravedad ?? null)
    setDraftEspecialista(existing?.especialista ?? false)
    setDraftTiempo(existing?.tiempo ?? null)
    setLesionError('')
    setEditingZona(zona)
  }

  function saveLesion() {
    if (!editingZona) return
    if (!draftEstado) { setLesionError('Indica si la lesión está activa o superada.'); return }
    if (draftEstado === 'activa' && !draftGravedad) { setLesionError('Selecciona la gravedad.'); return }
    if (draftEstado === 'superada' && !draftTiempo) { setLesionError('Indica cuánto tiempo ha pasado.'); return }

    const lesion: Lesion = {
      zona: editingZona,
      estado: draftEstado,
      ...(draftEstado === 'activa'
        ? { gravedad: draftGravedad!, especialista: draftEspecialista }
        : { tiempo: draftTiempo! }),
    }
    set('lesiones', [...data.lesiones.filter(l => l.zona !== editingZona), lesion])
    setEditingZona(null)
  }

  function deleteLesion() {
    if (!editingZona) return
    set('lesiones', data.lesiones.filter(l => l.zona !== editingZona))
    setEditingZona(null)
  }

  // ── Block 1: personal data ─────────────────────────────────────────────────

  function renderPersonal() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.contextLine}>
          Para calcular tu gasto energético real y ajustar la intensidad
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NOMBRE</Text>
          <TextInput style={styles.input} placeholder="Tu nombre"
            placeholderTextColor={colors.inkMuted} value={data.nombre}
            onChangeText={v => set('nombre', v)} autoCapitalize="words" autoCorrect={false} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FECHA DE NACIMIENTO</Text>
          <TouchableOpacity style={[styles.input, styles.inputTouch]}
            onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Text style={data.fechaNacimiento ? styles.inputText : styles.inputPlaceholder}>
              {data.fechaNacimiento ? formatDate(data.fechaNacimiento) : 'DD / MM / AAAA'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>SEXO BIOLÓGICO</Text>
          <View style={styles.chipsRow}>
            {(['masculino', 'femenino', 'otro'] as const).map(s => (
              <TouchableOpacity key={s}
                style={[styles.chip, data.sexo === s && styles.chipOn]}
                onPress={() => set('sexo', s)} activeOpacity={0.8}>
                <Text style={[styles.chipText, data.sexo === s && styles.chipTextOn]}>
                  {s === 'masculino' ? 'Hombre' : s === 'femenino' ? 'Mujer' : 'Prefiero no decir'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>PESO</Text>
            <View style={styles.unitToggle}>
              {(['kg', 'lb'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, data.pesoUnit === u && styles.unitBtnOn]}
                  onPress={() => set('pesoUnit', u)}>
                  <Text style={[styles.unitBtnText, data.pesoUnit === u && styles.unitBtnTextOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput style={styles.input}
            placeholder={data.pesoUnit === 'kg' ? 'ej. 75' : 'ej. 165'}
            placeholderTextColor={colors.inkMuted} value={data.peso}
            onChangeText={v => set('peso', v.replace(',', '.'))} keyboardType="decimal-pad" />
        </View>

        <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>ALTURA</Text>
            <View style={styles.unitToggle}>
              {(['cm', 'ft'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, data.alturaUnit === u && styles.unitBtnOn]}
                  onPress={() => set('alturaUnit', u)}>
                  <Text style={[styles.unitBtnText, data.alturaUnit === u && styles.unitBtnTextOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput style={styles.input}
            placeholder={data.alturaUnit === 'cm' ? 'ej. 175' : 'ej. 5.9'}
            placeholderTextColor={colors.inkMuted} value={data.altura}
            onChangeText={v => set('altura', v.replace(',', '.'))} keyboardType="decimal-pad" />
        </View>
      </ScrollView>
    )
  }

  // ── Block 1: ciclo menstrual ───────────────────────────────────────────────

  function renderCiclo() {
    const on = data.usaCicloMenstrual
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>CICLO MENSTRUAL</Text>
        <Text style={styles.cicloDesc}>
          El ciclo menstrual afecta tu fuerza, energía y recuperación de formas muy concretas.
          Si quieres, Zyfit lo integra en tu entrenamiento.
        </Text>

        <TouchableOpacity onPress={() => set('usaCicloMenstrual', !on)} activeOpacity={0.88}>
          <LinearGradient
            colors={on ? [colors.accent, colors.accentDark] : ['transparent', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.cicloCard, !on && styles.cicloCardOff]}>
            <View style={styles.cicloCardRow}>
              <View style={[styles.cicloBox, on && styles.cicloBoxOn]}>
                {on ? <Text style={styles.cicloCheck}>✓</Text> : <View style={styles.cicloBoxInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cicloCardTitle, on && styles.cicloCardTitleOn]}>
                  Sí, quiero que Zyfit considere mi ciclo
                </Text>
                <Text style={[styles.cicloCardSub, on && styles.cicloCardSubOn]}>
                  Lo configuro después desde mi perfil
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.cicloNote}>
          Puedes activarlo o desactivarlo cuando quieras desde tu perfil.
        </Text>
      </ScrollView>
    )
  }

  // ── Block 1: training history ──────────────────────────────────────────────

  function renderHistorial() {
    const filteredDeportes = deportesQuery.length > 1
      ? DEPORTES.filter(d => normalize(d).includes(normalize(deportesQuery)))
      : DEPORTES

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.historialQ}>
          ¿Cuántas veces a la semana has entrenado en los últimos 3 meses?
        </Text>

        {FRECUENCIA_OPTIONS.map(opt => {
          const on = data.frecuenciaHistorica === opt.value
          return (
            <TouchableOpacity key={opt.value}
              style={[styles.freqCard, on && styles.freqCardOn]}
              onPress={() => set('frecuenciaHistorica', opt.value)}
              activeOpacity={0.8}>
              <View style={[styles.freqRadio, on && styles.freqRadioOn]}>
                {on && <View style={styles.freqDot} />}
              </View>
              <View style={styles.freqContent}>
                <Text style={[styles.freqLabel, on && styles.freqLabelOn]}>{opt.label}</Text>
                <Text style={styles.freqSub}>{opt.sublabel}</Text>
              </View>
              <View style={[styles.freqBadge, on && styles.freqBadgeOn]}>
                <Text style={[styles.freqBadgeText, on && styles.freqBadgeTextOn]}>{opt.badge}</Text>
              </View>
            </TouchableOpacity>
          )
        })}

        <View style={styles.deportesSection}>
          <TouchableOpacity style={styles.deportesHeader}
            onPress={() => setDeportesExpanded(e => !e)} activeOpacity={0.8}>
            <View>
              <Text style={styles.deportesLabel}>EJERCICIO FÍSICO QUE REALIZAS</Text>
              {data.deportes.length > 0 && (
                <Text style={styles.deportesCount}>
                  {data.deportes.length} seleccionado{data.deportes.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <Text style={[styles.deportesChevron, deportesExpanded && styles.deportesChevronUp]}>›</Text>
          </TouchableOpacity>

          {data.deportes.length > 0 && (
            <View style={styles.selectedRow}>
              {data.deportes.map(d => (
                <TouchableOpacity key={d} style={styles.selectedChip}
                  onPress={() => set('deportes', data.deportes.filter(x => x !== d))}>
                  <Text style={styles.selectedChipText}>{d}</Text>
                  <Text style={styles.selectedChipX}> ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {deportesExpanded && (
            <View style={styles.deportesDropdown}>
              <TextInput style={styles.deportesSearch} placeholder="Buscar deporte..."
                placeholderTextColor={colors.inkMuted} value={deportesQuery}
                onChangeText={setDeportesQuery} autoCorrect={false} />
              <View style={styles.deportesGrid}>
                {filteredDeportes.map(d => {
                  const selected = data.deportes.includes(d)
                  return (
                    <TouchableOpacity key={d}
                      style={[styles.deporteChip, selected && styles.deporteChipOn]}
                      onPress={() => {
                        if (selected) set('deportes', data.deportes.filter(x => x !== d))
                        else set('deportes', [...data.deportes, d])
                      }}
                      activeOpacity={0.75}>
                      <Text style={[styles.deporteChipText, selected && styles.deporteChipTextOn]}>
                        {selected ? '✓ ' : ''}{d}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    )
  }

  // ── Block 1: sleep quality ─────────────────────────────────────────────────

  function renderSueno() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.suenoQ}>
          ¿Cómo describirías tu calidad de sueño habitualmente?
        </Text>
        <Text style={styles.suenoSub}>
          El sueño es uno de los factores que más impacta tu recuperación y progreso.
        </Text>

        <View style={styles.suenoGrid}>
          {SUENO_OPTIONS.map(opt => {
            const on = data.calidadSueno === opt.value
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.suenoCard, on && styles.suenoCardOn]}
                onPress={() => set('calidadSueno', opt.value)}
                activeOpacity={0.8}>
                <Text style={styles.suenoIcon}>{opt.icon}</Text>
                <Text style={[styles.suenoLabel, on && styles.suenoLabelOn]}>{opt.label}</Text>
                <Text style={styles.suenoSublabel}>{opt.sublabel}</Text>
                {on && <View style={styles.suenoActiveDot} />}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    )
  }

  // ── Block 2: injuries ──────────────────────────────────────────────────────

  function renderLesiones() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.lesionesTitle}>Lesiones activas o pasadas</Text>
        <Text style={styles.lesionesSub}>
          Toca una zona del cuerpo para registrarla. Esto nos permite protegerte.
        </Text>

        {/* Body silhouette */}
        <View style={styles.bodyMapWrap}>
          <BodyMap
            lesiones={data.lesiones}
            editingZona={editingZona}
            onZonePress={openLesionModal}
          />

          {/* Lumbar chip — not visible from front view */}
          <TouchableOpacity
            style={[
              styles.lumbarChip,
              data.lesiones.find(l => l.zona === 'lumbar') && styles.lumbarChipOn,
            ]}
            onPress={() => openLesionModal('lumbar')}
            activeOpacity={0.8}>
            <Text style={[
              styles.lumbarChipText,
              data.lesiones.find(l => l.zona === 'lumbar') && styles.lumbarChipTextOn,
            ]}>
              + Espalda / Lumbar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ff4444' }]} />
            <Text style={styles.legendText}>Activa</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#32c896' }]} />
            <Text style={styles.legendText}>Superada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>Seleccionada</Text>
          </View>
        </View>

        {/* Added injuries list */}
        {data.lesiones.length > 0 && (
          <View style={styles.lesionesListSection}>
            <Text style={styles.lesionesListTitle}>LESIONES REGISTRADAS</Text>
            {data.lesiones.map(l => (
              <TouchableOpacity key={l.zona} style={styles.lesionCard}
                onPress={() => openLesionModal(l.zona)} activeOpacity={0.85}>
                <View style={[styles.lesionStatusBar,
                  { backgroundColor: l.estado === 'activa' ? '#ff4444' : '#32c896' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lesionCardZona}>{ZONE_LABELS[l.zona] ?? l.zona}</Text>
                  <Text style={styles.lesionCardDetail}>
                    {l.estado === 'activa'
                      ? `Activa · ${GRAVEDAD_CONFIG[l.gravedad!].label}${l.especialista ? ' · Vista por especialista' : ''}`
                      : `Superada · hace ${TIEMPO_LABELS[l.tiempo!]}`}
                  </Text>
                </View>
                <Text style={styles.lesionCardEdit}>Editar ›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Skip */}
        {data.lesiones.length === 0 && (
          <Text style={styles.lesionesSkipNote}>
            Sin lesiones que reportar — puedes continuar.
          </Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 2: movement limitations ─────────────────────────────────────────

  function renderLimitaciones() {
    const filtered = ejerciciosQuery.length > 1
      ? EJERCICIOS_COMUNES.filter(e => normalize(e).includes(normalize(ejerciciosQuery)))
      : EJERCICIOS_COMUNES

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.limitTitle}>
          ¿Hay ejercicios que sabes que no puedes hacer?
        </Text>
        <Text style={styles.limitSub}>
          Por lesiones, dolor, limitación de rango de movimiento o simplemente preferencia.
          Tu rutina los evitará por completo.
        </Text>

        {/* Searchable exercise selector */}
        <View style={styles.deportesSection}>
          <TouchableOpacity style={styles.deportesHeader}
            onPress={() => setEjerciciosExpanded(e => !e)} activeOpacity={0.8}>
            <View>
              <Text style={styles.deportesLabel}>EJERCICIOS A EVITAR</Text>
              {data.ejerciciosEvitar.length > 0 && (
                <Text style={styles.deportesCount}>
                  {data.ejerciciosEvitar.length} seleccionado{data.ejerciciosEvitar.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <Text style={[styles.deportesChevron, ejerciciosExpanded && styles.deportesChevronUp]}>›</Text>
          </TouchableOpacity>

          {data.ejerciciosEvitar.length > 0 && (
            <View style={styles.selectedRow}>
              {data.ejerciciosEvitar.map(e => (
                <TouchableOpacity key={e} style={styles.selectedChipRed}
                  onPress={() => set('ejerciciosEvitar', data.ejerciciosEvitar.filter(x => x !== e))}>
                  <Text style={styles.selectedChipRedText}>{e}</Text>
                  <Text style={styles.selectedChipRedX}> ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {ejerciciosExpanded && (
            <View style={styles.deportesDropdown}>
              <TextInput style={styles.deportesSearch} placeholder="Buscar ejercicio..."
                placeholderTextColor={'rgba(255,255,255,0.35)'} value={ejerciciosQuery}
                onChangeText={setEjerciciosQuery} autoCorrect={false} />
              <View style={styles.deportesGrid}>
                {filtered.map(e => {
                  const sel = data.ejerciciosEvitar.includes(e)
                  return (
                    <TouchableOpacity key={e}
                      style={[styles.deporteChip, sel && styles.deporteChipRed]}
                      onPress={() => {
                        if (sel) set('ejerciciosEvitar', data.ejerciciosEvitar.filter(x => x !== e))
                        else set('ejerciciosEvitar', [...data.ejerciciosEvitar, e])
                      }}
                      activeOpacity={0.75}>
                      <Text style={[styles.deporteChipText, sel && styles.deporteChipTextRed]}>
                        {sel ? '✕ ' : ''}{e}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* Reason (shown once at least one exercise is selected) */}
        {data.ejerciciosEvitar.length > 0 && (
          <View style={[styles.fieldGroup, { marginTop: 20 }]}>
            <Text style={styles.fieldLabel}>¿POR QUÉ? (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Ej: dolor de rodilla al cargar, cirugía de hombro hace 6 meses..."
              placeholderTextColor={'rgba(255,255,255,0.35)'}
              value={data.motivoLimitacion}
              onChangeText={v => set('motivoLimitacion', v)}
              multiline
              numberOfLines={3}
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{data.motivoLimitacion.length}/300</Text>
          </View>
        )}

        {data.ejerciciosEvitar.length === 0 && (
          <Text style={styles.skipNote}>Sin limitaciones — puedes continuar.</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 2: medical history ───────────────────────────────────────────────

  function renderHistorialMedico() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>HISTORIAL MÉDICO</Text>
        <Text style={styles.medTitle}>
          ¿Alguna condición que afecte tu entrenamiento?
        </Text>
        <Text style={styles.medSub}>
          Completamente opcional. Solo queremos adaptar tu rutina para que sea segura y efectiva.
          No compartimos esta información.
        </Text>

        {/* Conditions chip grid */}
        <View style={styles.condGrid}>
          {CONDICIONES_MEDICAS.map(c => {
            const on = data.condicionesMedicas.includes(c)
            return (
              <TouchableOpacity key={c}
                style={[styles.condChip, on && styles.condChipOn]}
                onPress={() => {
                  if (on) {
                    set('condicionesMedicas', data.condicionesMedicas.filter(x => x !== c))
                    if (c === COND_OTRO) set('condicionOtra', '')
                  } else {
                    set('condicionesMedicas', [...data.condicionesMedicas, c])
                  }
                }}
                activeOpacity={0.8}>
                {on && <Text style={styles.condCheckmark}>✓ </Text>}
                <Text style={[styles.condChipText, on && styles.condChipTextOn]}>{c}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* "Otro" — campo de texto libre cuando el chip está activo */}
        {data.condicionesMedicas.includes(COND_OTRO) && (
          <View style={[styles.fieldGroup, { marginTop: 18 }]}>
            <Text style={styles.fieldLabel}>ESPECIFICA TU CONDICIÓN</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe brevemente qué condición tienes"
              placeholderTextColor={'rgba(255,255,255,0.35)'}
              value={data.condicionOtra}
              onChangeText={v => set('condicionOtra', v)}
              maxLength={120}
              autoCapitalize="sentences"
            />
            <Text style={styles.charCount}>{data.condicionOtra.length}/120</Text>
          </View>
        )}

        {/* Optional notes */}
        <View style={[styles.fieldGroup, { marginTop: 24 }]}>
          <Text style={styles.fieldLabel}>NOTAS ADICIONALES (OPCIONAL)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Cualquier otra cosa que debamos saber. Breve."
            placeholderTextColor={'rgba(255,255,255,0.35)'}
            value={data.notasMedicas}
            onChangeText={v => set('notasMedicas', v)}
            multiline
            numberOfLines={3}
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{data.notasMedicas.length}/300</Text>
        </View>

        {data.condicionesMedicas.length === 0 && (
          <Text style={styles.skipNote}>Sin condiciones relevantes — puedes continuar.</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 3: location ─────────────────────────────────────────────────────

  function renderLugar() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>¿Dónde entrenas?</Text>
        <Text style={styles.b3Sub}>
          La realidad es mixta. Selecciona todos los que aplican — tu rutina se adaptará.
        </Text>

        {LUGARES.map(loc => {
          const on = data.lugares.includes(loc.id)
          return (
            <TouchableOpacity key={loc.id}
              style={[styles.lugarCard, on && styles.lugarCardOn]}
              onPress={() => {
                if (on) set('lugares', data.lugares.filter(x => x !== loc.id))
                else set('lugares', [...data.lugares, loc.id])
              }}
              activeOpacity={0.8}>
              <Text style={styles.lugarIcon}>{loc.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lugarLabel, on && styles.lugarLabelOn]}>{loc.label}</Text>
                <Text style={styles.lugarDesc}>{loc.desc}</Text>
              </View>
              <View style={[styles.lugarCheck, on && styles.lugarCheckOn]}>
                {on && <Text style={styles.lugarCheckMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  // ── Block 3: equipment ────────────────────────────────────────────────────

  function renderEquipamiento() {
    const sinNada = data.equipamiento.includes('ninguno')

    function toggleEquip(item: string) {
      if (item === 'ninguno') {
        set('equipamiento', sinNada ? [] : ['ninguno'])
      } else {
        const withoutNinguno = data.equipamiento.filter(x => x !== 'ninguno')
        if (withoutNinguno.includes(item))
          set('equipamiento', withoutNinguno.filter(x => x !== item))
        else
          set('equipamiento', [...withoutNinguno, item])
      }
    }

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>¿Con qué equipamiento cuentas?</Text>
        <Text style={styles.b3Sub}>
          Incluye lo que tengas disponible, ya sea en casa o en tu lugar de entrenamiento habitual.
        </Text>

        {/* No equipment toggle */}
        <TouchableOpacity
          style={[styles.ningunCard, sinNada && styles.ningunCardOn]}
          onPress={() => toggleEquip('ninguno')}
          activeOpacity={0.8}>
          <Text style={[styles.ningunLabel, sinNada && styles.ningunLabelOn]}>
            {sinNada ? '✓  ' : ''}Solo mi cuerpo — sin equipamiento
          </Text>
        </TouchableOpacity>

        {/* Equipment categories */}
        {!sinNada && EQUIPAMIENTO_CATS.map(cat => (
          <View key={cat.cat} style={styles.equipCat}>
            <Text style={styles.equipCatLabel}>{cat.cat.toUpperCase()}</Text>
            <View style={styles.deportesGrid}>
              {cat.items.map(item => {
                const sel = data.equipamiento.includes(item)
                return (
                  <TouchableOpacity key={item}
                    style={[styles.deporteChip, sel && styles.deporteChipOn]}
                    onPress={() => toggleEquip(item)}
                    activeOpacity={0.75}>
                    <Text style={[styles.deporteChipText, sel && styles.deporteChipTextOn]}>
                      {sel ? '✓ ' : ''}{item}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {!sinNada && data.equipamiento.length === 0 && (
          <Text style={styles.skipNote}>Sin selección — puedes continuar.</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 3: time + schedule ──────────────────────────────────────────────

  function renderTiempoHorario() {
    function toggleHorario(h: string) {
      if (data.horarios.includes(h)) {
        set('horarios', data.horarios.filter(x => x !== h))
      } else if (data.horarios.length < 2) {
        set('horarios', [...data.horarios, h])
      }
    }

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Section: Normal day */}
        <Text style={styles.tiempoSectionQ}>
          ¿Cuánto tiempo tienes en un día normal?
        </Text>
        <View style={styles.tiempoRow}>
          {TIEMPO_NORMAL_OPTS.map(opt => {
            const on = data.tiempoNormal === opt.value
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.tiempoPill, on && styles.tiempoPillOn]}
                onPress={() => set('tiempoNormal', opt.value)}
                activeOpacity={0.8}>
                <Text style={[styles.tiempoPillLabel, on && styles.tiempoPillLabelOn]}>
                  {opt.label}
                </Text>
                <Text style={[styles.tiempoPillSub, on && styles.tiempoPillSubOn]}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Section: Busy day */}
        <Text style={[styles.tiempoSectionQ, { marginTop: 28 }]}>
          ¿Y en un día ocupado?
        </Text>
        <Text style={styles.tiempoSectionNote}>
          Para rutinas de emergencia cuando el tiempo escasea.
        </Text>
        <View style={styles.tiempoRow}>
          {TIEMPO_OCUPADO_OPTS.map(opt => {
            const on = data.tiempoOcupado === opt.value
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.tiempoPill, on && styles.tiempoPillOn]}
                onPress={() => set('tiempoOcupado', opt.value)}
                activeOpacity={0.8}>
                <Text style={[styles.tiempoPillLabel, on && styles.tiempoPillLabelOn]}>
                  {opt.label}
                </Text>
                <Text style={[styles.tiempoPillSub, on && styles.tiempoPillSubOn]}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Section: Time of day */}
        <Text style={[styles.tiempoSectionQ, { marginTop: 28 }]}>
          ¿Cuándo sueles entrenar?
        </Text>
        <Text style={styles.tiempoSectionNote}>
          Máximo 2 opciones — para notificaciones y check-ins en el momento correcto.
        </Text>
        <View style={styles.horarioGrid}>
          {HORARIO_OPTS.map(opt => {
            const on = data.horarios.includes(opt.value)
            const disabled = !on && data.horarios.length >= 2
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.horarioCard, on && styles.horarioCardOn, disabled && styles.horarioCardDisabled]}
                onPress={() => toggleHorario(opt.value)}
                activeOpacity={0.8}>
                <Text style={styles.horarioIcon}>{opt.icon}</Text>
                <Text style={[styles.horarioLabel, on && styles.horarioLabelOn]}>{opt.label}</Text>
                <Text style={styles.horarioSub}>{opt.sub}</Text>
                {on && <View style={styles.horarioDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Section: Fixed days */}
        <Text style={[styles.tiempoSectionQ, { marginTop: 28 }]}>
          ¿Tienes días fijos de entrenamiento?
        </Text>
        <View style={styles.diasRow}>
          <TouchableOpacity
            style={[styles.diasBtn, data.diasFijos === true && styles.diasBtnOn]}
            onPress={() => set('diasFijos', true)}
            activeOpacity={0.8}>
            <Text style={[styles.diasBtnText, data.diasFijos === true && styles.diasBtnTextOn]}>
              📅  Sí, días fijos
            </Text>
            <Text style={styles.diasBtnSub}>Mismo día cada semana</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diasBtn, data.diasFijos === false && styles.diasBtnOn]}
            onPress={() => set('diasFijos', false)}
            activeOpacity={0.8}>
            <Text style={[styles.diasBtnText, data.diasFijos === false && styles.diasBtnTextOn]}>
              🔄  Varía
            </Text>
            <Text style={styles.diasBtnSub}>Depende de la semana</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  // ── Block 4: main objective ───────────────────────────────────────────────

  function renderObjetivo() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>¿Qué quieres lograr?</Text>
        <Text style={styles.b3Sub}>
          Elige hasta 2 objetivos principales. La rutina los priorizará en cada sesión.
        </Text>

        <View style={styles.objetivosGrid}>
          {OBJETIVOS.map(obj => {
            const on   = data.objetivos.includes(obj.id)
            const full = !on && data.objetivos.length >= 2
            return (
              <TouchableOpacity key={obj.id}
                style={[
                  styles.objetivoCard,
                  on && styles.objetivoCardOn,
                  full && { opacity: 0.35 },
                ]}
                disabled={full}
                onPress={() => {
                  if (on) {
                    set('objetivos', data.objetivos.filter(x => x !== obj.id))
                  } else {
                    if (data.objetivos.length >= 2) {
                      setError('Máximo 2 objetivos principales. Si quieres añadir más, usa el objetivo extra abajo.')
                      return
                    }
                    // if this was the secondary, clear it
                    const wasSecondary = data.objetivoSecundario === obj.id
                    setData(prev => ({
                      ...prev,
                      objetivos: [...prev.objetivos, obj.id],
                      ...(wasSecondary ? { objetivoSecundario: null } : {}),
                    }))
                    setError('')
                  }
                }}
                activeOpacity={0.8}>
                <Text style={styles.objetivoIcon}>{obj.icon}</Text>
                <Text style={[styles.objetivoLabel, on && styles.objetivoLabelOn]}>
                  {obj.label}
                </Text>
                <Text style={styles.objetivoTagline}>{obj.tagline}</Text>
                {on && <View style={styles.objetivoDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.skipNote, { marginTop: 10 }]}>
          {data.objetivos.length} de 2 seleccionados
        </Text>

        {/* Secondary objective — shown once at least one primary is selected */}
        {(() => {
          const remaining = OBJETIVOS.filter(o => !data.objetivos.includes(o.id))
          if (data.objetivos.length === 0 || remaining.length === 0) return null
          return (
            <View style={styles.secundarioSection}>
              <View style={styles.secundarioDivider} />
              <Text style={styles.secundarioQ}>
                ¿Quieres añadir un objetivo extra?
              </Text>
              <Text style={styles.secundarioSub}>
                Sólo uno. Lo tendremos en cuenta sin que compita con tus principales.
              </Text>
              <View style={styles.objetivosGrid}>
                {remaining.map(obj => {
                  const on = data.objetivoSecundario === obj.id
                  return (
                    <TouchableOpacity key={obj.id}
                      style={[styles.objetivoCard, styles.objetivoCardSecundario, on && styles.objetivoCardOn]}
                      onPress={() => set('objetivoSecundario', on ? null : obj.id)}
                      activeOpacity={0.8}>
                      <Text style={styles.objetivoIcon}>{obj.icon}</Text>
                      <Text style={[styles.objetivoLabel, on && styles.objetivoLabelOn]}>
                        {obj.label}
                      </Text>
                      <Text style={styles.objetivoTagline}>{obj.tagline}</Text>
                      {on && <View style={styles.objetivoDot} />}
                    </TouchableOpacity>
                  )
                })}
              </View>
              <Text style={styles.secundarioNote}>Opcional — puedes continuar sin seleccionar.</Text>
            </View>
          )
        })()}
      </ScrollView>
    )
  }

  // ── Block 4: time horizon + motivation ────────────────────────────────────

  function renderHorizonte() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>¿Cuándo quieres ver resultados?</Text>
        <Text style={styles.b3Sub}>
          Sin presión — solo para ajustar la intensidad y ritmo de progresión.
        </Text>

        <View style={styles.horizonteGrid}>
          {HORIZONTE_OPTS.map(opt => {
            const on = data.horizonteTemporal === opt.value
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.horizonteCard, on && styles.horizonteCardOn]}
                onPress={() => set('horizonteTemporal', opt.value)}
                activeOpacity={0.8}>
                <Text style={[styles.horizonteLabel, on && styles.horizonteLabelOn]}>
                  {opt.label}
                </Text>
                <Text style={[styles.horizonteSub, on && styles.horizonteSubOn]}>
                  {opt.sub}
                </Text>
                {on && <View style={styles.horizonteDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Motivation text */}
        <View style={[styles.fieldGroup, { marginTop: 32 }]}>
          <Text style={styles.motivTitle}>
            ¿Hay algo concreto que te está motivando ahora?
          </Text>
          <Text style={styles.motivSub}>
            Un evento, una sensación, una persona. Breve y honesto.
            Esto alimenta tus mensajes de logro personalizados.
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Ej: una boda en agosto, volver a correr sin cansarme, sentirme bien en la playa..."
            placeholderTextColor={'rgba(255,255,255,0.28)'}
            value={data.motivacion}
            onChangeText={v => set('motivacion', v)}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{data.motivacion.length}/200</Text>
        </View>
      </ScrollView>
    )
  }

  // ── Block 6: processing ──────────────────────────────────────────────────────

  function renderProcesando() {
    return (
      <View style={styles.procesandoWrap}>
        {!!error ? (
          <>
            <Text style={styles.procesandoErrorTitle}>Algo salió mal</Text>
            <Text style={styles.procesandoErrorSub}>{error}</Text>
            <TouchableOpacity
              style={styles.procesandoRetryBtn}
              onPress={() => { setError(''); setSaveComplete(false); handleSave() }}
              activeOpacity={0.8}>
              <Text style={styles.procesandoRetryText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.procesandoEyebrow}>CONSTRUYENDO TU PERFIL</Text>
            <Text style={styles.procesandoNum}>{animCount}</Text>
            <Text style={styles.procesandoNumLabel}>variables personalizadas</Text>
            <Text style={styles.procesandoSubText}>
              Calibrando tu entrenamiento con cada dato que nos compartiste.
            </Text>
            <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: 32 }} />
          </>
        )}
      </View>
    )
  }

  // ── Block 6: beta welcome ─────────────────────────────────────────────────────

  function renderBeta() {
    const total = countVariables()
    return (
      <View style={styles.betaWrap}>
        <View style={styles.betaContent}>
          <Text style={styles.betaEyebrow}>PERFIL LISTO</Text>
          <Text style={styles.betaTitle}>
            Tu entrenador{'\n'}ya te conoce.
          </Text>
          <Text style={styles.betaBody}>
            Analizamos{' '}
            <Text style={styles.betaAccent}>{total} variables personalizadas</Text>
            {' '}para construir algo que se adapta a ti — no al revés.
          </Text>

          <View style={styles.betaDivider} />

          <View style={styles.betaTagRow}>
            <View style={styles.betaTag}>
              <Text style={styles.betaTagText}>BETA · ACCESO TEMPRANO</Text>
            </View>
          </View>
          <Text style={styles.betaBetaDesc}>
            Estás entre los primeros en usar PyFit. Tu uso y feedback construyen
            la versión final. Gracias por confiar desde el principio.
          </Text>
        </View>

        <View style={styles.betaFooter}>
          <TouchableOpacity
            style={styles.betaBtnWrap}
            onPress={() => router.replace('/(app)/dashboard')}
            activeOpacity={0.88}>
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.betaBtn}>
              <Text style={styles.betaBtnText}>COMENZAR MI ENTRENAMIENTO</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Block 5: abandonment reasons ─────────────────────────────────────────────

  function renderAbandono() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>¿Qué te ha hecho abandonar antes?</Text>
        <Text style={styles.b3Sub}>
          Sin juicio — esto nos ayuda a anticipar tu punto de quiebre y actuar antes de que llegues a él.
        </Text>

        <View style={styles.abandonoGrid}>
          {ABANDONO_OPTIONS.map(opt => {
            const on = data.razonesAbandono.includes(opt.id)
            return (
              <TouchableOpacity key={opt.id}
                style={[styles.abandonoCard, on && styles.abandonoCardOn]}
                onPress={() => {
                  if (on) set('razonesAbandono', data.razonesAbandono.filter(x => x !== opt.id))
                  else set('razonesAbandono', [...data.razonesAbandono, opt.id])
                }}
                activeOpacity={0.8}>
                <Text style={styles.abandonoIcon}>{opt.icon}</Text>
                <Text style={[styles.abandonoLabel, on && styles.abandonoLabelOn]}>{opt.label}</Text>
                <Text style={styles.abandonoItemSub}>{opt.sub}</Text>
                {on && <View style={styles.abandonoDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {data.razonesAbandono.length === 0 && (
          <Text style={styles.skipNote}>Opcional — puedes continuar sin seleccionar.</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 5: coaching style ───────────────────────────────────────────────────

  function renderCoaching() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>¿Cómo prefieres que te guíe tu entrenador?</Text>
        <Text style={styles.b3Sub}>
          Esto ajusta el tono de cada interacción. Puedes cambiarlo cuando quieras desde tu perfil.
        </Text>

        {COACHING_STYLES.map(style => {
          const on = data.estiloCoaching === style.id
          return (
            <TouchableOpacity key={style.id}
              style={[
                styles.coachingCard,
                on && { backgroundColor: style.bg, borderColor: style.border, borderWidth: 1.5 },
              ]}
              onPress={() => set('estiloCoaching', on ? null : style.id)}
              activeOpacity={0.8}>
              <Text style={styles.coachingIcon}>{style.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.coachingLabel, on && { color: style.color }]}>
                  {style.label}
                </Text>
                <Text style={styles.coachingDesc}>{style.desc}</Text>
              </View>
              <View style={[styles.coachingRadio, on && { borderColor: style.color }]}>
                {on && <View style={[styles.coachingRadioDot, { backgroundColor: style.color }]} />}
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  // ── Block 5: training types ───────────────────────────────────────────────────

  function renderEntreno() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>¿Qué tipos de entrenamiento te interesan?</Text>
        <Text style={styles.b3Sub}>
          Sin jerarquía — todos son igual de válidos. Selecciona los que te llaman.
        </Text>

        <View style={styles.entrenoGrid}>
          {TIPOS_ENTRENAMIENTO.map(tipo => {
            const on = data.tiposEntrenamiento.includes(tipo.id)
            return (
              <TouchableOpacity key={tipo.id}
                style={[styles.entrenoCard, on && styles.entrenoCardOn]}
                onPress={() => {
                  if (on) set('tiposEntrenamiento', data.tiposEntrenamiento.filter(x => x !== tipo.id))
                  else set('tiposEntrenamiento', [...data.tiposEntrenamiento, tipo.id])
                }}
                activeOpacity={0.8}>
                <Text style={styles.entrenoIcon}>{tipo.icon}</Text>
                <Text style={[styles.entrenoLabel, on && styles.entrenoLabelOn]}>{tipo.label}</Text>
                <Text style={styles.entrenoItemSub}>{tipo.sub}</Text>
                {on && <View style={styles.entrenoDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {data.tiposEntrenamiento.length === 0 && (
          <Text style={styles.skipNote}>Opcional — puedes continuar sin seleccionar.</Text>
        )}
      </ScrollView>
    )
  }

  function renderContent() {
    switch (currentScreen) {
      case 'b1_personal':          return renderPersonal()
      case 'b1_ciclo':             return renderCiclo()
      case 'b1_historial':         return renderHistorial()
      case 'b1_sueno':             return renderSueno()
      case 'b2_lesiones':          return renderLesiones()
      case 'b2_limitaciones':      return renderLimitaciones()
      case 'b2_historial_medico':  return renderHistorialMedico()
      case 'b3_lugar':             return renderLugar()
      case 'b3_equipamiento':      return renderEquipamiento()
      case 'b3_tiempo_horario':    return renderTiempoHorario()
      case 'b4_objetivo':          return renderObjetivo()
      case 'b4_horizonte':         return renderHorizonte()
      case 'b5_abandono':          return renderAbandono()
      case 'b5_coaching':          return renderCoaching()
      case 'b5_entreno':           return renderEntreno()
      case 'b6_procesando':        return renderProcesando()
      case 'b6_beta':              return renderBeta()
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      {/* Safe-area spacer + progress bar */}
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>

      {/* Header */}
      {currentScreen !== 'b6_procesando' && currentScreen !== 'b6_beta' && (
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.blockTitle}>{getBlockTitle(currentScreen)}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {renderContent()}

        {currentScreen !== 'b6_procesando' && currentScreen !== 'b6_beta' && (
          <View style={styles.footer}>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <View style={styles.btnRow}>
              {screenIndex > 0 && (
                <TouchableOpacity style={styles.backSecondary} onPress={goBack} activeOpacity={0.8}>
                  <Text style={styles.backSecondaryText}>Atrás</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.nextWrap, screenIndex === 0 && styles.nextWrapFull]}
                onPress={goNext} disabled={loading} activeOpacity={0.88}>
                <LinearGradient colors={[colors.accent, colors.accentDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.nextBtnText}>Continuar</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Date picker */}
      <Modal transparent animationType="slide" visible={showDatePicker}>
        <View style={styles.dateOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
          <View style={styles.dateCard}>
            <View style={styles.dateHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.dateTitle}>Fecha de nacimiento</Text>
              <TouchableOpacity onPress={() => { set('fechaNacimiento', tempDate); setShowDatePicker(false) }}>
                <Text style={styles.dateDone}>Listo</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker value={tempDate} mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { if (d) setTempDate(d) }}
              maximumDate={new Date()} minimumDate={new Date(1930, 0, 1)} />
          </View>
        </View>
      </Modal>

      {/* Lesion modal */}
      <Modal transparent animationType="slide" visible={editingZona !== null}>
        <View style={styles.dateOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditingZona(null)} />
          <View style={styles.lesionSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetZonaLabel}>
              {ZONE_LABELS[editingZona ?? ''] ?? ''}
            </Text>

            {/* Estado */}
            <Text style={styles.sheetSectionLabel}>ESTADO</Text>
            <View style={styles.estadoRow}>
              {(['activa', 'superada'] as const).map(e => (
                <TouchableOpacity key={e}
                  style={[styles.estadoBtn, draftEstado === e && (e === 'activa' ? styles.estadoBtnActiva : styles.estadoBtnSuperada)]}
                  onPress={() => { setDraftEstado(e); setLesionError('') }}
                  activeOpacity={0.8}>
                  <Text style={[styles.estadoBtnText, draftEstado === e && styles.estadoBtnTextOn]}>
                    {e === 'activa' ? '🔴  Activa' : '✅  Superada'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Gravedad (if activa) */}
            {draftEstado === 'activa' && (
              <>
                <Text style={styles.sheetSectionLabel}>GRAVEDAD</Text>
                <View style={styles.gravRow}>
                  {(['leve', 'moderada', 'severa'] as const).map(g => {
                    const cfg = GRAVEDAD_CONFIG[g]
                    const on = draftGravedad === g
                    return (
                      <TouchableOpacity key={g}
                        style={[styles.gravBtn,
                          { borderColor: on ? cfg.color : 'rgba(255,255,255,0.12)',
                            backgroundColor: on ? cfg.bg : 'rgba(255,255,255,0.04)' }]}
                        onPress={() => { setDraftGravedad(g); setLesionError('') }}
                        activeOpacity={0.8}>
                        <Text style={[styles.gravBtnText, { color: on ? cfg.color : 'rgba(255,255,255,0.5)' }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <TouchableOpacity style={styles.especialistaRow}
                  onPress={() => setDraftEspecialista(v => !v)} activeOpacity={0.85}>
                  <View style={[styles.miniCheck, draftEspecialista && styles.miniCheckOn]}>
                    {draftEspecialista && <Text style={styles.miniCheckMark}>✓</Text>}
                  </View>
                  <Text style={styles.especialistaText}>Ya fue evaluada por un especialista</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Tiempo (if superada) */}
            {draftEstado === 'superada' && (
              <>
                <Text style={styles.sheetSectionLabel}>¿HACE CUÁNTO SE SUPERÓ?</Text>
                <View style={styles.tiempoGrid}>
                  {(['1-3m', '3-6m', '6-12m', '+1a'] as const).map(t => {
                    const on = draftTiempo === t
                    return (
                      <TouchableOpacity key={t}
                        style={[styles.tiempoBtn, on && styles.tiempoBtnOn]}
                        onPress={() => { setDraftTiempo(t); setLesionError('') }}
                        activeOpacity={0.8}>
                        <Text style={[styles.tiempoText, on && styles.tiempoTextOn]}>
                          {TIEMPO_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}

            {!!lesionError && (
              <Text style={styles.lesionModalError}>{lesionError}</Text>
            )}

            {/* Sheet buttons */}
            <View style={styles.sheetBtns}>
              {data.lesiones.find(l => l.zona === editingZona) && (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteLesion} activeOpacity={0.8}>
                  <Text style={styles.deleteBtnText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveWrap, !data.lesiones.find(l => l.zona === editingZona) && { flex: 1 }]}
                onPress={saveLesion} activeOpacity={0.88}>
                <LinearGradient colors={[colors.accent, colors.accentDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>
                    {data.lesiones.find(l => l.zona === editingZona) ? 'Actualizar' : 'Agregar lesión'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },

    progressTrack: { height: 3, backgroundColor: c.borderDefault },
    progressFill: { height: 3, backgroundColor: c.accent },

    header: {
      paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20,
      flexDirection: 'row', alignItems: 'center', gap: 16,
    },
    backBtn: { paddingRight: 4 },
    backArrow: { fontSize: 22, color: c.inkSecondary },
    blockTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 21,
      color: c.inkPrimary, letterSpacing: -0.4,
    },

    scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },

    contextLine: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.accent, fontStyle: 'italic', marginBottom: 24, lineHeight: 19,
    },

    fieldGroup: { marginBottom: 20 },
    fieldLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.inkMuted, letterSpacing: 1.2, marginBottom: 8,
    },
    input: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15,
    },
    inputTouch: { justifyContent: 'center' },
    inputText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkPrimary },
    inputPlaceholder: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkMuted },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
    },
    chipOn: { backgroundColor: 'rgba(79,140,255,0.15)', borderColor: c.accent },
    chipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: c.inkSecondary },
    chipTextOn: { color: c.accent },

    labelRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 8,
    },
    unitToggle: { flexDirection: 'row', backgroundColor: c.glassBg, borderRadius: 8, padding: 2 },
    unitBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
    unitBtnOn: { backgroundColor: c.accent },
    unitBtnText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 0.5 },
    unitBtnTextOn: { color: '#ffffff' },

    // Ciclo
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.accent, letterSpacing: 2, marginBottom: 20,
    },
    cicloDesc: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 16,
      color: c.inkSecondary, lineHeight: 25, marginBottom: 28,
    },
    cicloCard: { borderRadius: 18, padding: 22, marginBottom: 16 },
    cicloCardOff: { backgroundColor: c.cardBg, borderWidth: 1.5, borderColor: c.borderBright },
    cicloCardRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    cicloBox: {
      width: 30, height: 30, borderRadius: 9, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    cicloBoxOn: { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.85)' },
    cicloBoxInner: { width: 12, height: 12, borderRadius: 3, backgroundColor: c.borderBright },
    cicloCheck: { color: '#ffffff', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' },
    cicloCardTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary, lineHeight: 21 },
    cicloCardTitleOn: { color: '#ffffff' },
    cicloCardSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginTop: 2 },
    // Subtítulo dentro del gradient accent: subimos opacidad 70→92 para
    // garantizar contraste ≥3:1 sobre el pink accent (#f472b6).
    cicloCardSubOn: { color: 'rgba(255,255,255,0.92)' },
    cicloNote: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, lineHeight: 18 },

    // Historial
    historialQ: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 21,
      color: c.inkPrimary, letterSpacing: -0.3, lineHeight: 30, marginBottom: 24,
    },
    freqCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 10,
    },
    freqCardOn: { backgroundColor: 'rgba(79,140,255,0.08)', borderColor: c.accent },
    freqRadio: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center',
    },
    freqRadioOn: { borderColor: c.accent },
    freqDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
    freqContent: { flex: 1 },
    freqLabel: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary },
    freqLabelOn: { color: c.accent },
    freqSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginTop: 2 },
    freqBadge: { backgroundColor: c.glassBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    freqBadgeOn: { backgroundColor: 'rgba(79,140,255,0.2)' },
    freqBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.inkMuted, letterSpacing: 0.5 },
    freqBadgeTextOn: { color: c.accent },

    deportesSection: {
      marginTop: 20, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, overflow: 'hidden', backgroundColor: c.cardBg,
    },
    deportesHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingVertical: 16,
    },
    deportesLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 1.2 },
    deportesCount: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.accent, marginTop: 3 },
    deportesChevron: { fontSize: 22, color: c.inkMuted, transform: [{ rotate: '90deg' }] },
    deportesChevronUp: { transform: [{ rotate: '-90deg' }] },
    selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 14 },
    selectedChip: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(79,140,255,0.15)', borderWidth: 1, borderColor: c.accent,
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    },
    selectedChipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.accent },
    selectedChipX: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: c.accent, lineHeight: 18 },
    deportesDropdown: {
      borderTopWidth: 1, borderTopColor: c.borderDefault,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    },
    deportesSearch: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, marginBottom: 14,
    },
    deportesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    deporteChip: {
      paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
    },
    deporteChipOn: { backgroundColor: 'rgba(79,140,255,0.15)', borderColor: c.accent },
    deporteChipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkSecondary },
    deporteChipTextOn: { color: c.accent },

    // Sueño
    suenoQ: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      color: c.inkPrimary, letterSpacing: -0.4, lineHeight: 31, marginBottom: 10,
    },
    suenoSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 20, marginBottom: 28,
    },
    suenoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    suenoCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 20, alignItems: 'flex-start', position: 'relative',
    },
    suenoCardOn: { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5 },
    suenoIcon: { fontSize: 30, marginBottom: 12 },
    suenoLabel: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: c.inkPrimary, lineHeight: 20, marginBottom: 6 },
    suenoLabelOn: { color: c.accent },
    suenoSublabel: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, lineHeight: 17 },
    suenoActiveDot: {
      position: 'absolute', top: 14, right: 14,
      width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent,
    },

    // Block 3
    b3Title: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      color: c.inkPrimary, letterSpacing: -0.4, lineHeight: 31, marginBottom: 10,
    },
    b3Sub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 21, marginBottom: 24,
    },

    // Location cards
    lugarCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18, marginBottom: 10,
    },
    lugarCardOn: { backgroundColor: 'rgba(79,140,255,0.09)', borderColor: c.accent, borderWidth: 1.5 },
    lugarIcon: { fontSize: 28, width: 36, textAlign: 'center' },
    lugarLabel: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: c.inkPrimary, marginBottom: 3 },
    lugarLabelOn: { color: c.accent },
    lugarDesc: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, lineHeight: 17 },
    lugarCheck: {
      width: 26, height: 26, borderRadius: 13, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center',
    },
    lugarCheckOn: { backgroundColor: c.accent, borderColor: c.accent },
    lugarCheckMark: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk-Bold' },

    // Equipment
    ningunCard: {
      paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, marginBottom: 20,
      backgroundColor: c.glassBg, borderWidth: 1.5, borderColor: c.borderBright,
      alignItems: 'center',
    },
    ningunCardOn: { backgroundColor: 'rgba(50,200,150,0.1)', borderColor: '#32c896' },
    ningunLabel: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkSecondary },
    ningunLabelOn: { color: '#32c896' },
    equipCat: { marginBottom: 20 },
    equipCatLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.inkMuted, letterSpacing: 1.2, marginBottom: 10,
    },

    // Time range pills
    tiempoSectionQ: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 18,
      color: c.inkPrimary, letterSpacing: -0.3, lineHeight: 26, marginBottom: 6,
    },
    tiempoSectionNote: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkMuted, lineHeight: 19, marginBottom: 14,
    },
    tiempoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    tiempoPill: {
      paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', minWidth: '30%', flex: 1,
    },
    tiempoPillOn: { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5 },
    tiempoPillLabel: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: c.inkPrimary, marginBottom: 2 },
    tiempoPillLabelOn: { color: c.accent },
    tiempoPillSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: c.inkMuted, textAlign: 'center' },
    tiempoPillSubOn: { color: 'rgba(79,140,255,0.7)' },

    // Horario cards (2-column grid)
    horarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    horarioCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, padding: 18, alignItems: 'center', position: 'relative',
    },
    horarioCardOn: { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5 },
    horarioCardDisabled: { opacity: 0.35 },
    horarioIcon: { fontSize: 28, marginBottom: 8 },
    horarioLabel: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: c.inkPrimary, marginBottom: 3 },
    horarioLabelOn: { color: c.accent },
    horarioSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },
    horarioDot: {
      position: 'absolute', top: 12, right: 12,
      width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent,
    },

    // Fixed days
    diasRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    diasBtn: {
      flex: 1, paddingVertical: 16, paddingHorizontal: 14, borderRadius: 16,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center',
    },
    diasBtnOn: { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5 },
    diasBtnText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary, marginBottom: 4 },
    diasBtnTextOn: { color: c.accent },
    diasBtnSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, textAlign: 'center' },

    // Block 4 — objetivo
    objetivosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    objetivoCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 20, alignItems: 'flex-start', position: 'relative',
      minHeight: 120,
    },
    objetivoCardOn: {
      backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5,
    },
    objetivoIcon: { fontSize: 32, marginBottom: 10 },
    objetivoLabel: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 14,
      color: c.inkPrimary, lineHeight: 20, marginBottom: 5,
    },
    objetivoLabelOn: { color: c.accent },
    objetivoTagline: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
      color: c.inkMuted, lineHeight: 16,
    },
    objetivoDot: {
      position: 'absolute', top: 12, right: 12,
      width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent,
    },

    objetivoCardSecundario: { opacity: 0.88 },

    secundarioSection: { marginTop: 4 },
    secundarioDivider: {
      height: 1, backgroundColor: c.borderDefault, marginVertical: 28,
    },
    secundarioQ: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 17,
      color: c.inkPrimary, letterSpacing: -0.3, lineHeight: 25, marginBottom: 6,
    },
    secundarioSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkMuted, lineHeight: 19, marginBottom: 16,
    },
    secundarioNote: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
      color: c.inkFaint, textAlign: 'center', marginTop: 12,
    },

    // Block 4 — horizonte
    horizonteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    horizonteCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, position: 'relative',
    },
    horizonteCardOn: {
      backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5,
    },
    horizonteLabel: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 15,
      color: c.inkPrimary, marginBottom: 4,
    },
    horizonteLabelOn: { color: c.accent },
    horizonteSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },
    horizonteSubOn: { color: 'rgba(79,140,255,0.65)' },
    horizonteDot: {
      position: 'absolute', top: 10, right: 10,
      width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent,
    },
    motivTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 18,
      color: c.inkPrimary, letterSpacing: -0.3, lineHeight: 26, marginBottom: 8,
    },
    motivSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkMuted, lineHeight: 19, marginBottom: 14,
    },

    // Block 2 — limitaciones
    limitTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      color: c.inkPrimary, letterSpacing: -0.4, lineHeight: 31, marginBottom: 10,
    },
    limitSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 21, marginBottom: 24,
    },
    selectedChipRed: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.4)',
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    },
    selectedChipRedText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: '#ff6b6b' },
    selectedChipRedX: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: '#ff6b6b', lineHeight: 18 },
    deporteChipRed: { backgroundColor: 'rgba(255,68,68,0.1)', borderColor: 'rgba(255,68,68,0.4)' },
    deporteChipTextRed: { color: '#ff6b6b' },
    textarea: { minHeight: 90, paddingTop: 14, paddingBottom: 14 },
    charCount: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.inkFaint, textAlign: 'right', marginTop: 4,
    },
    skipNote: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkMuted, textAlign: 'center', marginTop: 20,
    },

    // Block 2 — historial médico
    medTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      color: c.inkPrimary, letterSpacing: -0.4, lineHeight: 31, marginBottom: 10,
    },
    medSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 21, marginBottom: 24,
    },
    condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    condChip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
    },
    condChipOn: { backgroundColor: 'rgba(255,170,50,0.1)', borderColor: '#ffaa32' },
    condCheckmark: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, color: '#ffaa32' },
    condChipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkSecondary },
    condChipTextOn: { color: '#ffaa32' },

    // Block 2 — lesiones
    lesionesTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      color: c.inkPrimary, letterSpacing: -0.4, lineHeight: 30, marginBottom: 8,
    },
    lesionesSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 20, marginBottom: 24,
    },
    bodyMapWrap: { alignItems: 'center', marginBottom: 16 },
    lumbarChip: {
      marginTop: 14,
      paddingHorizontal: 20, paddingVertical: 10,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 20,
    },
    lumbarChipOn: { backgroundColor: 'rgba(255,68,68,0.12)', borderColor: '#ff4444' },
    lumbarChipText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: c.inkSecondary },
    lumbarChipTextOn: { color: '#ff4444' },

    legendRow: {
      flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 24,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },

    lesionesListSection: { marginBottom: 16 },
    lesionesListTitle: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.inkMuted, letterSpacing: 1.2, marginBottom: 12,
    },
    lesionCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, overflow: 'hidden', marginBottom: 8,
    },
    lesionStatusBar: { width: 4, alignSelf: 'stretch' },
    lesionCardZona: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15,
      color: c.inkPrimary, paddingTop: 14, paddingLeft: 14,
    },
    lesionCardDetail: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
      color: c.inkMuted, paddingBottom: 14, paddingLeft: 14, marginTop: 3,
    },
    lesionCardEdit: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 13,
      color: c.accentLight, paddingRight: 14,
    },
    lesionesSkipNote: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      color: c.inkMuted, textAlign: 'center', marginTop: 8, marginBottom: 8,
    },

    // Lesion modal sheet
    lesionSheet: {
      backgroundColor: c.sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      borderWidth: 1, borderColor: c.borderDefault, paddingBottom: 40, paddingHorizontal: 24,
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: c.borderBright, alignSelf: 'center', marginTop: 12, marginBottom: 20,
    },
    sheetZonaLabel: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 20,
      color: c.inkPrimary, letterSpacing: -0.3, marginBottom: 22,
    },
    sheetSectionLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.inkMuted, letterSpacing: 1.2, marginBottom: 10,
    },
    estadoRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
    estadoBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center',
      backgroundColor: c.glassBg, borderWidth: 1.5, borderColor: c.borderBright,
    },
    estadoBtnActiva: { backgroundColor: 'rgba(255,68,68,0.12)', borderColor: '#ff4444' },
    estadoBtnSuperada: { backgroundColor: 'rgba(50,200,150,0.12)', borderColor: '#32c896' },
    estadoBtnText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: c.inkSecondary },
    estadoBtnTextOn: { color: c.inkPrimary },

    gravRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
    gravBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
      borderWidth: 1.5,
    },
    gravBtnText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13 },

    especialistaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
    miniCheck: {
      width: 24, height: 24, borderRadius: 7, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center',
    },
    miniCheckOn: { backgroundColor: 'rgba(79,140,255,0.2)', borderColor: c.accent },
    miniCheckMark: { color: c.accent, fontSize: 13, fontFamily: 'SpaceGrotesk-Bold' },
    especialistaText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: c.inkSecondary, flex: 1 },

    tiempoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
    tiempoBtn: {
      paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
    },
    tiempoBtnOn: { backgroundColor: 'rgba(50,200,150,0.12)', borderColor: '#32c896' },
    tiempoText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: c.inkSecondary },
    tiempoTextOn: { color: '#32c896' },

    lesionModalError: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.red,
      marginBottom: 12,
    },
    sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
    deleteBtn: {
      paddingHorizontal: 20, paddingVertical: 16, borderRadius: 14, alignItems: 'center',
      backgroundColor: 'rgba(255,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.25)',
    },
    deleteBtnText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: c.red },
    saveWrap: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    saveBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: '#ffffff', letterSpacing: 0.2 },

    // Footer
    footer: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.25)', borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
    },
    errorText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.red },
    btnRow: { flexDirection: 'row', gap: 12 },
    backSecondary: {
      flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 14,
    },
    backSecondaryText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkSecondary },
    nextWrap: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    nextWrapFull: { flex: 1 },
    nextBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    nextBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: '#ffffff', letterSpacing: 0.3 },

    // Block 6 — procesando
    procesandoWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 32,
    },
    procesandoEyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.accent, letterSpacing: 2, marginBottom: 28,
    },
    procesandoNum: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 96,
      color: c.accent, letterSpacing: -6, lineHeight: 100,
      marginBottom: 10,
    },
    procesandoNumLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 12,
      color: c.inkMuted, letterSpacing: 0.8, marginBottom: 32,
    },
    procesandoSubText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 15,
      color: c.inkMuted, textAlign: 'center', lineHeight: 24,
    },
    procesandoErrorTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      color: c.inkPrimary, textAlign: 'center', marginBottom: 12,
    },
    procesandoErrorSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.red, textAlign: 'center', lineHeight: 21, marginBottom: 28,
    },
    procesandoRetryBtn: {
      paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
      backgroundColor: 'rgba(79,140,255,0.1)', borderWidth: 1, borderColor: c.accent,
    },
    procesandoRetryText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.accent },

    // Block 6 — beta
    betaWrap: { flex: 1, paddingHorizontal: 28, paddingBottom: 40 },
    betaContent: { flex: 1, justifyContent: 'center' },
    betaEyebrow: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 11,
      color: c.accent, letterSpacing: 2, marginBottom: 22,
    },
    betaTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 40,
      color: c.inkPrimary, letterSpacing: -1.2, lineHeight: 48, marginBottom: 20,
    },
    betaBody: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 17,
      color: c.inkSecondary, lineHeight: 28,
    },
    betaAccent: {
      fontFamily: 'SpaceGrotesk-Bold', color: c.accent,
    },
    betaDivider: {
      height: 1, backgroundColor: c.borderDefault, marginVertical: 28,
    },
    betaTagRow: { flexDirection: 'row', marginBottom: 14 },
    betaTag: {
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
      backgroundColor: 'rgba(79,140,255,0.12)', borderWidth: 1, borderColor: c.accent,
    },
    betaTagText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      color: c.accent, letterSpacing: 1.5,
    },
    betaBetaDesc: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      color: c.inkMuted, lineHeight: 23,
    },
    betaFooter: { paddingTop: 16 },
    betaBtnWrap: { borderRadius: 16, overflow: 'hidden' },
    betaBtn: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
    betaBtnText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 14,
      color: '#ffffff', letterSpacing: 2,
    },

    // Block 5 — abandono
    abandonoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    abandonoCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 18, alignItems: 'flex-start', position: 'relative', minHeight: 110,
    },
    abandonoCardOn: { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5 },
    abandonoIcon: { fontSize: 28, marginBottom: 8 },
    abandonoLabel: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 14,
      color: c.inkPrimary, lineHeight: 19, marginBottom: 4,
    },
    abandonoLabelOn: { color: c.accent },
    abandonoItemSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: c.inkMuted, lineHeight: 16 },
    abandonoDot: {
      position: 'absolute', top: 12, right: 12,
      width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent,
    },

    // Block 5 — coaching
    coachingCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 12,
    },
    coachingIcon: { fontSize: 32, width: 40, textAlign: 'center' },
    coachingLabel: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
      color: c.inkPrimary, marginBottom: 5,
    },
    coachingDesc: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkMuted, lineHeight: 19 },
    coachingRadio: {
      width: 24, height: 24, borderRadius: 12, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    coachingRadioDot: { width: 10, height: 10, borderRadius: 5 },

    // Block 5 — training types
    entrenoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    entrenoCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 20, alignItems: 'flex-start', position: 'relative', minHeight: 110,
    },
    entrenoCardOn: { backgroundColor: 'rgba(79,140,255,0.1)', borderColor: c.accent, borderWidth: 1.5 },
    entrenoIcon: { fontSize: 28, marginBottom: 8 },
    entrenoLabel: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 14,
      color: c.inkPrimary, lineHeight: 19, marginBottom: 4,
    },
    entrenoLabelOn: { color: c.accent },
    entrenoItemSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: c.inkMuted, lineHeight: 16 },
    entrenoDot: {
      position: 'absolute', top: 12, right: 12,
      width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent,
    },

    // Date picker
    dateOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    dateCard: {
      backgroundColor: c.sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderWidth: 1, borderColor: c.borderDefault, paddingBottom: 34,
    },
    dateHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: c.borderDefault,
    },
    dateCancel: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkMuted },
    dateTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary },
    dateDone: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.accent },
  })
}
