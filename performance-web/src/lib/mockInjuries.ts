// Datos de muestra de lesiones (esta fase aún sin API). Cada parte se vincula a
// un atleta de la plantilla (athleteId) y trae sus coordenadas (x, y) y vista
// (frente/espalda) sobre el modelo corporal de 200×415 para marcar el sitio.

import type { Tone } from './tone'

export type Severidad = 'leve' | 'moderada' | 'grave'
export type EstadoLesion = 'activa' | 'recuperacion' | 'duda' | 'alta'
export type TipoLesion = 'muscular' | 'articular' | 'ligamentosa' | 'tendinosa' | 'osea'
export type Vista = 'frente' | 'espalda'

export interface Injury {
  id: string
  athleteId: string
  zona: string
  vista: Vista
  x: number
  y: number
  tipo: TipoLesion
  severidad: Severidad
  estado: EstadoLesion
  fecha: string // ISO (día de la lesión)
  diasBaja: number
  rtp: string // estimación de vuelta a la competición
  mecanismo: string
}

export const SEV_TONE: Record<Severidad, Tone> = { leve: 'ok', moderada: 'warn', grave: 'danger' }
export const SEV_LABEL: Record<Severidad, string> = { leve: 'Leve', moderada: 'Moderada', grave: 'Grave' }
export const SEV_HEX: Record<Severidad, string> = { leve: '#32c896', moderada: '#ffaa32', grave: '#ff4444' }

export const ESTADO_LESION: Record<EstadoLesion, { label: string; tone: Tone }> = {
  activa: { label: 'De baja', tone: 'danger' },
  recuperacion: { label: 'En recuperación', tone: 'warn' },
  duda: { label: 'En duda', tone: 'accent' },
  alta: { label: 'Alta médica', tone: 'ok' },
}

export const TIPO_LABEL: Record<TipoLesion, string> = {
  muscular: 'Muscular',
  articular: 'Articular',
  ligamentosa: 'Ligamentosa',
  tendinosa: 'Tendinosa',
  osea: 'Ósea',
}

export const INJURIES: Injury[] = [
  { id: 'inj1', athleteId: 'luis-fernandez', zona: 'Isquiotibial izq.', vista: 'espalda', x: 85, y: 250, tipo: 'muscular', severidad: 'grave', estado: 'activa', fecha: '2026-05-25', diasBaja: 12, rtp: '~3 semanas', mecanismo: 'Sprint' },
  { id: 'inj2', athleteId: 'javier-perez', zona: 'Sóleo der.', vista: 'espalda', x: 112, y: 345, tipo: 'muscular', severidad: 'moderada', estado: 'recuperacion', fecha: '2026-05-30', diasBaja: 7, rtp: '~1 semana', mecanismo: 'Sobrecarga' },
  { id: 'inj3', athleteId: 'gael-mora', zona: 'Gemelo izq.', vista: 'espalda', x: 88, y: 345, tipo: 'muscular', severidad: 'moderada', estado: 'activa', fecha: '2026-06-02', diasBaja: 4, rtp: '~10 días', mecanismo: 'Sprint' },
  { id: 'inj4', athleteId: 'diego-castro', zona: 'Tobillo der.', vista: 'frente', x: 114, y: 384, tipo: 'ligamentosa', severidad: 'moderada', estado: 'recuperacion', fecha: '2026-05-29', diasBaja: 8, rtp: '~2 semanas', mecanismo: 'Esguince' },
  { id: 'inj5', athleteId: 'andres-gomez', zona: 'Aductor izq.', vista: 'frente', x: 90, y: 205, tipo: 'muscular', severidad: 'leve', estado: 'duda', fecha: '2026-06-04', diasBaja: 2, rtp: '~5 días', mecanismo: 'Sobrecarga' },
  { id: 'inj6', athleteId: 'raul-nunez', zona: 'Zona lumbar', vista: 'espalda', x: 100, y: 160, tipo: 'articular', severidad: 'leve', estado: 'recuperacion', fecha: '2026-06-01', diasBaja: 5, rtp: '~1 semana', mecanismo: 'Sobrecarga' },
  { id: 'inj7', athleteId: 'pablo-vidal', zona: 'Hombro izq.', vista: 'frente', x: 60, y: 80, tipo: 'articular', severidad: 'leve', estado: 'duda', fecha: '2026-06-03', diasBaja: 1, rtp: '~4 días', mecanismo: 'Contacto' },
  { id: 'inj8', athleteId: 'hugo-mena', zona: 'Rodilla der.', vista: 'frente', x: 115, y: 300, tipo: 'articular', severidad: 'leve', estado: 'alta', fecha: '2026-05-18', diasBaja: 0, rtp: 'Disponible', mecanismo: 'Sobrecarga' },
]
