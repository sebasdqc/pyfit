/**
 * coachTypes.ts — Tipos compartidos de la cartera del coach + helper de estado.
 *
 * La forma `Atleta` es la que devuelven los endpoints reales del portal
 * (GET /api/coach/atletas/, detalle, analytics) y la que consumen las pantallas.
 * Ya no contiene datos mock: la cartera es 100% real.
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

export const hasAlert = (a: Atleta) => a.estado !== 'al_dia'
