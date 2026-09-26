// Adaptador del roster real al modelo de vista legado. Los campos que todavía
// no existen en el backend usan centinelas estructurales y quedan marcados con
// metricsAvailable=false; ninguna pantalla de una cuenta real debe mostrarlos.

import type { CenterAthlete } from '@/types'
import type { Athlete, Estado } from './mockSquad'

// Compatibilidad del almacenamiento legado: ya no hay campos sintéticos que
// deban persistirse como overrides en cuentas reales.
export const SYNTH_FIELDS: (keyof Athlete)[] = []

const ESTADO_FROM_API: Record<CenterAthlete['estado'], Estado> = {
  activo: 'ok',
  lesionado: 'baja',
  baja: 'baja',
}

export function athleteFromCenter(dto: CenterAthlete): Athlete {
  const nombre = (dto.nombre || dto.email || 'Atleta').trim()
  return {
    id: String(dto.id),
    userId: dto.athlete,
    metricsAvailable: false,
    nombre,
    dorsal: Number(dto.dorsal) || 0,
    posicion: dto.posicion || 'Sin posición',
    grupo: dto.grupo || 'Sin grupo',
    estado: ESTADO_FROM_API[dto.estado],
    foto: dto.foto || undefined,
    edad: 0,
    nacionalidad: '',
    altura: 0,
    peso: 0,
    pie: 'Derecho',
    radar: {
      velocidad: 0,
      resistencia: 0,
      fuerza: 0,
      potencia: 0,
      agilidad: 0,
      recuperacion: 0,
    },
    acwr: 0,
    bienestar: 0,
    cargaSemanal: 0,
    disponibilidad: 0,
    minutos: 0,
    sesiones: 0,
  }
}
