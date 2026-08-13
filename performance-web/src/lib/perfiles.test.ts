// Test de la capa de perfil por tipo de centro. Se ejecuta directo con Node
// (type-stripping): `node src/lib/perfiles.test.ts`. Mismo patrón que
// squadEdit.test.ts — sin framework, no entra en el bundle.
//
// Lo que se protege acá es sobre todo la regla de compatibilidad: el perfil de
// `equipos` es la línea base y no debe ocultar ni renombrar nada, porque TODOS
// los centros que ya existían migraron a ese tipo. Si alguien le agrega un
// `navOculta` a `equipos`, cientos de paneles pierden un ítem sin aviso.

import { PERFILES, PERFIL_POR_DEFECTO, perfilDe, type TerminoId } from './perfiles.ts'
import type { TipoCentro } from '../types/index.ts'

let fail = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${name}`)
  if (!cond) fail++
}

const TIPOS: TipoCentro[] = ['equipos', 'instituciones', 'atletas']
const TERMINOS: TerminoId[] = [
  'grupo', 'persona', 'personas', 'calendario', 'asistencia', 'informe',
]

// ── Compatibilidad: `equipos` es la línea base intocable ────────────────────

check(
  'equipos no oculta ningún ítem (los centros existentes migraron a este tipo)',
  PERFILES.equipos.navOculta.length === 0,
)
check(
  'equipos no renombra ningún ítem',
  Object.keys(PERFILES.equipos.navEtiquetas).length === 0,
)
check('el perfil por defecto es el de equipos', PERFIL_POR_DEFECTO === PERFILES.equipos)

// ── Resolución del perfil ───────────────────────────────────────────────────

check('perfilDe resuelve cada tipo conocido', TIPOS.every((t) => perfilDe(t) === PERFILES[t]))
check('perfilDe(null) cae a la línea base', perfilDe(null) === PERFIL_POR_DEFECTO)
check('perfilDe(undefined) cae a la línea base', perfilDe(undefined) === PERFIL_POR_DEFECTO)
check(
  'perfilDe con un tipo desconocido cae a la línea base',
  perfilDe('gimnasios' as TipoCentro) === PERFIL_POR_DEFECTO,
)

// ── Vocabulario completo en los tres ────────────────────────────────────────

check(
  'los tres perfiles definen todos los términos',
  TIPOS.every((t) => TERMINOS.every((k) => typeof PERFILES[t].terminos[k] === 'string' && PERFILES[t].terminos[k].length > 0)),
)
check(
  'cada público nombra el grupo a su manera',
  new Set(TIPOS.map((t) => PERFILES[t].terminos.grupo)).size === TIPOS.length,
)

// ── Diferenciación real ─────────────────────────────────────────────────────

check(
  'atletas oculta el simulador (es un concepto de plantel)',
  PERFILES.atletas.navOculta.includes('simulador'),
)
check(
  'atletas oculta la convocatoria',
  PERFILES.atletas.navOculta.includes('convocatoria'),
)
check(
  'instituciones no oculta nada (una academia usa la pizarra igual que un club)',
  PERFILES.instituciones.navOculta.length === 0,
)
check(
  'instituciones renombra Equipo como Categorías',
  PERFILES.instituciones.navEtiquetas.equipo === 'Categorías',
)

// ── Ningún perfil puede ocultar lo que es puro dato ─────────────────────────
// El dashboard, las pruebas y el asesor aplican a los tres públicos. Ocultar
// alguno sería recortar el producto, no adaptarlo.
const IRRENUNCIABLES = ['dashboard', 'pruebas', 'asesor', 'mas']
check(
  'ningún perfil oculta dashboard, pruebas, asesor ni "más"',
  TIPOS.every((t) => IRRENUNCIABLES.every((id) => !PERFILES[t].navOculta.includes(id))),
)

console.log(`\n${fail === 0 ? '✅ TODOS LOS TESTS PASARON' : `❌ ${fail} TEST(S) FALLARON`}`)
process.exitCode = fail === 0 ? 0 : 1
