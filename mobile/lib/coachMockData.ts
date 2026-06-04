/**
 * coachMockData.ts — Datos de ejemplo de la cartera del coach.
 *
 * PLACEHOLDER compartido entre la home del portal y la vista individual del
 * atleta. Cuando exista el endpoint real de cartera (GET /api/coach/atletas/…)
 * reemplazar este módulo por la respuesta del backend; la forma de los datos
 * (tipo Atleta) ya es la que consumen las pantallas.
 */

export type Estado = 'alerta' | 'pendiente' | 'al_dia'

export type Atleta = {
  id: string
  nombre: string
  ultima: string          // tiempo desde la última actividad ("hace 3 días")
  situacion: string       // línea descriptiva para el hero del detalle
  estado: Estado
  problemas?: string[]    // tags de problema (cards con alerta)
  rutinaActiva?: boolean
  sinRutina?: boolean
  inactivo?: boolean
  score?: number          // Zyfit Score
  adherencia?: number     // % adherencia del período (analytics)
  no_leidos?: number      // mensajes del atleta sin leer (badge de chat)
}

export const ATLETAS: Atleta[] = [
  { id: '1', nombre: 'Carlos Méndez',  ultima: 'hace 3 días', situacion: 'Sin actividad hace 3 días',          estado: 'alerta',    problemas: ['Sin check-in', 'Score bajando'],    inactivo: true,  score: 54, adherencia: 42 },
  { id: '2', nombre: 'Lucía Romero',   ultima: 'ayer',        situacion: 'Sin rutina activa desde ayer',        estado: 'pendiente', problemas: ['Sin rutina activa'],                 sinRutina: true, score: 68, adherencia: 61 },
  { id: '3', nombre: 'Diego Fuentes',  ultima: 'hace 6 días', situacion: 'Sin actividad hace 6 días',           estado: 'alerta',    problemas: ['Sin check-in', 'Sin rutina activa'], sinRutina: true, inactivo: true, score: 49, adherencia: 38 },
  { id: '4', nombre: 'Mara Torres',    ultima: 'hace 2 días', situacion: 'Score bajando · última sesión hace 2 días', estado: 'pendiente', problemas: ['Score bajando'],               score: 71, adherencia: 66 },
  { id: '5', nombre: 'Sofía Lagos',    ultima: 'hace 4 h',    situacion: 'Última sesión hace 4 h',              estado: 'al_dia',    rutinaActiva: true, score: 82, adherencia: 88 },
  { id: '6', nombre: 'Andrés Pinto',   ultima: 'ayer',        situacion: 'Última sesión ayer',                  estado: 'al_dia',    rutinaActiva: true, score: 91, adherencia: 94 },
  { id: '7', nombre: 'Valentina Cruz', ultima: 'hace 6 h',    situacion: 'Última sesión hace 6 h',              estado: 'al_dia',    rutinaActiva: true, score: 75, adherencia: 79 },
  { id: '8', nombre: 'Tomás Gil',      ultima: 'hace 8 h',    situacion: 'Última sesión hace 8 h',              estado: 'al_dia',    rutinaActiva: true, score: 88, adherencia: 90 },
]

export const hasAlert = (a: Atleta) => a.estado !== 'al_dia'

export function getAtleta(id?: string): Atleta | undefined {
  return ATLETAS.find((a) => a.id === id)
}
