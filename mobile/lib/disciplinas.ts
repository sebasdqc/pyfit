/**
 * disciplinas.ts — Qué disciplinas del check-in tienen motor inteligente real.
 *
 * Todas las disciplinas CARDIOVASCULAR del check-in comparten `path: 'running'`
 * porque el FLUJO es el mismo (elegir entorno → tracking GPS). Eso NO significa
 * que el motor sepa prescribirlas: `backend/ai_running` ancla toda la intensidad
 * en `threshold_pace_s_km` y devuelve objetivos en min/km. Ofrecer
 * "Entrenamiento inteligente" en ciclismo, natación o caminata entregaba una
 * sesión de CARRERA con ritmos que sobre una bici o en una piscina no
 * significan nada — el viento y la pendiente destruyen el ritmo en bici, y en
 * agua directamente no aplica.
 *
 * Este módulo es el ÚNICO lugar donde se decide eso. Cuando exista el motor de
 * ciclismo (con su propio anclaje en FC/potencia, no en ritmo), se suma aquí.
 *
 * Lógica pura, sin React/RN, para poder testearla sin montar la pantalla —
 * mismo criterio que runMode.ts.
 */

/** Disciplinas con motor de prescripción propio hoy. */
export const DISCIPLINAS_MOTOR_INTELIGENTE = ['running', 'trail'] as const

export type DisciplinaConMotor = typeof DISCIPLINAS_MOTOR_INTELIGENTE[number]

/**
 * ¿Esta disciplina puede ofrecer "Entrenamiento inteligente"?
 *
 * Devuelve false para null/undefined y para cualquier disciplina sin motor, de
 * modo que el default seguro sea "solo tracking libre" — nunca prometer una
 * prescripción que el backend no puede producir correctamente.
 */
export function tieneMotorInteligente(disciplina: string | null | undefined): boolean {
  if (!disciplina) return false
  return (DISCIPLINAS_MOTOR_INTELIGENTE as readonly string[]).includes(disciplina)
}
