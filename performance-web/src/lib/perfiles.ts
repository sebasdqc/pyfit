// Perfil de producto por tipo de centro.
//
// Un club, un colegio y un atleta individual no usan el mismo producto, aunque
// compartan el 95% del código. En vez de forkear el panel en tres, esta capa
// describe qué cambia para cada público:
//
//   · navOculta     — ítems de la barra lateral que no aplican a ese público
//   · navEtiquetas  — el mismo destino, nombrado como lo nombra cada uno
//   · terminos      — vocabulario transversal (ver useTermino)
//
// ⚠️ Esto NO es control de acceso. Ocultar un ítem es relevancia, no seguridad:
// el límite real sigue siendo `can_access_module` en el servidor, y el gating
// por membresía (`canSeeModule`) sigue corriendo aparte y antes que esto.
//
// `equipos` es la línea base: es el panel que existía antes de esta capa, así
// que su perfil no oculta ni renombra nada y los centros ya existentes (que
// migraron a `tipo='equipos'`) no ven ningún cambio.

import type { TipoCentro } from '@/types'

// Conceptos que cambian de nombre según el público. El id es el concepto, no
// la palabra: `grupo` es "el conjunto sobre el que trabajo", que para un club
// es el plantel, para un colegio son sus categorías y para un atleta es su
// propia temporada.
export type TerminoId =
  | 'grupo'
  | 'persona'
  | 'personas'
  | 'calendario'
  | 'asistencia'
  | 'informe'

export interface PerfilCentro {
  navOculta: string[]
  navEtiquetas: Record<string, string>
  terminos: Record<TerminoId, string>
  // Tipos de evento del calendario que este público nombra distinto. Clave =
  // id del tipo (ver lib/calendar.ts TIPO_META); vacío = se usa la etiqueta
  // por defecto. Solo la etiqueta cambia: el dato guardado es el mismo.
  eventos: Record<string, string>
}

export const PERFILES: Record<TipoCentro, PerfilCentro> = {
  // ── Clubes y centros de alto rendimiento ──────────────────────────────────
  // Línea base: el panel tal cual venía. No ocultar ni renombrar nada acá es
  // lo que garantiza que la migración de los centros existentes sea invisible.
  equipos: {
    // Categorías y protección de datos son destinos de institución educativa.
    navOculta: ['categorias', 'proteccion'],
    navEtiquetas: {},
    terminos: {
      grupo: 'Plantel',
      persona: 'Jugador',
      personas: 'Jugadores',
      calendario: 'Fixture',
      asistencia: 'Convocatoria',
      informe: 'Informe técnico',
    },
    eventos: {},
  },

  // ── Escuelas y academias deportivas ───────────────────────────────────────
  // No se oculta nada: una academia de fútbol usa la pizarra táctica igual que
  // un club. Lo que cambia de entrada es el idioma — un colegio no tiene
  // "jugadores" ni "fixture", tiene alumnos y año lectivo.
  instituciones: {
    navOculta: [],
    navEtiquetas: {
      equipo: 'Categorías',
      calendario: 'Año lectivo',
      convocatoria: 'Presentismo',
    },
    terminos: {
      grupo: 'Categorías',
      persona: 'Alumno',
      personas: 'Alumnos',
      calendario: 'Año lectivo',
      asistencia: 'Presentismo',
      informe: 'Boletín',
    },
    // Una academia sí juega partidos: no hay nada que renombrar acá.
    eventos: {},
  },

  // ── Atletas individuales con su propio cuerpo técnico ─────────────────────
  // El único público donde sí sobra parte del panel: la pizarra táctica y la
  // convocatoria son conceptos de plantel y no significan nada para una sola
  // persona. El resto (carga, forma, pruebas, asesor) aplica igual.
  atletas: {
    navOculta: ['simulador', 'convocatoria', 'categorias', 'proteccion'],
    navEtiquetas: {
      dashboard: 'Mi temporada',
      equipo: 'Mi ficha',
      calendario: 'Competencias',
    },
    terminos: {
      grupo: 'Mi temporada',
      persona: 'Atleta',
      personas: 'Atletas',
      calendario: 'Competencias',
      asistencia: 'Asistencia',
      informe: 'Informe',
    },
    // Un atleta individual no juega contra un rival: compite. Los campos de
    // rival y localía tampoco se le piden (ver CalendarioPage).
    eventos: { partido: 'Competencia' },
  },
}

// Perfil por defecto cuando todavía no se resolvió el centro activo (primer
// render, o una cuenta sin centros): la línea base, nunca un panel recortado.
export const PERFIL_POR_DEFECTO = PERFILES.equipos

export function perfilDe(tipo: TipoCentro | null | undefined): PerfilCentro {
  return (tipo && PERFILES[tipo]) || PERFIL_POR_DEFECTO
}
