// Constantes y copy compartidos entre las páginas públicas de Zyfit
// Performance (Landing, Precio, Para quién) — evita repetir el mismo texto
// de módulos/contacto/logo en cada archivo de página nueva.

import type { IconName } from '@/components/Icon'

export const CONTACT_HREF = 'https://pyfit.app'
export const LOGO_IMAGE = '/Logo-Zyfit-Blanco.png'

export const MODULES: { name: string; icon: IconName; body: string }[] = [
  {
    name: 'Rendimiento',
    icon: 'rendimiento',
    body: 'Carga interna, forma (fitness-fatiga) y ACWR con seguimiento por atleta y por equipo.',
  },
  {
    name: 'Lesiones',
    icon: 'lesiones',
    body: 'Registro con mapa corporal, seguimiento de recuperación y contexto de riesgo para el resto del panel.',
  },
  {
    name: 'Test físicos',
    icon: 'tests',
    body: 'Baterías con las fórmulas de siempre —Bangsbo IR2, Draper & Whyte RAST, entre otras— calculadas en el servidor.',
  },
  {
    name: 'Planificación',
    icon: 'planificacion',
    body: 'Meso y microciclos por equipo, con un asesor de solo lectura que sugiere ajustes según carga y lesiones.',
  },
  {
    name: 'Psicológico',
    icon: 'psicologico',
    body: 'BRUMS/POMS, RESTQ-Sport, CSAI-2 y ABQ — psicometría deportiva junto al resto de los datos del atleta.',
  },
  {
    name: 'Simulador táctico',
    icon: 'simulador',
    body: 'Pizarra táctica animada, fútbol o futsal, para preparar y compartir jugadas con el plantel.',
  },
  {
    name: 'Calendario',
    icon: 'calendario',
    body: 'Torneos, concentraciones, partidos y entrenamientos de toda la temporada en una sola línea de tiempo.',
  },
]
