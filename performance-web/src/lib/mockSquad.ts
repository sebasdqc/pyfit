// Datos de muestra de la plantilla (esta fase aún no conecta a la API). Cada
// atleta trae demográficos + perfil de rendimiento (radar 0-100) + métricas de
// carga. Compartible con otras pantallas que necesiten la plantilla.

import type { Tone } from './tone'

export type Estado = 'ok' | 'duda' | 'baja'
export const ESTADO_LABEL: Record<Estado, string> = {
  ok: 'Disponible',
  duda: 'En duda',
  baja: 'No disponible',
}
export const ESTADO_TONE: Record<Estado, Tone> = { ok: 'ok', duda: 'warn', baja: 'danger' }

export type RadarKey = 'velocidad' | 'resistencia' | 'fuerza' | 'potencia' | 'agilidad' | 'recuperacion'
export const RADAR_AXES: { key: RadarKey; label: string }[] = [
  { key: 'velocidad', label: 'Velocidad' },
  { key: 'resistencia', label: 'Resistencia' },
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'potencia', label: 'Potencia' },
  { key: 'agilidad', label: 'Agilidad' },
  { key: 'recuperacion', label: 'Recuperación' },
]

export interface Athlete {
  id: string
  nombre: string
  dorsal: number
  posicion: string
  estado: Estado
  edad: number
  nacionalidad: string
  altura: number // cm
  peso: number // kg
  pie: 'Derecho' | 'Izquierdo'
  grupo: string
  radar: Record<RadarKey, number>
  acwr: number
  bienestar: number // 0-10
  cargaSemanal: number // UA
  disponibilidad: number // % últimas 4 semanas
  minutos: number
  sesiones: number
  // Registro de última edición (se setea al guardar; vacío en los de base).
  editadoPor?: string
  editadoEn?: string // ISO 8601
}

export const SQUAD: Athlete[] = [
  { id: 'iker-salas', nombre: 'Iker Salas', dorsal: 1, posicion: 'Portero', estado: 'ok', edad: 29, nacionalidad: 'España', altura: 188, peso: 84, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 55, resistencia: 70, fuerza: 78, potencia: 72, agilidad: 60, recuperacion: 80 }, acwr: 1.05, bienestar: 8.1, cargaSemanal: 480, disponibilidad: 96, minutos: 1980, sesiones: 22 },
  { id: 'marco-ruiz', nombre: 'Marco Ruiz', dorsal: 4, posicion: 'Defensa central', estado: 'ok', edad: 27, nacionalidad: 'España', altura: 185, peso: 80, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 68, resistencia: 82, fuerza: 88, potencia: 80, agilidad: 66, recuperacion: 78 }, acwr: 1.18, bienestar: 7.6, cargaSemanal: 610, disponibilidad: 92, minutos: 2100, sesiones: 24 },
  { id: 'diego-castro', nombre: 'Diego Castro', dorsal: 2, posicion: 'Lateral derecho', estado: 'duda', edad: 24, nacionalidad: 'Argentina', altura: 176, peso: 71, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 88, resistencia: 85, fuerza: 70, potencia: 82, agilidad: 90, recuperacion: 64 }, acwr: 1.48, bienestar: 6.2, cargaSemanal: 720, disponibilidad: 78, minutos: 1860, sesiones: 21 },
  { id: 'luis-fernandez', nombre: 'Luis Fernández', dorsal: 5, posicion: 'Mediocentro', estado: 'baja', edad: 26, nacionalidad: 'España', altura: 180, peso: 75, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 72, resistencia: 90, fuerza: 74, potencia: 70, agilidad: 76, recuperacion: 50 }, acwr: 1.32, bienestar: 5.4, cargaSemanal: 540, disponibilidad: 64, minutos: 1500, sesiones: 18 },
  { id: 'pablo-vidal', nombre: 'Pablo Vidal', dorsal: 11, posicion: 'Extremo izquierdo', estado: 'ok', edad: 22, nacionalidad: 'España', altura: 174, peso: 68, pie: 'Izquierdo', grupo: 'Grupo B', radar: { velocidad: 92, resistencia: 78, fuerza: 64, potencia: 86, agilidad: 91, recuperacion: 82 }, acwr: 1.12, bienestar: 8.4, cargaSemanal: 650, disponibilidad: 90, minutos: 1740, sesiones: 20 },
  { id: 'hugo-mena', nombre: 'Hugo Mena', dorsal: 9, posicion: 'Delantero', estado: 'ok', edad: 25, nacionalidad: 'Brasil', altura: 183, peso: 79, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 85, resistencia: 74, fuerza: 82, potencia: 90, agilidad: 80, recuperacion: 76 }, acwr: 1.22, bienestar: 7.9, cargaSemanal: 690, disponibilidad: 88, minutos: 2010, sesiones: 23 },
  { id: 'javier-perez', nombre: 'Javier Pérez', dorsal: 6, posicion: 'Mediocentro', estado: 'baja', edad: 28, nacionalidad: 'España', altura: 178, peso: 73, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 66, resistencia: 88, fuerza: 72, potencia: 68, agilidad: 70, recuperacion: 44 }, acwr: 1.62, bienestar: 5.0, cargaSemanal: 760, disponibilidad: 60, minutos: 1620, sesiones: 19 },
  { id: 'andres-gomez', nombre: 'Andrés Gómez', dorsal: 7, posicion: 'Extremo derecho', estado: 'duda', edad: 23, nacionalidad: 'Colombia', altura: 172, peso: 66, pie: 'Derecho', grupo: 'Grupo B', radar: { velocidad: 90, resistencia: 80, fuerza: 60, potencia: 84, agilidad: 93, recuperacion: 58 }, acwr: 1.36, bienestar: 5.8, cargaSemanal: 700, disponibilidad: 74, minutos: 1680, sesiones: 20 },
  { id: 'sergio-lara', nombre: 'Sergio Lara', dorsal: 3, posicion: 'Defensa central', estado: 'ok', edad: 30, nacionalidad: 'España', altura: 190, peso: 86, pie: 'Izquierdo', grupo: 'Grupo A', radar: { velocidad: 58, resistencia: 78, fuerza: 92, potencia: 82, agilidad: 56, recuperacion: 84 }, acwr: 1.08, bienestar: 8.0, cargaSemanal: 560, disponibilidad: 94, minutos: 2160, sesiones: 24 },
  { id: 'tomas-rios', nombre: 'Tomás Ríos', dorsal: 15, posicion: 'Lateral izquierdo', estado: 'ok', edad: 25, nacionalidad: 'Argentina', altura: 177, peso: 72, pie: 'Izquierdo', grupo: 'Grupo A', radar: { velocidad: 84, resistencia: 86, fuerza: 72, potencia: 78, agilidad: 85, recuperacion: 80 }, acwr: 1.16, bienestar: 7.7, cargaSemanal: 620, disponibilidad: 89, minutos: 1920, sesiones: 22 },
  { id: 'nico-bravo', nombre: 'Nico Bravo', dorsal: 19, posicion: 'Delantero', estado: 'ok', edad: 21, nacionalidad: 'España', altura: 181, peso: 76, pie: 'Derecho', grupo: 'Grupo B', radar: { velocidad: 87, resistencia: 72, fuerza: 78, potencia: 88, agilidad: 82, recuperacion: 86 }, acwr: 1.10, bienestar: 8.6, cargaSemanal: 600, disponibilidad: 91, minutos: 1440, sesiones: 18 },
  { id: 'raul-nunez', nombre: 'Raúl Núñez', dorsal: 8, posicion: 'Mediocentro', estado: 'duda', edad: 24, nacionalidad: 'España', altura: 179, peso: 74, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 70, resistencia: 89, fuerza: 76, potencia: 72, agilidad: 74, recuperacion: 62 }, acwr: 1.41, bienestar: 6.5, cargaSemanal: 710, disponibilidad: 80, minutos: 1800, sesiones: 21 },
  { id: 'mateo-soto', nombre: 'Mateo Soto', dorsal: 14, posicion: 'Defensa central', estado: 'ok', edad: 27, nacionalidad: 'Uruguay', altura: 186, peso: 82, pie: 'Derecho', grupo: 'Grupo A', radar: { velocidad: 60, resistencia: 80, fuerza: 90, potencia: 80, agilidad: 58, recuperacion: 78 }, acwr: 1.21, bienestar: 7.4, cargaSemanal: 580, disponibilidad: 90, minutos: 2040, sesiones: 23 },
  { id: 'kevin-vidal', nombre: 'Kevin Vidal', dorsal: 13, posicion: 'Portero', estado: 'ok', edad: 23, nacionalidad: 'España', altura: 189, peso: 85, pie: 'Derecho', grupo: 'Grupo B', radar: { velocidad: 52, resistencia: 68, fuerza: 80, potencia: 74, agilidad: 62, recuperacion: 88 }, acwr: 1.08, bienestar: 8.2, cargaSemanal: 440, disponibilidad: 97, minutos: 990, sesiones: 12 },
]
