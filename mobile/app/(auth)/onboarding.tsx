import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Image,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert,
  PanResponder, BackHandler, AccessibilityInfo, findNodeHandle, Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useTheme } from '../../lib/theme'
import { useTranslation, type ScalarKey } from '../../lib/i18n'
import type { Lang } from '../../lib/translations'
import { Colors, accentAlpha, readableTextOn } from '../../lib/colors'
import { useReduceMotion } from '../../lib/useReduceMotion'
import { apiPut, apiPost, apiDelete, localDateStr } from '../../lib/api'
import { getUser, saveUser, clearTokens, clearUser } from '../../lib/storage'
import { COUNTRIES } from '../../lib/countries'
import { isValidHumanName } from '../../lib/validation'

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
  nota?: string
}

type ScreenId =
  | 'b1_personal' | 'b1_ciclo' | 'b1_historial' | 'b1_frecuencia' | 'b1_actividad' | 'b1_sueno' | 'b1_contexto'
  | 'b2_lesiones' | 'b2_limitaciones' | 'b2_historial_medico'
  | 'b3_lugar' | 'b3_equipamiento' | 'b3_tiempo_horario'
  | 'b4_objetivo' | 'b4_horizonte'
  | 'b5_abandono' | 'b5_coaching' | 'b5_entreno'
  | 'b6_procesando' | 'b6_beta'

type FormData = {
  nombre: string
  fechaNacimiento: Date | null
  pais: string
  sexo: Sexo
  peso: string
  pesoUnit: 'kg' | 'lb'
  altura: string
  alturaUnit: 'cm' | 'ft'
  usaCicloMenstrual: boolean
  experienciaEntrenando: number | null
  frecuenciaHistorica: number | null
  deportes: string[]
  calidadSueno: string | null
  nivelEstres: 'bajo' | 'moderado' | 'alto' | null
  tipoTrabajo: 'sedentario' | 'mixto' | 'activo' | null
  lesiones: Lesion[]
  ejerciciosEvitar: string[]
  motivoLimitacion: string
  condicionesMedicas: string[]
  condicionesBajoTratamiento: string[]
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

// Las constantes de opciones viven a nivel de módulo (fuera del componente) y
// NO tienen acceso al hook useTranslation() — por eso guardan `labelKey`/
// `subKey`/etc. (claves ScalarKey) en vez del texto literal, y cada
// `render*()` (que SÍ está dentro del componente) hace `t(opt.labelKey)` al
// dibujar. `value`/`id`/`icon`/colores se mantienen intactos: son datos, no
// texto — siguen enviándose al backend sin cambios.
const FRECUENCIA_OPTIONS = [
  { labelKey: 'onboarding_freq_0_label',   subKey: 'onboarding_freq_0_sub',   value: 1, badge: '0–1' },
  { labelKey: 'onboarding_freq_1_2_label', subKey: 'onboarding_freq_1_2_sub', value: 2, badge: '1–2' },
  { labelKey: 'onboarding_freq_3_4_label', subKey: 'onboarding_freq_3_4_sub', value: 3, badge: '3–4' },
  { labelKey: 'onboarding_freq_5_6_label', subKey: 'onboarding_freq_5_6_sub', value: 5, badge: '5–6' },
  { labelKey: 'onboarding_freq_7_label',   subKey: 'onboarding_freq_7_sub',   value: 7, badge: '7'   },
] as const

// Tiempo entrenando de forma constante → nivel_experiencia (1–5). Es el insumo
// principal del nivel técnico; el motor lo usa para acotar la complejidad de los
// ejercicios y el prompt para calibrar el volumen.
const EXPERIENCIA_OPTIONS = [
  { value: 1, labelKey: 'onboarding_exp_lt6m_label',  subKey: 'onboarding_exp_lt6m_sub',  badge: '<6m'   },
  { value: 2, labelKey: 'onboarding_exp_6_12m_label', subKey: 'onboarding_exp_6_12m_sub', badge: '6-12m' },
  { value: 3, labelKey: 'onboarding_exp_1_2a_label',  subKey: 'onboarding_exp_1_2a_sub',  badge: '1-2a'  },
  { value: 4, labelKey: 'onboarding_exp_2_5a_label',  subKey: 'onboarding_exp_2_5a_sub',  badge: '2-5a'  },
  { value: 5, labelKey: 'onboarding_exp_5a_label',    subKey: 'onboarding_exp_5a_sub',    badge: '+5a'   },
] as const

const SUENO_OPTIONS = [
  { value: '<6h',  labelKey: 'onboarding_sueno_lt6h_label', subKey: 'onboarding_sueno_lt6h_sub', icon: '😓' },
  { value: '6-7h', labelKey: 'onboarding_sueno_6_7_label',  subKey: 'onboarding_sueno_6_7_sub',  icon: '😐' },
  { value: '7-8h', labelKey: 'onboarding_sueno_7_8_label',  subKey: 'onboarding_sueno_7_8_sub',  icon: '😴' },
  { value: '>8h',  labelKey: 'onboarding_sueno_8h_label',   subKey: 'onboarding_sueno_8h_sub',   icon: '💤' },
] as const

// Zonas del cuerpo: código interno (guardado tal cual en `lesiones`) → clave
// de traducción de su etiqueta. `Object.keys` preserva el orden de inserción.
const ZONE_LABEL_KEYS: Record<string, ScalarKey> = {
  cabeza:      'onboarding_zone_cabeza',
  hombro_izq:  'onboarding_zone_hombro_izq',
  hombro_der:  'onboarding_zone_hombro_der',
  brazo_izq:   'onboarding_zone_brazo_izq',
  brazo_der:   'onboarding_zone_brazo_der',
  muneca_izq:  'onboarding_zone_muneca_izq',
  muneca_der:  'onboarding_zone_muneca_der',
  pecho:       'onboarding_zone_pecho',
  abdomen:     'onboarding_zone_abdomen',
  lumbar:      'onboarding_zone_lumbar',
  cadera:      'onboarding_zone_cadera',
  muslo_izq:   'onboarding_zone_muslo_izq',
  muslo_der:   'onboarding_zone_muslo_der',
  rodilla_izq: 'onboarding_zone_rodilla_izq',
  rodilla_der: 'onboarding_zone_rodilla_der',
  tobillo_izq: 'onboarding_zone_tobillo_izq',
  tobillo_der: 'onboarding_zone_tobillo_der',
}
function zoneLabel(id: string, t: (k: ScalarKey) => string): string {
  const key = ZONE_LABEL_KEYS[id]
  return key ? t(key) : id
}

const TIEMPO_LABEL_KEYS: Record<LesionTiempo, ScalarKey> = {
  '1-3m':  'onboarding_tiempo_1_3m',
  '3-6m':  'onboarding_tiempo_3_6m',
  '6-12m': 'onboarding_tiempo_6_12m',
  '+1a':   'onboarding_tiempo_1a',
}

const GRAVEDAD_CONFIG: Record<LesionGravedad, { color: string; bg: string; labelKey: ScalarKey }> = {
  leve:     { color: '#32c896', bg: 'rgba(50,200,150,0.15)',  labelKey: 'onboarding_grav_leve' },
  moderada: { color: '#ffaa32', bg: 'rgba(255,170,50,0.15)',  labelKey: 'onboarding_grav_moderada' },
  severa:   { color: '#ff4444', bg: 'rgba(255,68,68,0.15)',   labelKey: 'onboarding_grav_severa' },
}

// Valor guardado (español, compatible con el backend) — la etiqueta mostrada
// se traduce por índice vía ta('onboarding_ejercicios_labels') en el
// componente. Ver el comentario equivalente sobre DEPORTES más abajo.
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

// Idem: valor en español (enviado tal cual a condiciones_medicas), etiqueta
// traducida por índice vía ta('onboarding_condiciones_labels').
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
  { id: 'gimnasio_completo', icon: '🏋️', labelKey: 'onboarding_lugar_gimnasio_completo_label', descKey: 'onboarding_lugar_gimnasio_completo_desc' },
  { id: 'gimnasio_basico',   icon: '🔩', labelKey: 'onboarding_lugar_gimnasio_basico_label',   descKey: 'onboarding_lugar_gimnasio_basico_desc' },
  { id: 'casa_equipado',     icon: '🏠', labelKey: 'onboarding_lugar_casa_equipado_label',     descKey: 'onboarding_lugar_casa_equipado_desc' },
  { id: 'casa_sin',          icon: '🧘', labelKey: 'onboarding_lugar_casa_sin_label',          descKey: 'onboarding_lugar_casa_sin_desc' },
  { id: 'exterior',          icon: '🌳', labelKey: 'onboarding_lugar_exterior_label',          descKey: 'onboarding_lugar_exterior_desc' },
] as const

const TIPO_BY_LUGAR_ID: Record<string, 'gimnasio' | 'casa' | 'exterior'> = {
  gimnasio_completo: 'gimnasio',
  gimnasio_basico:   'gimnasio',
  casa_equipado:     'casa',
  casa_sin:          'casa',
  exterior:          'exterior',
}

// items: { value } es el string en español guardado en data.equipamiento y
// usado por EQUIP_LABEL_TO_CATEGORY (abajo) — SIN cambios, solo la etiqueta
// mostrada (`labelKey`) se traduce. Desacoplar value/label evita que traducir
// el equipamiento rompa el mapeo a categorías del motor.
const EQUIPAMIENTO_CATS = [
  {
    catKey: 'onboarding_equip_cat_pesas',
    items: [
      { value: 'Mancuernas fijas',        labelKey: 'onboarding_equip_mancuernas_fijas' },
      { value: 'Barra olímpica + discos', labelKey: 'onboarding_equip_barra_olimpica' },
      { value: 'Barra corta (EZ)',        labelKey: 'onboarding_equip_barra_ez' },
      { value: 'Kettlebell(s)',           labelKey: 'onboarding_equip_kettlebell' },
      { value: 'Barra de dominadas',      labelKey: 'onboarding_equip_barra_dominadas' },
    ],
  },
  {
    catKey: 'onboarding_equip_cat_maquinas',
    items: [
      { value: 'Banco de pesas',                  labelKey: 'onboarding_equip_banco' },
      { value: 'Máquina de poleas / Multifuerza', labelKey: 'onboarding_equip_poleas' },
      { value: 'TRX / Suspensión',                labelKey: 'onboarding_equip_trx' },
      { value: 'Bandas elásticas',                labelKey: 'onboarding_equip_bandas' },
      { value: 'Balón medicinal',                 labelKey: 'onboarding_equip_balon_medicinal' },
      { value: 'Step / Cajón pliométrico',        labelKey: 'onboarding_equip_cajon' },
      { value: 'Paralelas',                       labelKey: 'onboarding_equip_paralelas' },
    ],
  },
  {
    catKey: 'onboarding_equip_cat_cardio',
    items: [
      { value: 'Cuerda de saltar',    labelKey: 'onboarding_equip_cuerda' },
      { value: 'Colchoneta / Mat',    labelKey: 'onboarding_equip_colchoneta' },
      { value: 'Foam roller',         labelKey: 'onboarding_equip_foam_roller' },
      { value: 'Bicicleta estática',  labelKey: 'onboarding_equip_bici' },
      { value: 'Cinta de correr',     labelKey: 'onboarding_equip_cinta' },
      { value: 'Remo (ergómetro)',    labelKey: 'onboarding_equip_remo' },
    ],
  },
] as const

// Mapea las etiquetas específicas de equipamiento del onboarding a las
// CATEGORÍAS que el backend usa para filtrar ejercicios (Exercise.equipamiento).
// Sin esto, 'Mancuernas fijas' no coincide con la categoría 'Mancuernas'
// y el usuario nunca recibe ejercicios de ese implemento.
const EQUIP_LABEL_TO_CATEGORY: Record<string, string> = {
  'Mancuernas fijas':                 'Mancuernas',
  'Barra olímpica + discos':          'Barras',
  'Barra corta (EZ)':                 'Barras',
  'Barra de dominadas':               'Barras',
  'Kettlebell(s)':                    'Kettlebells',
  'Banco de pesas':                   'Máquinas',
  'Máquina de poleas / Multifuerza':  'Máquinas',
  'Paralelas':                        'Máquinas',
  'TRX / Suspensión':                 'TRX',
  'Bandas elásticas':                 'Bandas elásticas',
  'Step / Cajón pliométrico':         'Cajón pliométrico',
}

// El gimnasio trae su propio equipo — el kit personal del usuario no aplica.
// Enviar [] hacía que el motor lo tratara como "solo peso corporal".
const GYM_COMPLETO = ['Mancuernas', 'Barras', 'Máquinas', 'Kettlebells', 'TRX', 'Bandas elásticas', 'Anillas', 'Cajón pliométrico']
const GYM_BASICO   = ['Mancuernas', 'Barras', 'Kettlebells', 'Bandas elásticas']

function mapEquipamientoToCategorias(labels: string[]): string[] {
  // "No sé qué equipo hay disponible" — asumimos el kit básico razonable de
  // un gimnasio, en vez de restringir al usuario a solo peso corporal.
  if (labels.includes('no_se')) return GYM_BASICO
  const out = new Set<string>()
  for (const l of labels) {
    if (l === 'ninguno') continue
    out.add(EQUIP_LABEL_TO_CATEGORY[l] ?? l)
  }
  return [...out]
}

const TIEMPO_NORMAL_OPTS = [
  { value: '20-30', labelKey: 'onboarding_dur_20_30', subKey: 'onboarding_dur_20_30_sub' },
  { value: '30-45', labelKey: 'onboarding_dur_30_45', subKey: 'onboarding_dur_30_45_sub' },
  { value: '45-60', labelKey: 'onboarding_dur_45_60', subKey: 'onboarding_dur_45_60_sub' },
  { value: '60-90', labelKey: 'onboarding_dur_60_90', subKey: 'onboarding_dur_60_90_sub' },
  { value: '90+',   labelKey: 'onboarding_dur_90_plus', subKey: 'onboarding_dur_90_plus_sub' },
] as const

const TIEMPO_OCUPADO_OPTS = [
  { value: '10-15', labelKey: 'onboarding_dur_10_15', subKey: 'onboarding_dur_10_15_sub' },
  { value: '15-20', labelKey: 'onboarding_dur_15_20', subKey: 'onboarding_dur_15_20_sub' },
  { value: '20-30', labelKey: 'onboarding_dur_20_30', subKey: 'onboarding_dur_20_30_busy_sub' },
  { value: '30-45', labelKey: 'onboarding_dur_30_45', subKey: 'onboarding_dur_30_45_busy_sub' },
] as const

const HORARIO_OPTS = [
  { value: 'manana',   icon: '🌅', labelKey: 'onboarding_horario_manana',   subKey: 'onboarding_horario_manana_sub' },
  { value: 'mediodia', icon: '☀️', labelKey: 'onboarding_horario_mediodia', subKey: 'onboarding_horario_mediodia_sub' },
  { value: 'tarde',    icon: '🌆', labelKey: 'onboarding_horario_tarde',    subKey: 'onboarding_horario_tarde_sub' },
  { value: 'noche',    icon: '🌙', labelKey: 'onboarding_horario_noche',    subKey: 'onboarding_horario_noche_sub' },
] as const

const OBJETIVOS = [
  { id: 'verse_mejor',     icon: '✨', labelKey: 'onboarding_obj_verse_mejor_label',     tagKey: 'onboarding_obj_verse_mejor_tag' },
  { id: 'sentirse_fuerte', icon: '💪', labelKey: 'onboarding_obj_sentirse_fuerte_label', tagKey: 'onboarding_obj_sentirse_fuerte_tag' },
  { id: 'rendimiento',     icon: '🏆', labelKey: 'onboarding_obj_rendimiento_label',     tagKey: 'onboarding_obj_rendimiento_tag' },
  { id: 'energia',         icon: '⚡', labelKey: 'onboarding_obj_energia_label',         tagKey: 'onboarding_obj_energia_tag' },
  { id: 'salud',           icon: '❤️', labelKey: 'onboarding_obj_salud_label',           tagKey: 'onboarding_obj_salud_tag' },
  { id: 'mantener',        icon: '🛡️', labelKey: 'onboarding_obj_mantener_label',        tagKey: 'onboarding_obj_mantener_tag' },
] as const

function mapObjetivoToGoal(id: string): string | null {
  const MAP: Record<string, string> = {
    verse_mejor:     'perdida_grasa',
    sentirse_fuerte: 'hipertrofia',
    rendimiento:     'potencia',
    energia:         'salud',
    salud:           'salud',
    mantener:        'hipertrofia',
  }
  return MAP[id] ?? null
}

// El nivel categórico se deriva del tiempo entrenando (nivel_experiencia 1–5).
// `nivel` alimenta el lenguaje de volumen del prompt; `nivel_experiencia` (el
// valor numérico) acota el techo de dificultad técnica en el motor: a menor
// nivel, ejercicios mecánicamente más simples.
function nivelFromExperiencia(exp: number | null): 'principiante' | 'intermedio' | 'avanzado' {
  const e = exp ?? 1
  if (e >= 4) return 'avanzado'
  if (e === 3) return 'intermedio'
  return 'principiante'
}

const HORIZONTE_OPTS = [
  { value: '4-6w',   labelKey: 'onboarding_horiz_4_6w',  subKey: 'onboarding_horiz_4_6w_sub' },
  { value: '3m',     labelKey: 'onboarding_horiz_3m',    subKey: 'onboarding_horiz_3m_sub' },
  { value: '6m',     labelKey: 'onboarding_horiz_6m',    subKey: 'onboarding_horiz_6m_sub' },
  { value: '1y',     labelKey: 'onboarding_horiz_1y',    subKey: 'onboarding_horiz_1y_sub' },
  { value: 'evento', labelKey: 'onboarding_horiz_evento',subKey: 'onboarding_horiz_evento_sub' },
  { value: 'libre',  labelKey: 'onboarding_horiz_libre', subKey: 'onboarding_horiz_libre_sub' },
] as const

const ABANDONO_OPTIONS = [
  { id: 'tiempo',       icon: '⏰', labelKey: 'onboarding_abandono_tiempo_label',       subKey: 'onboarding_abandono_tiempo_sub' },
  { id: 'aburrimiento', icon: '😴', labelKey: 'onboarding_abandono_aburrimiento_label', subKey: 'onboarding_abandono_aburrimiento_sub' },
  { id: 'lesion',       icon: '🩹', labelKey: 'onboarding_abandono_lesion_label',       subKey: 'onboarding_abandono_lesion_sub' },
  { id: 'resultados',   icon: '📉', labelKey: 'onboarding_abandono_resultados_label',   subKey: 'onboarding_abandono_resultados_sub' },
  { id: 'no_saber',     icon: '🤷', labelKey: 'onboarding_abandono_no_saber_label',     subKey: 'onboarding_abandono_no_saber_sub' },
  { id: 'motivacion',   icon: '🔋', labelKey: 'onboarding_abandono_motivacion_label',   subKey: 'onboarding_abandono_motivacion_sub' },
] as const

const COACHING_STYLES = [
  {
    id: 'directo' as const,
    icon: '⚡', labelKey: 'onboarding_coach_directo_label' as const,
    descKey: 'onboarding_coach_directo_desc' as const,
    color: '#ffaa32', bg: 'rgba(255,170,50,0.1)', border: 'rgba(255,170,50,0.5)',
  },
  {
    id: 'calido' as const,
    icon: '🌱', labelKey: 'onboarding_coach_calido_label' as const,
    descKey: 'onboarding_coach_calido_desc' as const,
    color: '#32c896', bg: 'rgba(50,200,150,0.1)', border: 'rgba(50,200,150,0.5)',
  },
  {
    id: 'tecnico' as const,
    icon: '🔬', labelKey: 'onboarding_coach_tecnico_label' as const,
    descKey: 'onboarding_coach_tecnico_desc' as const,
    color: '#6ce5ff', bg: 'rgba(108,229,255,0.1)', border: 'rgba(108,229,255,0.5)',
  },
]

const TIPOS_ENTRENAMIENTO = [
  { id: 'musculacion', icon: '🏋️', labelKey: 'onboarding_entreno_musculacion_label', subKey: 'onboarding_entreno_musculacion_sub' },
  { id: 'running',     icon: '🏃', labelKey: 'onboarding_entreno_running_label',     subKey: 'onboarding_entreno_running_sub' },
  { id: 'ciclismo',    icon: '🚴', labelKey: 'onboarding_entreno_ciclismo_label',    subKey: 'onboarding_entreno_ciclismo_sub' },
  { id: 'libre',       icon: '⚡', labelKey: 'onboarding_entreno_libre_label',       subKey: 'onboarding_entreno_libre_sub' },
] as const

// Valor guardado (español) — etiqueta traducida por índice vía
// ta('onboarding_deportes_labels'). Mismo patrón que EJERCICIOS_COMUNES.
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

// Mapa idioma app → locale de Intl para que la fecha (mes en letras) se vea
// en el idioma elegido, no siempre en español.
const DATE_LOCALES: Record<Lang, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR' }
function formatDate(d: Date, lang: Lang) {
  return d.toLocaleDateString(DATE_LOCALES[lang], { day: '2-digit', month: 'long', year: 'numeric' })
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function getBlockTitle(screen: ScreenId, t: (k: ScalarKey) => string): string {
  switch (screen) {
    case 'b1_personal':
    case 'b1_ciclo':
    case 'b1_historial':
    case 'b1_frecuencia':
    case 'b1_actividad':
    case 'b1_sueno':
    case 'b1_contexto':
      return t('onboarding_block_fisico')
    case 'b2_lesiones':
    case 'b2_limitaciones':
    case 'b2_historial_medico':
      return t('onboarding_block_historia')
    case 'b3_lugar':
    case 'b3_equipamiento':
    case 'b3_tiempo_horario':
      return t('onboarding_block_donde')
    case 'b4_objetivo':
    case 'b4_horizonte':
      return t('onboarding_block_lograr')
    case 'b5_abandono':
    case 'b5_coaching':
    case 'b5_entreno':
      return t('onboarding_block_relacion')
    case 'b6_procesando':
    case 'b6_beta':
      return ''
  }
}

// Etiqueta accesible por zona: nombre + estado de lesión si existe. Compartida
// entre el body map (zonas táctiles pequeñas sobre una imagen, poco fiables
// para lectores de pantalla) y su alternativa en lista de texto plano —
// ambas deben describir la misma zona de la misma forma.
function zoneA11yLabelExternal(id: string, lesiones: Lesion[], t: (k: ScalarKey) => string): string {
  const label = zoneLabel(id, t)
  const inj = lesiones.find(l => l.zona === id)
  if (!inj) return label
  return `${label}, ${inj.estado === 'activa' ? t('onboarding_zone_status_active') : t('onboarding_zone_status_resolved')}`
}

// ─── Anatomical Body Map (imagen real + zonas táctiles por porcentaje) ────────
// Reemplaza el silueta SVG abstracta anterior por las imágenes anatómicas
// reales (mobile/assets/body-frontal.png). Cada zona es un View absoluto
// posicionado en % sobre la imagen — mismo concepto que los <Rect
// fill="transparent"> de antes, pero sobre una <Image> en vez de un <Svg>.
type BodyZoneRect = { id: string; top: number; left: number; width: number; height: number }

const FRONT_BODY_ZONES: BodyZoneRect[] = [
  { id: 'cabeza',      top: 0,    left: 40, width: 20, height: 15.5 },
  { id: 'hombro_izq',  top: 15.5, left: 24, width: 16, height: 9.5 },
  { id: 'hombro_der',  top: 15.5, left: 60, width: 16, height: 9.5 },
  { id: 'pecho',       top: 15.5, left: 36, width: 28, height: 13.5 },
  { id: 'abdomen',     top: 29,   left: 37, width: 26, height: 10 },
  { id: 'cadera',      top: 39,   left: 34, width: 32, height: 6 },
  { id: 'brazo_izq',   top: 17,   left: 8,  width: 26, height: 23 },
  { id: 'brazo_der',   top: 17,   left: 66, width: 26, height: 23 },
  { id: 'muneca_izq',  top: 40,   left: 3,  width: 16, height: 9 },
  { id: 'muneca_der',  top: 40,   left: 81, width: 16, height: 9 },
  { id: 'muslo_izq',   top: 45,   left: 34, width: 15, height: 19 },
  { id: 'muslo_der',   top: 45,   left: 51, width: 15, height: 19 },
  { id: 'rodilla_izq', top: 64,   left: 35, width: 14, height: 6 },
  { id: 'rodilla_der', top: 64,   left: 51, width: 14, height: 6 },
  { id: 'tobillo_izq', top: 70,   left: 35, width: 14, height: 15 },
  { id: 'tobillo_der', top: 70,   left: 51, width: 14, height: 15 },
]

// Solo lumbar: el resto de la espalda no tiene zona propia, se mantiene igual
// que antes (ver comentario en renderLesiones sobre "no visible desde frente").
const BACK_LUMBAR_ZONE: Omit<BodyZoneRect, 'id'> = { top: 30, left: 38, width: 24, height: 9 }

function BodyMap({
  lesiones,
  editingZona,
  onZonePress,
  t,
}: {
  lesiones: Lesion[]
  editingZona: string | null
  onZonePress: (zone: string) => void
  t: (k: ScalarKey) => string
}) {
  const { colors } = useTheme()
  function zoneFill(id: string) {
    if (editingZona === id) return accentAlpha(colors.accent, 0.32)
    const inj = lesiones.find(l => l.zona === id)
    if (!inj) return 'transparent'
    return inj.estado === 'activa' ? 'rgba(255,68,68,0.30)' : 'rgba(50,200,150,0.26)'
  }
  function zoneBorder(id: string) {
    if (editingZona === id) return colors.accent
    const inj = lesiones.find(l => l.zona === id)
    if (!inj) return 'transparent'
    return inj.estado === 'activa' ? '#ff4444' : '#32c896'
  }
  function press(id: string) { return () => onZonePress(id) }
  const zoneA11yLabel = (id: string) => zoneA11yLabelExternal(id, lesiones, t)

  return (
    <View style={{ width: 190, height: 316 }}>
      <Image
        source={require('../../assets/body-frontal.png')}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {FRONT_BODY_ZONES.map(z => (
        <TouchableOpacity
          key={z.id}
          onPress={press(z.id)}
          activeOpacity={0.75}
          accessible
          accessibilityRole="button"
          accessibilityLabel={zoneA11yLabel(z.id)}
          style={{
            position: 'absolute',
            top: `${z.top}%`, left: `${z.left}%`,
            width: `${z.width}%`, height: `${z.height}%`,
            backgroundColor: zoneFill(z.id),
            borderWidth: zoneBorder(z.id) === 'transparent' ? 0 : 1.5,
            borderColor: zoneBorder(z.id),
            borderRadius: 8,
          }}
        />
      ))}
    </View>
  )
}

// Miniatura de la vista trasera — reemplaza el chip de texto plano que
// representaba "lumbar" (zona no visible desde el frente).
function BackLumbarThumb({
  lesiones,
  editingZona,
  onPress,
  t,
}: {
  lesiones: Lesion[]
  editingZona: string | null
  onPress: () => void
  t: (k: ScalarKey) => string
}) {
  const { colors } = useTheme()
  const inj = lesiones.find(l => l.zona === 'lumbar')
  const isEditing = editingZona === 'lumbar'
  const fill = isEditing
    ? accentAlpha(colors.accent, 0.32)
    : inj ? (inj.estado === 'activa' ? 'rgba(255,68,68,0.30)' : 'rgba(50,200,150,0.26)') : 'transparent'
  const border = isEditing
    ? colors.accent
    : inj ? (inj.estado === 'activa' ? '#ff4444' : '#32c896') : colors.borderBright

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={zoneA11yLabelExternal('lumbar', lesiones, t)}
      style={{ width: 76, height: 128 }}>
      <Image
        source={require('../../assets/body-trasero.png')}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={{
        position: 'absolute',
        top: `${BACK_LUMBAR_ZONE.top}%`, left: `${BACK_LUMBAR_ZONE.left}%`,
        width: `${BACK_LUMBAR_ZONE.width}%`, height: `${BACK_LUMBAR_ZONE.height}%`,
        backgroundColor: fill, borderWidth: 1.5, borderColor: border, borderRadius: 6,
      }} />
    </TouchableOpacity>
  )
}

// ─── Duration slider ──────────────────────────────────────────────────────────
// Discrete horizontal slider que reemplaza los cards de "tiempo disponible".
// Mantiene los mismos `value` que las opciones originales ('20-30', '45-60', …)
// para que el mapeo a la base de datos (parseInt → duracion_disponible /
// duracion_minima) siga siendo idéntico.

type DurOpt = { value: string; labelKey: ScalarKey; subKey: ScalarKey }

function DurationSlider({
  opts, value, onChange, styles, t,
}: {
  opts: readonly DurOpt[]
  value: string | null
  onChange: (v: string) => void
  styles: ReturnType<typeof makeStyles>
  t: (k: ScalarKey) => string
}) {
  const [trackW, setTrackW] = useState(0)
  const steps = opts.length
  const idx = Math.max(0, opts.findIndex(o => o.value === value))
  const current = opts[idx] ?? opts[0]
  const currentLabel = t(current.labelKey)
  const currentSub = t(current.subKey)
  const frac = steps > 1 ? idx / (steps - 1) : 0
  const reduceMotion = useReduceMotion()

  // Refs para que el PanResponder (creado una sola vez) lea siempre el estado actual.
  const trackWRef = useRef(trackW)
  trackWRef.current = trackW
  const valueRef = useRef(value)
  valueRef.current = value

  // Anima el thumb/fill entre pasos en vez de saltar de golpe — se nota al
  // arrastrar aunque el valor solo avance de paso en paso (steps discretos).
  const fracAnim = useRef(new Animated.Value(frac)).current
  useEffect(() => {
    Animated.timing(fracAnim, {
      toValue: frac,
      duration: reduceMotion ? 0 : 150,
      useNativeDriver: false,
    }).start()
  }, [frac, reduceMotion, fracAnim])

  const commitFromX = useCallback((x: number) => {
    const w = trackWRef.current
    if (w <= 0 || steps <= 1) return
    const f = Math.max(0, Math.min(1, x / w))
    const newIdx = Math.round(f * (steps - 1))
    const newVal = opts[newIdx].value
    if (newVal !== valueRef.current) {
      onChange(newVal)
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

  // Accesible como control "adjustable": el PanResponder por sí solo es
  // inoperable con VoiceOver/TalkBack (no hay gesto de arrastre estándar en
  // modo lectura). increment/decrement mueven un paso discreto.
  function moveBy(delta: number) {
    const newIdx = Math.max(0, Math.min(steps - 1, idx + delta))
    const newVal = opts[newIdx].value
    if (newVal !== valueRef.current) {
      onChange(newVal)
      Haptics.selectionAsync().catch(() => {})
    }
  }

  return (
    <View style={styles.durSlider}>
      <View style={styles.durValueRow}>
        <Text style={styles.durValueLabel}>{currentLabel}</Text>
        <Text style={styles.durValueSub}>{currentSub}</Text>
      </View>

      <View
        style={styles.durTrackTouch}
        onLayout={e => setTrackW(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${currentLabel}, ${currentSub}`}
        accessibilityValue={{ min: 0, max: steps - 1, now: idx, text: currentLabel }}
        onAccessibilityAction={e => {
          if (e.nativeEvent.actionName === 'increment') moveBy(1)
          else if (e.nativeEvent.actionName === 'decrement') moveBy(-1)
        }}
        {...pan.panHandlers}>
        <View style={styles.durTrack} />
        <Animated.View style={[styles.durTrackFill, { width: Animated.multiply(fracAnim, trackW) }]} />
        {opts.map((o, i) => {
          const on = i <= idx
          const left = trackW * (steps > 1 ? i / (steps - 1) : 0) - 4
          return (
            <View key={o.value} pointerEvents="none"
              style={[styles.durTick, { left }, on && styles.durTickOn]} />
          )
        })}
        <Animated.View pointerEvents="none"
          style={[styles.durThumb, { left: Animated.subtract(Animated.multiply(fracAnim, trackW), 13) }]} />
      </View>

      <View style={styles.durEndsRow}>
        <Text style={styles.durEndLabel}>{t(opts[0].labelKey)}</Text>
        <Text style={styles.durEndLabel}>{t(opts[steps - 1].labelKey)}</Text>
      </View>
    </View>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useTheme()
  const { t, ta, lang } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const reduceMotion = useReduceMotion()

  // Listas grandes (deportes/ejercicios/condiciones): el VALOR guardado sigue
  // siendo el string en español (compatibilidad con el backend, sin cambios
  // de comportamiento); solo la ETIQUETA mostrada se traduce, zipeada por
  // índice con el array original. Calculado aquí (no dentro de un render*())
  // porque los render*() se invocan condicionalmente y no pueden usar hooks.
  const deportesLabels = ta('onboarding_deportes_labels')
  const deportesPairs = useMemo(
    () => DEPORTES.map((value, i) => ({ value, label: deportesLabels[i] ?? value })),
    [deportesLabels],
  )
  const deportesLabelByValue = useMemo(
    () => new Map(deportesPairs.map(p => [p.value, p.label])),
    [deportesPairs],
  )
  const ejerciciosLabels = ta('onboarding_ejercicios_labels')
  const ejerciciosPairs = useMemo(
    () => EJERCICIOS_COMUNES.map((value, i) => ({ value, label: ejerciciosLabels[i] ?? value })),
    [ejerciciosLabels],
  )
  const ejerciciosLabelByValue = useMemo(
    () => new Map(ejerciciosPairs.map(p => [p.value, p.label])),
    [ejerciciosPairs],
  )
  const condicionesLabels = ta('onboarding_condiciones_labels')
  const condicionesPairs = useMemo(
    () => CONDICIONES_MEDICAS.map((value, i) => ({ value, label: condicionesLabels[i] ?? value })),
    [condicionesLabels],
  )

  // ── Form data ──────────────────────────────────────────────────────────────
  const [data, setData] = useState<FormData>({
    nombre: '', fechaNacimiento: null, pais: '', sexo: '',
    peso: '', pesoUnit: 'kg', altura: '', alturaUnit: 'cm',
    usaCicloMenstrual: false, experienciaEntrenando: null, frecuenciaHistorica: null, deportes: [],
    calidadSueno: null, nivelEstres: null, tipoTrabajo: null, lesiones: [],
    ejerciciosEvitar: [], motivoLimitacion: '',
    condicionesMedicas: [], condicionesBajoTratamiento: [], condicionOtra: '', notasMedicas: '',
    lugares: [], equipamiento: [],
    tiempoNormal: '45-60', tiempoOcupado: '20-30',
    horarios: [], diasFijos: null,
    objetivos: [], objetivoSecundario: null, horizonteTemporal: null, motivacion: '',
    razonesAbandono: [], estiloCoaching: null, tiposEntrenamiento: [],
  })

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [screenIndex, setScreenIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const errorRef = useRef<View>(null)

  // Foco de accesibilidad al error de validación al aparecer — sin esto,
  // VoiceOver/TalkBack no anuncian por qué no se pudo avanzar de paso.
  useEffect(() => {
    if (!error) return
    const node = findNodeHandle(errorRef.current)
    if (node) AccessibilityInfo.setAccessibilityFocus(node)
  }, [error])

  // ── Block 1 helpers ────────────────────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempDate, setTempDate] = useState(new Date(2000, 0, 1))
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const [countryQuery, setCountryQuery] = useState('')
  const [deportesExpanded, setDeportesExpanded] = useState(false)
  const [deportesQuery, setDeportesQuery] = useState('')

  // ── Block 2 — ejercicios evitar ───────────────────────────────────────────
  const [ejerciciosExpanded, setEjerciciosExpanded] = useState(false)
  const [ejerciciosQuery, setEjerciciosQuery] = useState('')

  // ── Block 2 — condiciones médicas: buscador con autocompletado ───────────
  const [condExpanded, setCondExpanded] = useState(false)
  const [condQuery, setCondQuery] = useState('')

  // ── Block 2 — lesiones: alternativa accesible al body map ─────────────────
  // El body map tiene zonas táctiles pequeñas sobre una imagen — poco fiable
  // para lectores de pantalla en algunas versiones. Esta lista en texto plano
  // cubre las mismas 17 zonas con controles RN normales.
  const [zonesListOpen, setZonesListOpen] = useState(false)

  // ── Block 2 — lesion modal ─────────────────────────────────────────────────
  const [editingZona, setEditingZona] = useState<string | null>(null)
  const [draftEstado, setDraftEstado] = useState<LesionEstado | null>(null)
  const [draftGravedad, setDraftGravedad] = useState<LesionGravedad | null>(null)
  const [draftEspecialista, setDraftEspecialista] = useState(false)
  const [draftTiempo, setDraftTiempo] = useState<LesionTiempo | null>(null)
  const [draftNota, setDraftNota] = useState('')
  const [lesionError, setLesionError] = useState('')
  const lesionErrorRef = useRef<Text>(null)

  useEffect(() => {
    if (!lesionError) return
    const node = findNodeHandle(lesionErrorRef.current)
    if (node) AccessibilityInfo.setAccessibilityFocus(node)
  }, [lesionError])

  // ── Block 6 ────────────────────────────────────────────────────────────────
  const [animCount, setAnimCount] = useState(0)
  const [saveComplete, setSaveComplete] = useState(false)
  const betaFade = useRef(new Animated.Value(0)).current

  // ── Screens array ─────────────────────────────────────────────────────────
  const screens = useMemo<ScreenId[]>(() => [
    'b1_personal',
    ...(data.sexo === 'femenino' ? ['b1_ciclo' as ScreenId] : []),
    'b1_historial',
    'b1_frecuencia',
    'b1_actividad',
    'b1_sueno',
    'b1_contexto',
    'b2_lesiones',
    'b2_limitaciones',
    'b2_historial_medico',
    'b3_lugar',
    ...(data.lugares.includes('casa_equipado') || data.lugares.includes('gimnasio_basico')
      ? ['b3_equipamiento' as ScreenId] : []),
    'b3_tiempo_horario',
    'b4_objetivo',
    'b4_horizonte',
    'b5_abandono',
    'b5_coaching',
    'b5_entreno',
    'b6_procesando',
    'b6_beta',
  ], [data.sexo, data.lugares])

  const currentScreen = screens[screenIndex]
  const isLast = screenIndex === screens.length - 1
  const progress = (screenIndex + 1) / Math.max(screens.length, 1)

  const filteredCountries = useMemo(() => {
    const q = normalize(countryQuery.trim())
    if (!q) return COUNTRIES
    return COUNTRIES.filter(cn => normalize(cn).includes(q))
  }, [countryQuery])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (currentScreen === 'b1_personal') {
      if (!data.nombre.trim()) return t('onboarding_name_error')
      if (!isValidHumanName(data.nombre)) return t('onboarding_name_invalid_error')
      if (!data.fechaNacimiento) return t('onboarding_birth_error')
      if (!data.pais) return t('onboarding_err_country')
      if (!data.sexo) return t('onboarding_err_sex')
      const p = Number(data.peso.replace(',', '.'))
      if (!data.peso || isNaN(p) || p <= 0) return t('onboarding_weight_error')
      const pesoKgVal = data.pesoUnit === 'lb' ? p * 0.453592 : p
      if (pesoKgVal < 30 || pesoKgVal > 300) return t('onboarding_err_weight_range')
      const a = Number(data.altura.replace(',', '.'))
      if (!data.altura || isNaN(a) || a <= 0) return t('onboarding_height_error')
      const alturaCmVal = data.alturaUnit === 'ft' ? a * 30.48 : a
      if (alturaCmVal < 100 || alturaCmVal > 250) return t('onboarding_err_height_range')
    }
    if (currentScreen === 'b1_historial') {
      if (data.experienciaEntrenando === null) return t('onboarding_err_experience')
    }
    if (currentScreen === 'b1_frecuencia') {
      if (data.frecuenciaHistorica === null) return t('onboarding_err_frequency')
    }
    if (currentScreen === 'b1_sueno') {
      if (!data.calidadSueno) return t('onboarding_err_sleep')
    }
    if (currentScreen === 'b1_contexto') {
      if (!data.nivelEstres) return t('onboarding_err_stress')
      if (!data.tipoTrabajo) return t('onboarding_err_worktype')
    }
    if (currentScreen === 'b3_lugar') {
      if (data.lugares.length === 0) return t('onboarding_err_location')
    }
    if (currentScreen === 'b3_tiempo_horario') {
      if (!data.tiempoNormal) return t('onboarding_err_time_normal')
      if (!data.tiempoOcupado) return t('onboarding_err_time_busy')
      if (data.horarios.length === 0) return t('onboarding_err_schedule')
      if (data.diasFijos === null) return t('onboarding_err_fixed_days')
    }
    if (currentScreen === 'b4_objetivo') {
      if (data.objetivos.length === 0) return t('onboarding_err_goal')
    }
    if (currentScreen === 'b4_horizonte') {
      if (!data.horizonteTemporal) return t('onboarding_err_horizon')
    }
    if (currentScreen === 'b5_coaching') {
      if (!data.estiloCoaching) return t('onboarding_err_coaching')
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
    if (screenIndex === 0) { confirmCancelRegistration(); return }
    setScreenIndex(i => i - 1)
    setError('')
  }

  // Retroceder desde el primer paso ya no borra la cuenta por defecto — antes
  // lo hacía siempre, y era demasiado agresivo para alguien que solo quería
  // salir un momento. Ahora se puede salir dejando la cuenta pendiente de
  // completar (se retoma el onboarding en el próximo login) o, si de verdad
  // quiere irse sin dejar rastro, eliminarla por completo.
  function confirmCancelRegistration() {
    if (cancelling) return
    Alert.alert(
      t('onboarding_alert_cancel_title'),
      t('onboarding_alert_cancel_message'),
      [
        { text: t('onboarding_alert_stay'), style: 'cancel' },
        { text: t('onboarding_alert_leave_for_now'), onPress: exitKeepingAccount },
        { text: t('onboarding_alert_delete_account'), style: 'destructive', onPress: confirmDeleteAccount },
      ],
    )
  }

  async function exitKeepingAccount() {
    await clearTokens()
    await clearUser()
    router.replace('/(auth)/login')
  }

  function confirmDeleteAccount() {
    Alert.alert(
      t('onboarding_alert_delete_title'),
      t('onboarding_alert_delete_message'),
      [
        { text: t('onboarding_alert_keep_it'), style: 'cancel' },
        { text: t('onboarding_alert_yes_delete'), style: 'destructive', onPress: cancelRegistration },
      ],
    )
  }

  async function cancelRegistration() {
    if (cancelling) return
    setCancelling(true)
    try {
      // Borra la cuenta + todos sus datos asociados (cascada en el backend).
      await apiDelete('/api/auth/account/')
    } catch {
      // El borrado falló (red caída, error del servidor). Avisar al usuario para
      // que no intente registrarse de nuevo con el mismo email sin soporte.
      setCancelling(false)
      Alert.alert(
        t('onboarding_alert_delete_fail_title'),
        t('onboarding_alert_delete_fail_msg'),
        [
          {
            text: t('onboarding_alert_leave_anyway'),
            style: 'destructive',
            onPress: async () => {
              await clearTokens()
              await clearUser()
              router.replace('/(auth)/login')
            },
          },
          { text: t('onboarding_cancel'), style: 'cancel' },
        ]
      )
      return
    }
    await clearTokens()
    await clearUser()
    router.replace('/(auth)/login')
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
      const lugarLabel = (id: string) => {
        const l = LUGARES.find(l => l.id === id)
        return l ? t(l.labelKey) : id
      }
      const equipMapeado = mapEquipamientoToCategorias(data.equipamiento)
      const lugaresEstructurados = data.lugares.map(id => {
        const tipo = TIPO_BY_LUGAR_ID[id] ?? 'casa'
        // El gimnasio aporta el catálogo completo de su tipo; "casa sin material"
        // es solo peso corporal; el resto hereda el kit (mapeado a categorías).
        let implementos: string[]
        if (id === 'gimnasio_completo')    implementos = GYM_COMPLETO
        else if (id === 'gimnasio_basico') implementos = GYM_BASICO
        else if (id === 'casa_sin')        implementos = []
        else                               implementos = equipMapeado
        return { nombre: lugarLabel(id), tipo, implementos }
      })

      // Structured injuries — preserve zone laterality (e.g. 'rodilla_izq') so
      // the AI can filter precisely; severidad falls back to 'leve' for resolved
      // injuries that the user marked as superada without a gravedad value.
      const lesionesEstructuradas = data.lesiones.map(l => {
        const partes: string[] = []
        if (l.nota)         partes.push(l.nota)
        if (l.tiempo)       partes.push(`hace ${t(TIEMPO_LABEL_KEYS[l.tiempo]).toLowerCase()}`)
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
        fecha_nacimiento: localDateStr(data.fechaNacimiento!),
        pais: data.pais,
        sexo: data.sexo,
        peso: pesoKg,
        altura: alturaCm,
        usa_ciclo_menstrual: data.usaCicloMenstrual,
        dias_semana: data.frecuenciaHistorica ?? 3,
        dias_fijos: data.diasFijos,
        nivel: nivelFromExperiencia(data.experienciaEntrenando),
        nivel_experiencia: data.experienciaEntrenando,
        nivel_estres: data.nivelEstres ?? '',
        tipo_trabajo: data.tipoTrabajo ?? '',
        experiencia_deportiva: data.deportes.join(', '),
        calidad_sueno_habitual: data.calidadSueno ?? '',
        lesiones: data.lesiones.map(l => {
          const label = zoneLabel(l.zona, t)
          const parts: string[] = [label, l.estado]
          if (l.gravedad) parts.push(l.gravedad)
          return parts.join(': ')
        }).join('; '),
        ejercicios_evitar: data.ejerciciosEvitar.join(', '),
        condiciones_medicas: data.condicionesMedicas.flatMap(c => {
          // Si el usuario escribió texto en "Otro", lo emitimos como
          // "Otro: <texto>". Si marcó "Otro" pero no escribió nada, se omite
          // (para no enviar el literal "Otro" sin valor descriptivo).
          const enTratamiento = data.condicionesBajoTratamiento.includes(c)
          if (c !== COND_OTRO) return [enTratamiento ? `${c} (en tratamiento)` : c]
          const extra = data.condicionOtra.trim()
          if (!extra) return []
          return [enTratamiento ? `Otro: ${extra} (en tratamiento)` : `Otro: ${extra}`]
        }),
        notas_medicas: data.notasMedicas.trim(),
        motivo_limitacion: data.motivoLimitacion.trim(),
        horario_preferido: data.horarios.join('/'),
        lugares_entrenamiento: data.lugares,
        implementos_perfil: equipMapeado,
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

      // Initialize periodization cycle based on primary objective — fire and
      // forget so a backend hiccup never blocks onboarding completion.
      const primaryGoal = mapObjetivoToGoal(data.objetivos[0])
      if (primaryGoal) {
        apiPost('/api/training-cycle/', { goal: primaryGoal }).catch(() => {})
      }

      // Reflect onboarding completion locally so the next cold start doesn't
      // re-route the user back here.
      try {
        const stored = await getUser()
        if (stored) await saveUser({ ...stored, onboarding_completo: true })
      } catch {}

      setSaveComplete(true)
    } catch (e: any) {
      setError(e.message || t('onboarding_error_saving'))
    } finally {
      setLoading(false)
    }
  }

  // ── Block 6 — variable counter + processing effects ──────────────────────

  function countVariables(): number {
    let n = 5 // nombre, fecha, sexo, peso, altura
    if (data.pais) n++
    if (data.usaCicloMenstrual) n++
    if (data.experienciaEntrenando !== null) n++
    if (data.frecuenciaHistorica !== null) n++
    n += data.deportes.length
    if (data.calidadSueno) n++
    if (data.nivelEstres) n++
    if (data.tipoTrabajo) n++
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

  // Fade-in leve de "Perfil Listo" — evita que los textos aparezcan de golpe.
  useEffect(() => {
    if (currentScreen !== 'b6_beta') return
    betaFade.setValue(0)
    Animated.timing(betaFade, {
      toValue: 1,
      duration: reduceMotion ? 0 : 500,
      useNativeDriver: true,
    }).start()
  }, [currentScreen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bloquear el back físico de Android mientras se guarda el perfil. Sin esto,
  // un back mid-save retrocede al paso anterior con la petición todavía en vuelo
  // y al completarse intenta avanzar desde un screenIndex incorrecto.
  useEffect(() => {
    if (currentScreen !== 'b6_procesando') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [currentScreen])

  // ── Lesion modal handlers ──────────────────────────────────────────────────

  function openLesionModal(zona: string) {
    const existing = data.lesiones.find(l => l.zona === zona)
    setDraftEstado(existing?.estado ?? null)
    setDraftGravedad(existing?.gravedad ?? null)
    setDraftEspecialista(existing?.especialista ?? false)
    setDraftTiempo(existing?.tiempo ?? null)
    setDraftNota(existing?.nota ?? '')
    setLesionError('')
    setEditingZona(zona)
  }

  function saveLesion() {
    if (!editingZona) return
    if (!draftEstado) { setLesionError(t('onboarding_err_lesion_estado')); return }
    if (draftEstado === 'activa' && !draftGravedad) { setLesionError(t('onboarding_err_lesion_gravedad')); return }
    if (draftEstado === 'superada' && !draftTiempo) { setLesionError(t('onboarding_err_lesion_tiempo')); return }

    const notaTrim = draftNota.trim()
    const lesion: Lesion = {
      zona: editingZona,
      estado: draftEstado,
      ...(draftEstado === 'activa'
        ? { gravedad: draftGravedad!, especialista: draftEspecialista }
        : { tiempo: draftTiempo! }),
      ...(notaTrim ? { nota: notaTrim } : {}),
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

        <Text style={styles.contextLine}>{t('onboarding_b1_context')}</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('onboarding_name_label')}</Text>
          <TextInput style={styles.input} placeholder={t('onboarding_name_placeholder')}
            placeholderTextColor={colors.inkMuted} value={data.nombre}
            onChangeText={v => set('nombre', v)} autoCapitalize="words" autoCorrect={false} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('onboarding_birth_label')}</Text>
          <TouchableOpacity style={[styles.input, styles.inputTouch]}
            onPress={() => setShowDatePicker(true)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityLabel={t('onboarding_birth_label')}
            accessibilityValue={{ text: data.fechaNacimiento ? formatDate(data.fechaNacimiento, lang) : undefined }}>
            <Text style={data.fechaNacimiento ? styles.inputText : styles.inputPlaceholder}>
              {data.fechaNacimiento ? formatDate(data.fechaNacimiento, lang) : t('onboarding_date_placeholder')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('onboarding_country_label')}</Text>
          <TouchableOpacity style={[styles.input, styles.inputTouch]}
            onPress={() => { setCountryQuery(''); setShowCountryPicker(true) }} activeOpacity={0.8}
            accessibilityRole="button" accessibilityLabel={t('onboarding_country_a11y')}
            accessibilityValue={{ text: data.pais || undefined }}>
            <Text style={data.pais ? styles.inputText : styles.inputPlaceholder}>
              {data.pais || t('onboarding_country_placeholder')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('onboarding_sex_label')}</Text>
          <View style={styles.chipsRow}>
            {(['masculino', 'femenino', 'otro'] as const).map(s => (
              <TouchableOpacity key={s}
                style={[styles.chip, data.sexo === s && styles.chipOn]}
                onPress={() => set('sexo', s)} activeOpacity={0.8}
                accessibilityRole="radio" accessibilityState={{ selected: data.sexo === s }}>
                <Text style={[styles.chipText, data.sexo === s && styles.chipTextOn]}>
                  {s === 'masculino' ? t('onboarding_sex_male') : s === 'femenino' ? t('onboarding_sex_female') : t('onboarding_sex_other')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>{t('onboarding_weight_label')}</Text>
            <View style={styles.unitToggle}>
              {(['kg', 'lb'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, data.pesoUnit === u && styles.unitBtnOn]}
                  onPress={() => set('pesoUnit', u)}
                  accessibilityRole="radio" accessibilityState={{ selected: data.pesoUnit === u }}
                  accessibilityLabel={u}>
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
            <Text style={styles.fieldLabel}>{t('onboarding_height_label')}</Text>
            <View style={styles.unitToggle}>
              {(['cm', 'ft'] as const).map(u => (
                <TouchableOpacity key={u} style={[styles.unitBtn, data.alturaUnit === u && styles.unitBtnOn]}
                  onPress={() => set('alturaUnit', u)}
                  accessibilityRole="radio" accessibilityState={{ selected: data.alturaUnit === u }}
                  accessibilityLabel={u}>
                  <Text style={[styles.unitBtnText, data.alturaUnit === u && styles.unitBtnTextOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput style={styles.input}
            placeholder={data.alturaUnit === 'cm' ? 'ej. 175' : 'ej. 5.75'}
            placeholderTextColor={colors.inkMuted} value={data.altura}
            onChangeText={v => set('altura', v.replace(',', '.'))} keyboardType="decimal-pad" />
          {data.alturaUnit === 'ft' && (
            <Text style={styles.inputHint}>{t('onboarding_height_ft_hint')}</Text>
          )}
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

        <Text style={styles.sectionLabel}>{t('onboarding_ciclo_section')}</Text>
        <Text style={styles.cicloDesc}>{t('onboarding_ciclo_desc').replace('{nombre}', data.nombre.trim())}</Text>

        <TouchableOpacity onPress={() => set('usaCicloMenstrual', !on)} activeOpacity={0.88}
          accessibilityRole="checkbox" accessibilityState={{ checked: on }}>

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
                  {t('onboarding_ciclo_yes')}
                </Text>
                <Text style={[styles.cicloCardSub, on && styles.cicloCardSubOn]}>
                  {t('onboarding_ciclo_config_later')}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.cicloNote}>{t('onboarding_ciclo_toggle_note')}</Text>
      </ScrollView>
    )
  }

  // ── Block 1: training history ──────────────────────────────────────────────

  function renderHistorial() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.historialQ}>{t('onboarding_historial_q1')}</Text>

        {EXPERIENCIA_OPTIONS.map(opt => {
          const on = data.experienciaEntrenando === opt.value
          const label = t(opt.labelKey)
          const sub = t(opt.subKey)
          return (
            <TouchableOpacity key={opt.value}
              style={[styles.freqCard, on && styles.freqCardOn]}
              onPress={() => set('experienciaEntrenando', opt.value)}
              activeOpacity={0.8}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} — ${sub}`}>
              <View style={[styles.freqRadio, on && styles.freqRadioOn]}>
                {on && <View style={styles.freqDot} />}
              </View>
              <View style={styles.freqContent}>
                <Text style={[styles.freqLabel, on && styles.freqLabelOn]}>{label}</Text>
                <Text style={styles.freqSub}>{sub}</Text>
              </View>
              <View style={[styles.freqBadge, on && styles.freqBadgeOn]}>
                <Text style={[styles.freqBadgeText, on && styles.freqBadgeTextOn]}>{opt.badge}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  // ── Block 1: frecuencia semanal (pantalla propia, separada de experiencia) ──

  function renderFrecuencia() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.historialQ}>{t('onboarding_historial_q2')}</Text>

        {FRECUENCIA_OPTIONS.map(opt => {
          const on = data.frecuenciaHistorica === opt.value
          const label = t(opt.labelKey)
          const sub = t(opt.subKey)
          return (
            <TouchableOpacity key={opt.value}
              style={[styles.freqCard, on && styles.freqCardOn]}
              onPress={() => set('frecuenciaHistorica', opt.value)}
              activeOpacity={0.8}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} — ${sub}`}>
              <View style={[styles.freqRadio, on && styles.freqRadioOn]}>
                {on && <View style={styles.freqDot} />}
              </View>
              <View style={styles.freqContent}>
                <Text style={[styles.freqLabel, on && styles.freqLabelOn]}>{label}</Text>
                <Text style={styles.freqSub}>{sub}</Text>
              </View>
              <View style={[styles.freqBadge, on && styles.freqBadgeOn]}>
                <Text style={[styles.freqBadgeText, on && styles.freqBadgeTextOn]}>{opt.badge}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  // ── Block 1: actividad física que realiza (pantalla propia) ─────────────────

  function renderActividad() {
    const filteredDeportes = deportesQuery.length > 1
      ? deportesPairs.filter(p => normalize(p.label).includes(normalize(deportesQuery)))
      : deportesPairs

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.historialQ}>{t('onboarding_historial_q3')}</Text>

        <View style={styles.deportesSection}>
          <TouchableOpacity style={styles.deportesHeader}
            onPress={() => setDeportesExpanded(e => !e)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityState={{ expanded: deportesExpanded }}
            accessibilityLabel={t('onboarding_deportes_a11y')}>
            <View>
              <Text style={styles.deportesLabel}>{t('onboarding_deportes_label')}</Text>
              {data.deportes.length > 0 && (
                <Text style={styles.deportesCount}>
                  {data.deportes.length} {t('onboarding_selected_suffix')}
                </Text>
              )}
            </View>
            <Text style={[styles.deportesChevron, deportesExpanded && styles.deportesChevronUp]}>›</Text>
          </TouchableOpacity>

          {data.deportes.length > 0 && (
            <View style={styles.selectedRow}>
              {data.deportes.map(d => (
                <TouchableOpacity key={d} style={styles.selectedChip}
                  onPress={() => set('deportes', data.deportes.filter(x => x !== d))}
                  accessibilityRole="button" accessibilityLabel={`Quitar ${deportesLabelByValue.get(d) ?? d}`}>
                  <Text style={styles.selectedChipText}>{deportesLabelByValue.get(d) ?? d}</Text>
                  <Text style={styles.selectedChipX}> ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {deportesExpanded && (
            <View style={styles.deportesDropdown}>
              <TextInput style={styles.deportesSearch} placeholder={t('onboarding_deportes_search_placeholder')}
                placeholderTextColor={colors.inkMuted} value={deportesQuery}
                onChangeText={setDeportesQuery} autoCorrect={false} />
              <View style={styles.deportesGrid}>
                {filteredDeportes.map(p => {
                  const selected = data.deportes.includes(p.value)
                  return (
                    <TouchableOpacity key={p.value}
                      style={[styles.deporteChip, selected && styles.deporteChipOn]}
                      onPress={() => {
                        if (selected) set('deportes', data.deportes.filter(x => x !== p.value))
                        else set('deportes', [...data.deportes, p.value])
                      }}
                      activeOpacity={0.75}
                      accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
                      accessibilityLabel={p.label}>
                      <Text style={[styles.deporteChipText, selected && styles.deporteChipTextOn]}>
                        {selected ? '✓ ' : ''}{p.label}
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

        <Text style={styles.suenoQ}>{t('onboarding_sueno_q')}</Text>
        <Text style={styles.suenoSub}>{t('onboarding_sueno_sub')}</Text>

        <View style={styles.suenoGrid}>
          {SUENO_OPTIONS.map(opt => {
            const on = data.calidadSueno === opt.value
            const label = t(opt.labelKey)
            const sub = t(opt.subKey)
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.suenoCard, on && styles.suenoCardOn]}
                onPress={() => set('calidadSueno', opt.value)}
                activeOpacity={0.8}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                accessibilityLabel={`${label} — ${sub}`}>
                <Text style={styles.suenoIcon}>{opt.icon}</Text>
                <Text style={[styles.suenoLabel, on && styles.suenoLabelOn]}>{label}</Text>
                <Text style={styles.suenoSublabel}>{sub}</Text>
                {on && <View style={styles.suenoActiveDot} />}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    )
  }

  // ── Block 1: contexto de vida (estrés + trabajo) ───────────────────────────

  function renderContexto() {
    const ESTRES_OPTS = [
      { v: 'bajo' as const,     label: t('onboarding_estres_bajo'),     sub: t('onboarding_estres_bajo_sub') },
      { v: 'moderado' as const, label: t('onboarding_estres_moderado'), sub: t('onboarding_estres_moderado_sub') },
      { v: 'alto' as const,     label: t('onboarding_estres_alto'),     sub: t('onboarding_estres_alto_sub') },
    ]
    const TRABAJO_OPTS = [
      { v: 'sedentario' as const, label: t('onboarding_trabajo_sedentario'), sub: t('onboarding_trabajo_sedentario_sub') },
      { v: 'mixto' as const,      label: t('onboarding_trabajo_mixto'),      sub: t('onboarding_trabajo_mixto_sub') },
      { v: 'activo' as const,     label: t('onboarding_trabajo_activo'),     sub: t('onboarding_trabajo_activo_sub') },
    ]
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.contextLine}>{t('onboarding_b1_context2')}</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('onboarding_stress_section')}</Text>
          {ESTRES_OPTS.map(o => {
            const on = data.nivelEstres === o.v
            return (
              <TouchableOpacity key={o.v}
                style={[styles.freqCard, on && styles.freqCardOn]}
                onPress={() => set('nivelEstres', o.v)} activeOpacity={0.8}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                accessibilityLabel={`${o.label} — ${o.sub}`}>
                <View style={[styles.freqRadio, on && styles.freqRadioOn]}>
                  {on && <View style={styles.freqDot} />}
                </View>
                <View style={styles.freqContent}>
                  <Text style={[styles.freqLabel, on && styles.freqLabelOn]}>{o.label}</Text>
                  <Text style={styles.freqSub}>{o.sub}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
          <Text style={styles.fieldLabel}>{t('onboarding_worktype_section')}</Text>
          {TRABAJO_OPTS.map(o => {
            const on = data.tipoTrabajo === o.v
            return (
              <TouchableOpacity key={o.v}
                style={[styles.freqCard, on && styles.freqCardOn]}
                onPress={() => set('tipoTrabajo', o.v)} activeOpacity={0.8}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                accessibilityLabel={`${o.label} — ${o.sub}`}>
                <View style={[styles.freqRadio, on && styles.freqRadioOn]}>
                  {on && <View style={styles.freqDot} />}
                </View>
                <View style={styles.freqContent}>
                  <Text style={[styles.freqLabel, on && styles.freqLabelOn]}>{o.label}</Text>
                  <Text style={styles.freqSub}>{o.sub}</Text>
                </View>
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

        <Text style={styles.lesionesTitle}>{t('onboarding_lesiones_title')}</Text>
        <Text style={styles.lesionesSub}>{t('onboarding_lesiones_sub')}</Text>

        {/* Body map: vista frontal (16 zonas) + miniatura trasera (lumbar) */}
        <View style={styles.bodyMapWrap}>
          <View style={styles.bodyMapRow}>
            <BodyMap
              lesiones={data.lesiones}
              editingZona={editingZona}
              onZonePress={openLesionModal}
              t={t}
            />

            {/* Vista trasera — solo zona lumbar, no visible desde el frente */}
            <View style={styles.lumbarThumbWrap}>
              <BackLumbarThumb
                lesiones={data.lesiones}
                editingZona={editingZona}
                onPress={() => openLesionModal('lumbar')}
                t={t}
              />
              <Text style={styles.lumbarThumbLabel}>{t('onboarding_lumbar_chip')}</Text>
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ff4444' }]} />
            <Text style={styles.legendText}>{t('onboarding_legend_activa')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#32c896' }]} />
            <Text style={styles.legendText}>{t('onboarding_legend_superada')}</Text>
          </View>
        </View>

        {/* Alternativa accesible: lista en texto plano de las 17 zonas, para
            quien usa lector de pantalla (los tap targets del body map son
            pequeños y están sobre una imagen). */}
        <View style={styles.deportesSection}>
          <TouchableOpacity style={styles.deportesHeader}
            onPress={() => setZonesListOpen(v => !v)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityState={{ expanded: zonesListOpen }}
            accessibilityLabel={t('onboarding_zones_list_a11y')}>
            <Text style={styles.deportesLabel}>{t('onboarding_zones_list_toggle')}</Text>
            <Text style={[styles.deportesChevron, zonesListOpen && styles.deportesChevronUp]}>›</Text>
          </TouchableOpacity>
          {zonesListOpen && (
            <View style={styles.deportesDropdown}>
              <View style={styles.deportesGrid}>
                {Object.keys(ZONE_LABEL_KEYS).map(zona => {
                  const inj = data.lesiones.find(l => l.zona === zona)
                  return (
                    <TouchableOpacity key={zona}
                      style={[styles.deporteChip, !!inj && styles.deporteChipOn]}
                      onPress={() => openLesionModal(zona)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !!inj }}
                      accessibilityLabel={zoneA11yLabelExternal(zona, data.lesiones, t)}>
                      <Text style={[styles.deporteChipText, !!inj && styles.deporteChipTextOn]}>
                        {inj ? '✓ ' : ''}{zoneLabel(zona, t)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* Added injuries list */}
        {data.lesiones.length > 0 && (
          <View style={styles.lesionesListSection}>
            <Text style={styles.lesionesListTitle}>{t('onboarding_lesiones_registradas')}</Text>
            {data.lesiones.map(l => (
              <TouchableOpacity key={l.zona} style={styles.lesionCard}
                onPress={() => openLesionModal(l.zona)} activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={zoneLabel(l.zona, t)}>
                <View style={[styles.lesionStatusBar,
                  { backgroundColor: l.estado === 'activa' ? '#ff4444' : '#32c896' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lesionCardZona}>{zoneLabel(l.zona, t)}</Text>
                  <Text style={styles.lesionCardDetail}>
                    {l.estado === 'activa'
                      ? `${t('onboarding_lesion_activa_detail')} · ${t(GRAVEDAD_CONFIG[l.gravedad!].labelKey)}${l.especialista ? ` · ${t('onboarding_lesion_especialista')}` : ''}`
                      : `${t('onboarding_lesion_superada_detail')} · ${t('onboarding_lesion_hace')} ${t(TIEMPO_LABEL_KEYS[l.tiempo!])}`}
                  </Text>
                </View>
                <Text style={styles.lesionCardEdit}>{t('onboarding_lesion_editar')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Skip */}
        {data.lesiones.length === 0 && (
          <Text style={styles.lesionesSkipNote}>{t('onboarding_lesiones_skip')}</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 2: movement limitations ─────────────────────────────────────────

  function renderLimitaciones() {
    const filtered = ejerciciosQuery.length > 1
      ? ejerciciosPairs.filter(p => normalize(p.label).includes(normalize(ejerciciosQuery)))
      : ejerciciosPairs

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.limitTitle}>{t('onboarding_limit_title')}</Text>
        <Text style={styles.limitSub}>{t('onboarding_limit_sub')}</Text>

        {/* Searchable exercise selector */}
        <View style={styles.deportesSection}>
          <TouchableOpacity style={styles.deportesHeader}
            onPress={() => setEjerciciosExpanded(e => !e)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityState={{ expanded: ejerciciosExpanded }}
            accessibilityLabel={t('onboarding_ejercicios_a11y')}>
            <View>
              <Text style={styles.deportesLabel}>{t('onboarding_ejercicios_label')}</Text>
              {data.ejerciciosEvitar.length > 0 && (
                <Text style={styles.deportesCount}>
                  {data.ejerciciosEvitar.length} {t('onboarding_selected_suffix')}
                </Text>
              )}
            </View>
            <Text style={[styles.deportesChevron, ejerciciosExpanded && styles.deportesChevronUp]}>›</Text>
          </TouchableOpacity>

          {data.ejerciciosEvitar.length > 0 && (
            <View style={styles.selectedRow}>
              {data.ejerciciosEvitar.map(e => (
                <TouchableOpacity key={e} style={styles.selectedChipRed}
                  onPress={() => set('ejerciciosEvitar', data.ejerciciosEvitar.filter(x => x !== e))}
                  accessibilityRole="button" accessibilityLabel={`Quitar ${ejerciciosLabelByValue.get(e) ?? e}`}>
                  <Text style={styles.selectedChipRedText}>{ejerciciosLabelByValue.get(e) ?? e}</Text>
                  <Text style={styles.selectedChipRedX}> ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {ejerciciosExpanded && (
            <View style={styles.deportesDropdown}>
              <TextInput style={styles.deportesSearch} placeholder={t('onboarding_ejercicios_search_placeholder')}
                placeholderTextColor={colors.inkMuted} value={ejerciciosQuery}
                onChangeText={setEjerciciosQuery} autoCorrect={false} />
              <View style={styles.deportesGrid}>
                {filtered.map(p => {
                  const sel = data.ejerciciosEvitar.includes(p.value)
                  return (
                    <TouchableOpacity key={p.value}
                      style={[styles.deporteChip, sel && styles.deporteChipRed]}
                      onPress={() => {
                        if (sel) set('ejerciciosEvitar', data.ejerciciosEvitar.filter(x => x !== p.value))
                        else set('ejerciciosEvitar', [...data.ejerciciosEvitar, p.value])
                      }}
                      activeOpacity={0.75}
                      accessibilityRole="checkbox" accessibilityState={{ checked: sel }}
                      accessibilityLabel={p.label}>
                      <Text style={[styles.deporteChipText, sel && styles.deporteChipTextRed]}>
                        {sel ? '✕ ' : ''}{p.label}
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
            <Text style={styles.fieldLabel}>{`${t('onboarding_why_label')} (${t('onboarding_optional')})`}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={t('onboarding_ejercicios_motivo_placeholder')}
              placeholderTextColor={colors.inkMuted}
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
          <Text style={styles.skipNote}>{t('onboarding_limitaciones_skip')}</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 2: medical history ───────────────────────────────────────────────

  function renderHistorialMedico() {
    const filteredCond = condQuery.length > 1
      ? condicionesPairs.filter(p => normalize(p.label).includes(normalize(condQuery)))
      : condicionesPairs

    function toggleCondicion(value: string, on: boolean) {
      if (on) {
        set('condicionesMedicas', data.condicionesMedicas.filter(x => x !== value))
        set('condicionesBajoTratamiento', data.condicionesBajoTratamiento.filter(x => x !== value))
        if (value === COND_OTRO) set('condicionOtra', '')
      } else {
        set('condicionesMedicas', [...data.condicionesMedicas, value])
      }
    }

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>{t('onboarding_med_section')}</Text>
        <Text style={styles.medTitle}>{t('onboarding_med_title')}</Text>
        <Text style={styles.medSub}>{t('onboarding_med_sub')}</Text>

        {/* Buscador con autocompletado + condiciones seleccionadas */}
        <View style={styles.deportesSection}>
          <TouchableOpacity style={styles.deportesHeader}
            onPress={() => setCondExpanded(e => !e)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityState={{ expanded: condExpanded }}
            accessibilityLabel={t('onboarding_med_a11y')}>
            <View>
              <Text style={styles.deportesLabel}>{t('onboarding_med_label')}</Text>
              {data.condicionesMedicas.length > 0 && (
                <Text style={styles.deportesCount}>
                  {data.condicionesMedicas.length} {t('onboarding_selected_suffix')}
                </Text>
              )}
            </View>
            <Text style={[styles.deportesChevron, condExpanded && styles.deportesChevronUp]}>›</Text>
          </TouchableOpacity>

          {data.condicionesMedicas.length > 0 && (
            <View style={styles.condSelectedList}>
              {data.condicionesMedicas.map(value => {
                const label = condicionesPairs.find(p => p.value === value)?.label ?? value
                const bajoTratamiento = data.condicionesBajoTratamiento.includes(value)
                return (
                  <View key={value} style={styles.condSelectedRow}>
                    <Text style={styles.condSelectedLabel} numberOfLines={2}>{label}</Text>
                    <TouchableOpacity
                      style={styles.condTratamientoRow}
                      onPress={() => {
                        if (bajoTratamiento) set('condicionesBajoTratamiento', data.condicionesBajoTratamiento.filter(x => x !== value))
                        else set('condicionesBajoTratamiento', [...data.condicionesBajoTratamiento, value])
                      }}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox" accessibilityState={{ checked: bajoTratamiento }}
                      accessibilityLabel={t('onboarding_med_bajo_tratamiento')}>
                      <View style={[styles.miniCheck, bajoTratamiento && styles.miniCheckOn]}>
                        {bajoTratamiento && <Text style={styles.miniCheckMark}>✓</Text>}
                      </View>
                      <Text style={styles.condTratamientoText}>{t('onboarding_med_bajo_tratamiento')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleCondicion(value, true)}
                      accessibilityRole="button" accessibilityLabel={`Quitar ${label}`}>
                      <Text style={styles.selectedChipX}>×</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}

          {condExpanded && (
            <View style={styles.deportesDropdown}>
              <TextInput style={styles.deportesSearch} placeholder={t('onboarding_med_search_placeholder')}
                placeholderTextColor={colors.inkMuted} value={condQuery}
                onChangeText={setCondQuery} autoCorrect={false} />
              <View style={styles.deportesGrid}>
                {filteredCond.map(p => {
                  const on = data.condicionesMedicas.includes(p.value)
                  return (
                    <TouchableOpacity key={p.value}
                      style={[styles.deporteChip, on && styles.deporteChipOn]}
                      onPress={() => toggleCondicion(p.value, on)}
                      activeOpacity={0.75}
                      accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                      accessibilityLabel={p.label}>
                      <Text style={[styles.deporteChipText, on && styles.deporteChipTextOn]}>
                        {on ? '✓ ' : ''}{p.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* "Otro" — campo de texto libre cuando el chip está activo */}
        {data.condicionesMedicas.includes(COND_OTRO) && (
          <View style={[styles.fieldGroup, { marginTop: 18 }]}>
            <Text style={styles.fieldLabel}>{t('onboarding_med_otro_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding_med_otro_placeholder')}
              placeholderTextColor={colors.inkMuted}
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
          <Text style={styles.fieldLabel}>{t('onboarding_med_notas_label')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('onboarding_med_notas_placeholder')}
            placeholderTextColor={colors.inkMuted}
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
          <Text style={styles.skipNote}>{t('onboarding_med_skip')}</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 3: location ─────────────────────────────────────────────────────

  function renderLugar() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>{t('onboarding_lugar_title')}</Text>
        <Text style={styles.b3Sub}>{t('onboarding_lugar_sub')}</Text>

        {LUGARES.map(loc => {
          const on = data.lugares.includes(loc.id)
          const label = t(loc.labelKey)
          const desc = t(loc.descKey)
          return (
            <TouchableOpacity key={loc.id}
              style={[styles.lugarCard, on && styles.lugarCardOn]}
              onPress={() => {
                if (on) set('lugares', data.lugares.filter(x => x !== loc.id))
                else set('lugares', [...data.lugares, loc.id])
              }}
              activeOpacity={0.8}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              accessibilityLabel={`${label} — ${desc}`}>
              <Text style={styles.lugarIcon}>{loc.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lugarLabel, on && styles.lugarLabelOn]}>{label}</Text>
                <Text style={styles.lugarDesc}>{desc}</Text>
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
    const noSe = data.equipamiento.includes('no_se')

    function toggleEquip(item: string) {
      if (item === 'ninguno' || item === 'no_se') {
        const isOn = data.equipamiento.includes(item)
        set('equipamiento', isOn ? [] : [item])
      } else {
        const cleaned = data.equipamiento.filter(x => x !== 'ninguno' && x !== 'no_se')
        if (cleaned.includes(item))
          set('equipamiento', cleaned.filter(x => x !== item))
        else
          set('equipamiento', [...cleaned, item])
      }
    }

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>{t('onboarding_equip_title')}</Text>
        <Text style={styles.b3Sub}>{t('onboarding_equip_sub')}</Text>

        {/* No equipment toggle */}
        <TouchableOpacity
          style={[styles.ningunCard, sinNada && styles.ningunCardOn]}
          onPress={() => toggleEquip('ninguno')}
          activeOpacity={0.8}
          accessibilityRole="checkbox" accessibilityState={{ checked: sinNada }}
          accessibilityLabel={t('onboarding_equip_ninguno')}>
          <Text style={[styles.ningunLabel, sinNada && styles.ningunLabelOn]}>
            {sinNada ? '✓  ' : ''}{t('onboarding_equip_ninguno')}
          </Text>
        </TouchableOpacity>

        {/* "No sé" toggle — un principiante puede no conocer el equipo del lugar */}
        <TouchableOpacity
          style={[styles.ningunCard, noSe && styles.ningunCardOn]}
          onPress={() => toggleEquip('no_se')}
          activeOpacity={0.8}
          accessibilityRole="checkbox" accessibilityState={{ checked: noSe }}
          accessibilityLabel={t('onboarding_equip_no_se')}>
          <Text style={[styles.ningunLabel, noSe && styles.ningunLabelOn]}>
            {noSe ? '✓  ' : ''}{t('onboarding_equip_no_se')}
          </Text>
        </TouchableOpacity>

        {/* Equipment categories */}
        {!sinNada && !noSe && EQUIPAMIENTO_CATS.map(cat => (
          <View key={cat.catKey} style={styles.equipCat}>
            <Text style={styles.equipCatLabel}>{t(cat.catKey).toUpperCase()}</Text>
            <View style={styles.deportesGrid}>
              {cat.items.map(item => {
                const sel = data.equipamiento.includes(item.value)
                const label = t(item.labelKey)
                return (
                  <TouchableOpacity key={item.value}
                    style={[styles.deporteChip, sel && styles.deporteChipOn]}
                    onPress={() => toggleEquip(item.value)}
                    activeOpacity={0.75}
                    accessibilityRole="checkbox" accessibilityState={{ checked: sel }}
                    accessibilityLabel={label}>
                    <Text style={[styles.deporteChipText, sel && styles.deporteChipTextOn]}>
                      {sel ? '✓ ' : ''}{label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        {!sinNada && !noSe && data.equipamiento.length === 0 && (
          <Text style={styles.skipNote}>{t('onboarding_equip_skip')}</Text>
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
        <Text style={styles.tiempoSectionQ}>{t('onboarding_tiempo_normal_q')}</Text>
        <DurationSlider
          opts={TIEMPO_NORMAL_OPTS}
          value={data.tiempoNormal}
          onChange={v => set('tiempoNormal', v)}
          styles={styles}
          t={t}
        />

        {/* Section: Busy day */}
        <Text style={[styles.tiempoSectionQ, { marginTop: 28 }]}>{t('onboarding_tiempo_ocupado_q')}</Text>
        <Text style={styles.tiempoSectionNote}>{t('onboarding_tiempo_ocupado_note')}</Text>
        <DurationSlider
          opts={TIEMPO_OCUPADO_OPTS}
          value={data.tiempoOcupado}
          onChange={v => set('tiempoOcupado', v)}
          styles={styles}
          t={t}
        />

        {/* Section: Time of day */}
        <Text style={[styles.tiempoSectionQ, { marginTop: 28 }]}>{t('onboarding_horario_q')}</Text>
        <Text style={styles.tiempoSectionNote}>{t('onboarding_horario_note')}</Text>
        <View style={styles.horarioGrid}>
          {HORARIO_OPTS.map(opt => {
            const on = data.horarios.includes(opt.value)
            const disabled = !on && data.horarios.length >= 2
            const label = t(opt.labelKey)
            const sub = t(opt.subKey)
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.horarioCard, on && styles.horarioCardOn, disabled && styles.horarioCardDisabled]}
                onPress={() => toggleHorario(opt.value)}
                activeOpacity={0.8}
                disabled={disabled}
                accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }}
                accessibilityLabel={`${label} — ${sub}`}>
                <Text style={styles.horarioIcon}>{opt.icon}</Text>
                <Text style={[styles.horarioLabel, on && styles.horarioLabelOn]}>{label}</Text>
                <Text style={styles.horarioSub}>{sub}</Text>
                {on && <View style={styles.horarioDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Section: Fixed days */}
        <Text style={[styles.tiempoSectionQ, { marginTop: 28 }]}>{t('onboarding_dias_fijos_q')}</Text>
        <View style={styles.diasRow}>
          <TouchableOpacity
            style={[styles.diasBtn, data.diasFijos === true && styles.diasBtnOn]}
            onPress={() => set('diasFijos', true)}
            activeOpacity={0.8}
            accessibilityRole="radio" accessibilityState={{ selected: data.diasFijos === true }}
            accessibilityLabel={`${t('onboarding_dias_fijos_si')} — ${t('onboarding_dias_fijos_si_sub')}`}>
            <Text style={[styles.diasBtnText, data.diasFijos === true && styles.diasBtnTextOn]}>
              {t('onboarding_dias_fijos_si')}
            </Text>
            <Text style={styles.diasBtnSub}>{t('onboarding_dias_fijos_si_sub')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diasBtn, data.diasFijos === false && styles.diasBtnOn]}
            onPress={() => set('diasFijos', false)}
            activeOpacity={0.8}
            accessibilityRole="radio" accessibilityState={{ selected: data.diasFijos === false }}
            accessibilityLabel={`${t('onboarding_dias_fijos_varia')} — ${t('onboarding_dias_fijos_varia_sub')}`}>
            <Text style={[styles.diasBtnText, data.diasFijos === false && styles.diasBtnTextOn]}>
              {t('onboarding_dias_fijos_varia')}
            </Text>
            <Text style={styles.diasBtnSub}>{t('onboarding_dias_fijos_varia_sub')}</Text>
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

        <Text style={styles.b3Title}>{t('onboarding_objetivo_title')}</Text>
        <Text style={styles.b3Sub}>{t('onboarding_objetivo_sub')}</Text>

        <View style={styles.objetivosGrid}>
          {OBJETIVOS.map(obj => {
            const on   = data.objetivos.includes(obj.id)
            const full = !on && data.objetivos.length >= 2
            const label = t(obj.labelKey)
            const tag = t(obj.tagKey)
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
                      setError(t('onboarding_err_max_goals'))
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
                activeOpacity={0.8}
                accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: full }}
                accessibilityLabel={`${label} — ${tag}`}>
                <Text style={styles.objetivoIcon}>{obj.icon}</Text>
                <Text style={[styles.objetivoLabel, on && styles.objetivoLabelOn]}>
                  {label}
                </Text>
                <Text style={styles.objetivoTagline}>{tag}</Text>
                {on && <View style={styles.objetivoDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.skipNote, { marginTop: 10 }]}>
          {data.objetivos.length} {t('onboarding_objetivo_count')}
        </Text>

        {/* Secondary objective — shown once at least one primary is selected */}
        {(() => {
          const remaining = OBJETIVOS.filter(o => !data.objetivos.includes(o.id))
          if (data.objetivos.length === 0 || remaining.length === 0) return null
          return (
            <View style={styles.secundarioSection}>
              <View style={styles.secundarioDivider} />
              <Text style={styles.secundarioQ}>{t('onboarding_secundario_q')}</Text>
              <Text style={styles.secundarioSub}>{t('onboarding_secundario_sub')}</Text>
              <View style={styles.objetivosGrid}>
                {remaining.map(obj => {
                  const on = data.objetivoSecundario === obj.id
                  const label = t(obj.labelKey)
                  const tag = t(obj.tagKey)
                  return (
                    <TouchableOpacity key={obj.id}
                      style={[styles.objetivoCard, styles.objetivoCardSecundario, on && styles.objetivoCardOn]}
                      onPress={() => set('objetivoSecundario', on ? null : obj.id)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                      accessibilityLabel={`${label} — ${tag}`}>
                      <Text style={styles.objetivoIcon}>{obj.icon}</Text>
                      <Text style={[styles.objetivoLabel, on && styles.objetivoLabelOn]}>
                        {label}
                      </Text>
                      <Text style={styles.objetivoTagline}>{tag}</Text>
                      {on && <View style={styles.objetivoDot} />}
                    </TouchableOpacity>
                  )
                })}
              </View>
              <Text style={styles.secundarioNote}>{t('onboarding_secundario_note')}</Text>
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

        <Text style={styles.b3Title}>{t('onboarding_horizonte_title')}</Text>
        <Text style={styles.b3Sub}>{t('onboarding_horizonte_sub')}</Text>

        <View style={styles.horizonteGrid}>
          {HORIZONTE_OPTS.map(opt => {
            const on = data.horizonteTemporal === opt.value
            const label = t(opt.labelKey)
            const sub = t(opt.subKey)
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.horizonteCard, on && styles.horizonteCardOn]}
                onPress={() => set('horizonteTemporal', opt.value)}
                activeOpacity={0.8}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                accessibilityLabel={`${label} — ${sub}`}>
                <Text style={[styles.horizonteLabel, on && styles.horizonteLabelOn]}>
                  {label}
                </Text>
                <Text style={[styles.horizonteSub, on && styles.horizonteSubOn]}>
                  {sub}
                </Text>
                {on && <View style={styles.horizonteDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Motivation text */}
        <View style={[styles.fieldGroup, { marginTop: 32 }]}>
          <Text style={styles.motivTitle}>{t('onboarding_motiv_title')}</Text>
          <Text style={styles.motivSub}>{t('onboarding_motiv_sub')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('onboarding_motiv_placeholder')}
            placeholderTextColor={colors.inkMuted}
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
            <Text style={styles.procesandoErrorTitle}>{t('onboarding_procesando_error_title')}</Text>
            <Text style={styles.procesandoErrorSub}>{error}</Text>
            <TouchableOpacity
              style={styles.procesandoRetryBtn}
              onPress={() => { setError(''); setSaveComplete(false); handleSave() }}
              activeOpacity={0.8}>
              <Text style={styles.procesandoRetryText}>{t('onboarding_procesando_retry')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.procesandoEyebrow}>{t('onboarding_procesando_eyebrow')}</Text>
            <Text style={styles.procesandoNum}>{animCount}</Text>
            <Text style={styles.procesandoNumLabel}>{t('onboarding_procesando_num_label')}</Text>
            <Text style={styles.procesandoSubText}>{t('onboarding_procesando_subtext')}</Text>
            <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: 32 }} />
          </>
        )}
      </View>
    )
  }

  // ── Block 6: beta welcome ─────────────────────────────────────────────────────

  function renderBeta() {
    const total = countVariables()
    // Entrada escalonada: cada bloque se desplaza en un sub-tramo de betaFade
    // (0→1) para que los textos no aparezcan todos de golpe.
    const stagger = (start: number, span = 0.4) => ({
      opacity: betaFade.interpolate({
        inputRange: [start, Math.min(start + span, 1)], outputRange: [0, 1], extrapolate: 'clamp',
      }),
      transform: [{
        translateY: betaFade.interpolate({
          inputRange: [start, Math.min(start + span, 1)], outputRange: [12, 0], extrapolate: 'clamp',
        }),
      }],
    })
    return (
      <View style={styles.betaWrap}>
        <View style={styles.betaContent}>
          <Animated.Text style={[styles.betaEyebrow, stagger(0)]}>{t('onboarding_beta_eyebrow')}</Animated.Text>
          <Animated.Text style={[styles.betaTitle, stagger(0.1)]}>{t('onboarding_beta_title')}</Animated.Text>
          <Animated.Text style={[styles.betaBody, stagger(0.22)]}>
            {t('onboarding_beta_body_prefix')}{' '}
            <Text style={styles.betaAccent}>{total} {t('onboarding_procesando_num_label')}</Text>
            {' '}{t('onboarding_beta_body_suffix')}
          </Animated.Text>

          <Animated.View style={[styles.betaDivider, stagger(0.34)]} />

          <Animated.View style={[styles.betaTagRow, stagger(0.44)]}>
            <View style={styles.betaTag}>
              <Text style={styles.betaTagText}>{t('onboarding_beta_tag')}</Text>
            </View>
          </Animated.View>
          <Animated.Text style={[styles.betaBetaDesc, stagger(0.52)]}>{t('onboarding_beta_desc')}</Animated.Text>
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
              <Text style={styles.betaBtnText}>{t('onboarding_welcome_btn')}</Text>
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

        <Text style={styles.b3Title}>{t('onboarding_abandono_title')}</Text>
        <Text style={styles.b3Sub}>{t('onboarding_abandono_sub')}</Text>

        <View style={styles.abandonoGrid}>
          {ABANDONO_OPTIONS.map(opt => {
            const on = data.razonesAbandono.includes(opt.id)
            const label = t(opt.labelKey)
            const sub = t(opt.subKey)
            return (
              <TouchableOpacity key={opt.id}
                style={[styles.abandonoCard, on && styles.abandonoCardOn]}
                onPress={() => {
                  if (on) set('razonesAbandono', data.razonesAbandono.filter(x => x !== opt.id))
                  else set('razonesAbandono', [...data.razonesAbandono, opt.id])
                }}
                activeOpacity={0.8}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                accessibilityLabel={`${label} — ${sub}`}>
                <Text style={styles.abandonoIcon}>{opt.icon}</Text>
                <Text style={[styles.abandonoLabel, on && styles.abandonoLabelOn]}>{label}</Text>
                <Text style={styles.abandonoItemSub}>{sub}</Text>
                {on && <View style={styles.abandonoDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {data.razonesAbandono.length === 0 && (
          <Text style={styles.skipNote}>{t('onboarding_abandono_skip')}</Text>
        )}
      </ScrollView>
    )
  }

  // ── Block 5: coaching style ───────────────────────────────────────────────────

  function renderCoaching() {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.b3Title}>{t('onboarding_coaching_title')}</Text>
        <Text style={styles.b3Sub}>{t('onboarding_coaching_sub')}</Text>

        {COACHING_STYLES.map(style => {
          const on = data.estiloCoaching === style.id
          const label = t(style.labelKey)
          const desc = t(style.descKey)
          return (
            <TouchableOpacity key={style.id}
              style={[
                styles.coachingCard,
                on && { backgroundColor: style.bg, borderColor: style.border, borderWidth: 1.5 },
              ]}
              onPress={() => set('estiloCoaching', on ? null : style.id)}
              activeOpacity={0.8}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} — ${desc}`}>
              <Text style={styles.coachingIcon}>{style.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.coachingLabel, on && { color: style.color }]}>
                  {label}
                </Text>
                <Text style={styles.coachingDesc}>{desc}</Text>
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

        <Text style={styles.b3Title}>{t('onboarding_entreno_title')}</Text>
        <Text style={styles.b3Sub}>{t('onboarding_entreno_sub')}</Text>

        <View style={styles.entrenoGrid}>
          {TIPOS_ENTRENAMIENTO.map(tipo => {
            const on = data.tiposEntrenamiento.includes(tipo.id)
            const label = t(tipo.labelKey)
            const sub = t(tipo.subKey)
            return (
              <TouchableOpacity key={tipo.id}
                style={[styles.entrenoCard, on && styles.entrenoCardOn]}
                onPress={() => {
                  if (on) set('tiposEntrenamiento', data.tiposEntrenamiento.filter(x => x !== tipo.id))
                  else set('tiposEntrenamiento', [...data.tiposEntrenamiento, tipo.id])
                }}
                activeOpacity={0.8}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                accessibilityLabel={`${label} — ${sub}`}>
                <Text style={styles.entrenoIcon}>{tipo.icon}</Text>
                <Text style={[styles.entrenoLabel, on && styles.entrenoLabelOn]}>{label}</Text>
                <Text style={styles.entrenoItemSub}>{sub}</Text>
                {on && <View style={styles.entrenoDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {data.tiposEntrenamiento.length === 0 && (
          <Text style={styles.skipNote}>{t('onboarding_entreno_skip')}</Text>
        )}
      </ScrollView>
    )
  }

  function renderContent() {
    switch (currentScreen) {
      case 'b1_personal':          return renderPersonal()
      case 'b1_ciclo':             return renderCiclo()
      case 'b1_historial':         return renderHistorial()
      case 'b1_frecuencia':        return renderFrecuencia()
      case 'b1_actividad':         return renderActividad()
      case 'b1_sueno':             return renderSueno()
      case 'b1_contexto':          return renderContexto()
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
        <View style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          accessibilityLabel={`Paso ${screenIndex + 1} de ${screens.length}`}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>

      {/* Header */}
      {currentScreen !== 'b6_procesando' && currentScreen !== 'b6_beta' && (
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={t('onboarding_back')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.blockTitle}>{getBlockTitle(currentScreen, t)}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {/* key={currentScreen} fuerza un remount del ScrollView de cada pantalla al
            cambiar de paso — sin esto React reutiliza la misma instancia nativa y
            conserva el scroll offset de la pantalla anterior. */}
        <View key={currentScreen} style={{ flex: 1 }}>
          {renderContent()}
        </View>

        {currentScreen !== 'b6_procesando' && currentScreen !== 'b6_beta' && (
          <View style={styles.footer}>
            {!!error && (
              <View
                ref={errorRef}
                style={styles.errorBox}
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <View style={styles.btnRow}>
              {screenIndex > 0 && (
                <TouchableOpacity style={styles.backSecondary} onPress={goBack} activeOpacity={0.8}
                  accessibilityRole="button" accessibilityLabel={t('onboarding_back')}>
                  <Text style={styles.backSecondaryText}>{t('onboarding_back')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.nextWrap, screenIndex === 0 && styles.nextWrapFull]}
                onPress={goNext} disabled={loading} activeOpacity={0.88}
                accessibilityRole="button" accessibilityLabel={t('onboarding_continue')}
                accessibilityState={{ disabled: loading, busy: loading }}>
                <LinearGradient colors={[colors.accent, colors.accentDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                  {loading
                    ? <ActivityIndicator color={readableTextOn(colors.accent)} size="small" />
                    : <Text style={styles.nextBtnText}>{t('onboarding_continue')}</Text>
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
                <Text style={styles.dateCancel}>{t('onboarding_cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.dateTitle}>{t('onboarding_birth_label')}</Text>
              <TouchableOpacity onPress={() => { set('fechaNacimiento', tempDate); setShowDatePicker(false) }}>
                <Text style={styles.dateDone}>{t('onboarding_done')}</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker value={tempDate} mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { if (d) setTempDate(d) }}
              maximumDate={new Date()} minimumDate={new Date(1930, 0, 1)} />
          </View>
        </View>
      </Modal>

      {/* Country picker */}
      <Modal transparent animationType="slide" visible={showCountryPicker}
        onRequestClose={() => setShowCountryPicker(false)}>
        <View style={styles.dateOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCountryPicker(false)} />
          <View style={styles.countrySheet}>
            <View style={styles.dateHeader}>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.dateCancel}>{t('onboarding_cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.dateTitle}>{t('onboarding_country_picker_title')}</Text>
              <View style={{ width: 50 }} />
            </View>
            <View style={styles.countrySearchWrap}>
              <TextInput style={styles.deportesSearch}
                placeholder={t('onboarding_country_search_placeholder')} placeholderTextColor={colors.inkMuted}
                value={countryQuery} onChangeText={setCountryQuery}
                autoCorrect={false} autoCapitalize="none" />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.countryList}
              renderItem={({ item }) => {
                const on = data.pais === item
                return (
                  <TouchableOpacity style={styles.countryRow} activeOpacity={0.7}
                    onPress={() => { set('pais', item); setShowCountryPicker(false) }}
                    accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={item}>
                    <Text style={[styles.countryRowText, on && styles.countryRowTextOn]}>{item}</Text>
                    {on && <Text style={styles.countryCheck}>✓</Text>}
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={<Text style={styles.countryEmpty}>{t('onboarding_country_empty')}</Text>}
            />
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
              {editingZona ? zoneLabel(editingZona, t) : ''}
            </Text>

            {/* Estado */}
            <Text style={styles.sheetSectionLabel}>{t('onboarding_sheet_estado')}</Text>
            <View style={styles.estadoRow}>
              {(['activa', 'superada'] as const).map(e => (
                <TouchableOpacity key={e}
                  style={[styles.estadoBtn, draftEstado === e && (e === 'activa' ? styles.estadoBtnActiva : styles.estadoBtnSuperada)]}
                  onPress={() => { setDraftEstado(e); setLesionError('') }}
                  activeOpacity={0.8}
                  accessibilityRole="radio" accessibilityState={{ selected: draftEstado === e }}
                  accessibilityLabel={e === 'activa' ? t('onboarding_legend_activa') : t('onboarding_legend_superada')}>
                  <Text style={[styles.estadoBtnText, draftEstado === e && styles.estadoBtnTextOn]}>
                    {e === 'activa' ? t('onboarding_sheet_activa') : t('onboarding_sheet_superada')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Gravedad (if activa) */}
            {draftEstado === 'activa' && (
              <>
                <Text style={styles.sheetSectionLabel}>{t('onboarding_sheet_gravedad')}</Text>
                <View style={styles.gravRow}>
                  {(['leve', 'moderada', 'severa'] as const).map(g => {
                    const cfg = GRAVEDAD_CONFIG[g]
                    const on = draftGravedad === g
                    const gravLabel = t(cfg.labelKey)
                    return (
                      <TouchableOpacity key={g}
                        style={[styles.gravBtn,
                          { borderColor: on ? cfg.color : colors.borderBright,
                            backgroundColor: on ? cfg.bg : colors.glassBg }]}
                        onPress={() => { setDraftGravedad(g); setLesionError('') }}
                        activeOpacity={0.8}
                        accessibilityRole="radio" accessibilityState={{ selected: on }}
                        accessibilityLabel={gravLabel}>
                        <Text style={[styles.gravBtnText, { color: on ? cfg.color : 'rgba(255,255,255,0.5)' }]}>
                          {gravLabel}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <TouchableOpacity style={styles.especialistaRow}
                  onPress={() => setDraftEspecialista(v => !v)} activeOpacity={0.85}
                  accessibilityRole="checkbox" accessibilityState={{ checked: draftEspecialista }}
                  accessibilityLabel={t('onboarding_sheet_especialista')}>
                  <View style={[styles.miniCheck, draftEspecialista && styles.miniCheckOn]}>
                    {draftEspecialista && <Text style={styles.miniCheckMark}>✓</Text>}
                  </View>
                  <Text style={styles.especialistaText}>{t('onboarding_sheet_especialista')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Tiempo (if superada) */}
            {draftEstado === 'superada' && (
              <>
                <Text style={styles.sheetSectionLabel}>{t('onboarding_sheet_tiempo_q')}</Text>
                <View style={styles.tiempoGrid}>
                  {(['1-3m', '3-6m', '6-12m', '+1a'] as const).map(tiempoVal => {
                    const on = draftTiempo === tiempoVal
                    const tiempoLabel = t(TIEMPO_LABEL_KEYS[tiempoVal])
                    return (
                      <TouchableOpacity key={tiempoVal}
                        style={[styles.tiempoBtn, on && styles.tiempoBtnOn]}
                        onPress={() => { setDraftTiempo(tiempoVal); setLesionError('') }}
                        activeOpacity={0.8}
                        accessibilityRole="radio" accessibilityState={{ selected: on }}
                        accessibilityLabel={tiempoLabel}>
                        <Text style={[styles.tiempoText, on && styles.tiempoTextOn]}>
                          {tiempoLabel}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}

            {/* Nota libre — qué tipo de lesión fue, útil para entender su dimensión */}
            <Text style={styles.sheetSectionLabel}>{t('onboarding_sheet_nota_label')}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={t('onboarding_sheet_nota_placeholder')}
              placeholderTextColor={colors.inkMuted}
              value={draftNota}
              onChangeText={setDraftNota}
              multiline
              numberOfLines={2}
              maxLength={150}
              textAlignVertical="top"
            />

            {!!lesionError && (
              <Text ref={lesionErrorRef} style={styles.lesionModalError}
                accessibilityRole="alert" accessibilityLiveRegion="assertive">
                {lesionError}
              </Text>
            )}

            {/* Sheet buttons */}
            <View style={styles.sheetBtns}>
              {data.lesiones.find(l => l.zona === editingZona) && (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteLesion} activeOpacity={0.8}
                  accessibilityRole="button" accessibilityLabel={t('onboarding_sheet_eliminar_a11y')}>
                  <Text style={styles.deleteBtnText}>{t('onboarding_sheet_eliminar')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveWrap, !data.lesiones.find(l => l.zona === editingZona) && { flex: 1 }]}
                onPress={saveLesion} activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={data.lesiones.find(l => l.zona === editingZona) ? t('onboarding_sheet_actualizar') : t('onboarding_sheet_agregar')}>
                <LinearGradient colors={[colors.accent, colors.accentDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>
                    {data.lesiones.find(l => l.zona === editingZona) ? t('onboarding_sheet_actualizar') : t('onboarding_sheet_agregar')}
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
  // Tinta legible sobre el acento del tema activo (botones/gradientes de
  // acento, chips "on"): blanco sobre acentos saturados, oscura sobre acentos
  // CLAROS (lima Forest, cobre Sand, turquesa Midnight/Ocean) — ahí el blanco
  // fijo caía a ~1.7:1 de contraste. `textOnAccentSoft` es la variante
  // "secundaria" (92%/72% de opacidad) para subtítulos sobre el mismo fondo.
  const textOnAccent = readableTextOn(c.accent)
  const textOnAccentSoft = textOnAccent === '#ffffff' ? 'rgba(255,255,255,0.92)' : 'rgba(13,17,23,0.72)'
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
      fontFamily: 'JetBrainsMono-Medium', fontSize: 12,
      color: c.inkPrimary, letterSpacing: 1, marginBottom: 10,
    },
    input: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15,
    },
    inputTouch: { justifyContent: 'center' },
    inputText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkPrimary },
    inputPlaceholder: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: c.inkMuted },
    inputHint: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 0.3, marginTop: 6 },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
    },
    chipOn: { backgroundColor: accentAlpha(c.accent, 0.15), borderColor: c.accent },
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
    unitBtnTextOn: { color: textOnAccent },

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
    cicloCheck: { color: textOnAccent, fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' },
    cicloCardTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary, lineHeight: 21 },
    cicloCardTitleOn: { color: textOnAccent },
    cicloCardSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginTop: 2 },
    // Subtítulo dentro del gradient accent: tinta derivada de textOnAccent
    // (antes '#ffffff' fijo, fallaba WCAG sobre acentos claros como Forest/Sand).
    cicloCardSubOn: { color: textOnAccentSoft },
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
    freqCardOn: { backgroundColor: accentAlpha(c.accent, 0.08), borderColor: c.accent },
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
    freqBadgeOn: { backgroundColor: accentAlpha(c.accent, 0.2) },
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
      backgroundColor: accentAlpha(c.accent, 0.15), borderWidth: 1, borderColor: c.accent,
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
    deporteChipOn: { backgroundColor: accentAlpha(c.accent, 0.15), borderColor: c.accent },
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
    suenoCardOn: { backgroundColor: accentAlpha(c.accent, 0.1), borderColor: c.accent, borderWidth: 1.5 },
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
    lugarCardOn: { backgroundColor: accentAlpha(c.accent, 0.09), borderColor: c.accent, borderWidth: 1.5 },
    lugarIcon: { fontSize: 28, width: 36, textAlign: 'center' },
    lugarLabel: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: c.inkPrimary, marginBottom: 3 },
    lugarLabelOn: { color: c.accent },
    lugarDesc: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, lineHeight: 17 },
    lugarCheck: {
      width: 26, height: 26, borderRadius: 13, borderWidth: 2,
      borderColor: c.borderBright, alignItems: 'center', justifyContent: 'center',
    },
    lugarCheckOn: { backgroundColor: c.accent, borderColor: c.accent },
    lugarCheckMark: { color: textOnAccent, fontSize: 13, fontFamily: 'SpaceGrotesk-Bold' },

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
    // Duration slider (reemplaza los cards de tiempo disponible)
    durSlider: { marginTop: 4, marginBottom: 4 },
    durValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 16 },
    durValueLabel: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color: c.accent, letterSpacing: -0.5 },
    durValueSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkSecondary, flexShrink: 1 },
    durTrackTouch: { height: 40, justifyContent: 'center' },
    durTrack: {
      position: 'absolute', left: 0, right: 0, top: 17, height: 6,
      borderRadius: 3, backgroundColor: c.inkFaint,
    },
    durTrackFill: {
      position: 'absolute', left: 0, top: 17, height: 6,
      borderRadius: 3, backgroundColor: c.accent,
    },
    durTick: {
      position: 'absolute', top: 16, width: 8, height: 8, borderRadius: 4,
      backgroundColor: c.bg, borderWidth: 1.5, borderColor: c.inkFaint,
    },
    durTickOn: { borderColor: c.accent },
    durThumb: {
      position: 'absolute', top: 7, width: 26, height: 26, borderRadius: 13,
      backgroundColor: c.accent, borderWidth: 3, borderColor: c.bg,
      shadowColor: c.accent, shadowOpacity: 0.5, shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 }, elevation: 4,
    },
    durEndsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    durEndLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 0.5 },

    // Horario cards (2-column grid)
    horarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    horarioCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, padding: 18, alignItems: 'center', position: 'relative',
    },
    horarioCardOn: { backgroundColor: accentAlpha(c.accent, 0.1), borderColor: c.accent, borderWidth: 1.5 },
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
    diasBtnOn: { backgroundColor: accentAlpha(c.accent, 0.1), borderColor: c.accent, borderWidth: 1.5 },
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
      backgroundColor: accentAlpha(c.accent, 0.1), borderColor: c.accent, borderWidth: 1.5,
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
      backgroundColor: accentAlpha(c.accent, 0.1), borderColor: c.accent, borderWidth: 1.5,
    },
    horizonteLabel: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 15,
      color: c.inkPrimary, marginBottom: 4,
    },
    horizonteLabelOn: { color: c.accent },
    horizonteSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },
    horizonteSubOn: { color: accentAlpha(c.accent, 0.65) },
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
    condSelectedList: { paddingHorizontal: 18, paddingBottom: 14, gap: 10 },
    condSelectedRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    },
    condSelectedLabel: {
      flex: 1, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkPrimary,
    },
    condTratamientoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    condTratamientoText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11.5, color: c.inkMuted, maxWidth: 90,
    },

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
    bodyMapRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
    lumbarThumbWrap: { alignItems: 'center', paddingBottom: 4 },
    lumbarThumbLabel: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 11, color: c.inkMuted,
      marginTop: 6, textAlign: 'center', maxWidth: 90,
    },

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
    miniCheckOn: { backgroundColor: accentAlpha(c.accent, 0.2), borderColor: c.accent },
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
    saveBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: textOnAccent, letterSpacing: 0.2 },

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
    nextBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: textOnAccent, letterSpacing: 0.3 },

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
      backgroundColor: accentAlpha(c.accent, 0.1), borderWidth: 1, borderColor: c.accent,
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
      backgroundColor: accentAlpha(c.accent, 0.12), borderWidth: 1, borderColor: c.accent,
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
      color: textOnAccent, letterSpacing: 2,
    },

    // Block 5 — abandono
    abandonoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    abandonoCard: {
      width: '47%', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 20, padding: 18, alignItems: 'flex-start', position: 'relative', minHeight: 110,
    },
    abandonoCardOn: { backgroundColor: accentAlpha(c.accent, 0.1), borderColor: c.accent, borderWidth: 1.5 },
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
    entrenoCardOn: { backgroundColor: accentAlpha(c.accent, 0.1), borderColor: c.accent, borderWidth: 1.5 },
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

    // Country picker
    countrySheet: {
      backgroundColor: c.sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderWidth: 1, borderColor: c.borderDefault, paddingBottom: 24, height: '72%',
    },
    countrySearchWrap: { paddingHorizontal: 16, paddingTop: 14 },
    countryList: { flex: 1, paddingHorizontal: 16 },
    countryRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderDefault,
    },
    countryRowText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: c.inkPrimary },
    countryRowTextOn: { color: c.accent },
    countryCheck: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: c.accent },
    countryEmpty: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: c.inkMuted,
      textAlign: 'center', paddingVertical: 30,
    },
  })
}
