// Frases para el "Día de descanso" — cercanas, humanas y accionables (no científicas).
// El descanso es parte del entrenamiento; estas frases lo celebran sin culpa.
// Se usan en el resumen del check-in de descanso y en la tarjeta para compartir.

export const REST_PHRASES: string[] = [
  'Hoy descansas para volver más fuerte mañana.',
  'Descansar también es entrenar.',
  'El descanso de hoy es la fuerza de mañana.',
  'Tu cuerpo te dio todo esta semana. Hoy le toca recibir.',
  'Frenar a tiempo es lo que te mantiene en el juego.',
  'No estás perdiendo el ritmo: estás recargando energía.',
  'Date permiso de parar. Tu cuerpo lo convierte en progreso.',
  'Los grandes también descansan. Por eso siguen siendo grandes.',
  'Recargar también es avanzar.',
  'Hoy no se trata de hacer más, sino de recuperarte mejor.',
  'Descansa sin culpa: te lo ganaste.',
  'El progreso se cocina en los días de descanso.',
  'Escuchar a tu cuerpo es la disciplina que pocos dominan. Hoy la practicas.',
  'Un día de pausa hoy son muchos kilómetros mañana.',
  'Respira, suelta y recupérate. Vuelves con todo.',
]

/**
 * Devuelve una frase de descanso. Determinística por día (rota a lo largo del año):
 * estable durante el día —el resumen y la tarjeta muestran la misma— y distinta
 * cada día para que no se repita siempre.
 */
export function getRestPhrase(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  return REST_PHRASES[((dayOfYear % REST_PHRASES.length) + REST_PHRASES.length) % REST_PHRASES.length]
}
