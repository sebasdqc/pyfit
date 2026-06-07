// Utilidades del módulo CALENDARIO. Lógica de fechas en JavaScript puro (sin
// librerías de calendario, como el resto del panel) y metadatos por tipo de
// evento. Las fechas se manejan como cadenas 'YYYY-MM-DD' y se comparan
// lexicográficamente (ISO ordena bien), evitando líos de zona horaria.

import type { EventTipo, CalendarEvent } from '@/types'

// ── Metadatos por tipo de evento ─────────────────────────────────────────────
// `range`: eventos "contenedor" que enmarcan el año (se pintan como banda y se
// listan aparte). El resto son eventos puntuales del día a día.
export interface TipoMeta {
  label: string
  hex: string // color del acento (chips, bandas, puntos)
  range: boolean
  icon: string // emoji corto para la UI
}

export const TIPO_META: Record<EventTipo, TipoMeta> = {
  temporada: { label: 'Temporada', hex: '#4f8cff', range: true, icon: '🗓️' },
  torneo: { label: 'Torneo', hex: '#a855f7', range: true, icon: '🏆' },
  concentracion: { label: 'Concentración', hex: '#6ce5ff', range: true, icon: '🏕️' },
  partido: { label: 'Partido', hex: '#ff4444', range: false, icon: '⚽' },
  entrenamiento: { label: 'Entrenamiento', hex: '#32c896', range: false, icon: '💪' },
  evaluacion: { label: 'Evaluación', hex: '#ffaa32', range: false, icon: '📋' },
  descanso: { label: 'Descanso', hex: '#8a93a6', range: false, icon: '😴' },
  otro: { label: 'Otro', hex: '#7ab6ff', range: false, icon: '📌' },
}

export const TIPO_ORDER: EventTipo[] = [
  'temporada', 'torneo', 'concentracion', 'partido', 'entrenamiento', 'evaluacion', 'descanso', 'otro',
]

export const RANGE_TIPOS = TIPO_ORDER.filter((t) => TIPO_META[t].range)

// ── Fechas ───────────────────────────────────────────────────────────────────
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const pad = (n: number) => String(n).padStart(2, '0')

/** Cadena 'YYYY-MM-DD' a partir de año/mes(0-11)/día. */
export function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

/** 'YYYY-MM-DD' de hoy en hora local (no UTC). */
export function todayStr(): string {
  const d = new Date()
  return ymd(d.getFullYear(), d.getMonth(), d.getDate())
}

export interface DayCell {
  iso: string // 'YYYY-MM-DD'
  day: number
  inMonth: boolean
  isToday: boolean
}

/**
 * Matriz del mes como semanas (filas) de 7 días (lunes→domingo), incluyendo los
 * días "de relleno" del mes anterior/siguiente para completar la cuadrícula.
 */
export function monthMatrix(year: number, month: number): DayCell[][] {
  const hoy = todayStr()
  const first = new Date(year, month, 1)
  // getDay(): 0=domingo..6=sábado → lo giramos a 0=lunes..6=domingo.
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeksNeeded = Math.ceil((offset + daysInMonth) / 7) // 4, 5 o 6 filas

  const weeks: DayCell[][] = []
  const cursor = new Date(year, month, 1 - offset)
  for (let w = 0; w < weeksNeeded; w++) {
    const row: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const iso = ymd(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
      row.push({
        iso,
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        isToday: iso === hoy,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(row)
  }
  return weeks
}

export const monthLabel = (year: number, month: number) => `${MESES[month]} ${year}`
export const weekdayLabels = DIAS_CORTOS

/** Fecha legible: '10 ago 2026'. */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES[m - 1].slice(0, 3)} ${y}`
}

/** Rango legible de un evento ('10 ago 2026' o '1 jul 2026 → 30 may 2027'). */
export function formatEventRange(ev: CalendarEvent): string {
  if (!ev.fecha_fin || ev.fecha_fin === ev.fecha_inicio) return formatDay(ev.fecha_inicio)
  return `${formatDay(ev.fecha_inicio)} → ${formatDay(ev.fecha_fin)}`
}

/** Día final efectivo del evento (fecha_fin o, si es de un día, fecha_inicio). */
export const eventEnd = (ev: CalendarEvent) => ev.fecha_fin || ev.fecha_inicio

/** ¿El evento cubre el día `iso`? (rango inclusivo, comparación de cadenas ISO) */
export function eventCoversDay(ev: CalendarEvent, iso: string): boolean {
  return ev.fecha_inicio <= iso && iso <= eventEnd(ev)
}

/** Hora 'HH:MM' a partir de 'HH:MM:SS' (o '' si no hay/es todo el día). */
export function formatHora(ev: CalendarEvent): string {
  if (ev.todo_el_dia || !ev.hora_inicio) return ''
  return ev.hora_inicio.slice(0, 5)
}

export type EventEstado = 'curso' | 'proxima' | 'finalizada'

/** Estado de un evento de rango respecto a hoy. */
export function eventEstado(ev: CalendarEvent, hoy = todayStr()): EventEstado {
  if (eventEnd(ev) < hoy) return 'finalizada'
  if (ev.fecha_inicio > hoy) return 'proxima'
  return 'curso'
}
