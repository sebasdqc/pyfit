/**
 * runMode.ts — Lógica pura (sin React/RN) del modo de Free Run.
 *
 * El modo interior/exterior se elige en el check-in (pantalla anterior) y se
 * propaga al Free Run vía parámetro de navegación, en vez de un toggle en la
 * propia pantalla de "Empezar". Aislamos el mapeo aquí para poder testearlo sin
 * montar la pantalla ni el entorno nativo.
 */

export type RunMode = 'interior' | 'exterior'

/**
 * Mapea el `entornoCardio` elegido en el check-in (running) al modo del Free Run.
 * Solo 'interiores' es interior; cualquier otra cosa (incl. null) cae a exterior,
 * que es el caso por defecto y el único que usa GPS/mapa.
 */
export function runModeForEntorno(entorno: string | null | undefined): RunMode {
  return entorno === 'interiores' ? 'interior' : 'exterior'
}

/**
 * Determina si el Free Run es en interior a partir del parámetro de navegación
 * `modo`. expo-router puede entregar el parámetro como string o string[]; aquí
 * normalizamos ambos. Default seguro: exterior (false) si falta o es desconocido.
 */
export function isIndoorFromMode(modo: string | string[] | null | undefined): boolean {
  const m = Array.isArray(modo) ? modo[0] : modo
  return m === 'interior'
}
