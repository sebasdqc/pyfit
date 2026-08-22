/**
 * disciplinas.ts — Qué disciplinas del check-in tienen motor inteligente real.
 *
 * Todas las disciplinas CARDIOVASCULAR del check-in comparten `path: 'running'`
 * porque el FLUJO es el mismo (elegir entorno → tracking). Eso NO significa
 * que el motor sepa prescribirlas: cada deporte necesita su propio backend
 * (`ai_running` ancla en `threshold_pace_s_km`, `ai_cycling` en FC/potencia).
 * Ofrecer "Entrenamiento inteligente" en natación o caminata, que no tienen
 * motor, entregaría una sesión ajena con números que ahí no significan nada.
 *
 * Este módulo es el ÚNICO lugar donde se decide eso.
 *
 * ⚠️ 'ciclismo' se sumó 2026-08-22 junto con `mobile/app/(app)/cycling/` +
 * `ride/` (pantallas propias, sin GPS en v1) y la generalización del copy de
 * `checkin/index.tsx` (`esCiclismo` en `renderD4b`/`renderD6`, routing del
 * CTA final) — las tres piezas están ACOPLADAS. Si algún día se suma otro
 * deporte cardio con motor propio, hace falta el mismo trío: pantallas +
 * copy del check-in + esta lista. Sumar solo acá sin lo demás reintroduce el
 * bug que este archivo existe para evitar, por una puerta distinta.
 *
 * Lógica pura, sin React/RN, para poder testearla sin montar la pantalla —
 * mismo criterio que runMode.ts.
 */

/** Disciplinas con motor de prescripción propio hoy. */
export const DISCIPLINAS_MOTOR_INTELIGENTE = ['running', 'trail', 'ciclismo'] as const

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
