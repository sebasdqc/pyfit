// Test de la lógica de edición de atletas. Se ejecuta directo con Node
// (type-stripping): `node src/lib/squadEdit.test.ts`. No entra en el bundle
// (nadie lo importa) ni necesita framework de tests.

import { canEditRole, updateAthlete, validateAthlete } from './squadEdit.ts'
import { SQUAD, type Athlete } from './mockSquad.ts'

// Polyfill mínimo de localStorage para poder testear la persistencia en Node.
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

let fail = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${name}`)
  if (!cond) fail++
}

const base: Athlete = {
  id: 'x', nombre: 'Test Player', dorsal: 10, posicion: 'Mediocentro', estado: 'ok',
  edad: 25, nacionalidad: 'España', altura: 180, peso: 75, pie: 'Derecho', grupo: 'Grupo A',
  radar: { velocidad: 50, resistencia: 50, fuerza: 50, potencia: 50, agilidad: 50, recuperacion: 50 },
  acwr: 1.2, bienestar: 7, cargaSemanal: 600, disponibilidad: 90, minutos: 1800, sesiones: 20,
}
const list: Athlete[] = [base, { ...base, id: 'y', nombre: 'Otro' }]

// Edición de datos demográficos
const r1 = updateAthlete(list, 'x', { nombre: 'Nuevo Nombre', dorsal: 7, posicion: 'Delantero' })
check('actualiza nombre/dorsal/posición', r1[0].nombre === 'Nuevo Nombre' && r1[0].dorsal === 7 && r1[0].posicion === 'Delantero')
check('no afecta a otros atletas', r1[1].nombre === 'Otro')
check('es inmutable (lista y objeto nuevos)', r1 !== list && r1[0] !== base && list[0].nombre === 'Test Player')

// Edición de parámetros (radar) con acotado y merge parcial
const r2 = updateAthlete(list, 'x', { radar: { velocidad: 150, fuerza: -20 } })
check('radar acota >100 a 100', r2[0].radar.velocidad === 100)
check('radar acota <0 a 0', r2[0].radar.fuerza === 0)
check('radar conserva ejes no tocados', r2[0].radar.potencia === 50)

// Acotado de métricas de carga
check('bienestar acota a 10', updateAthlete(list, 'x', { bienestar: 99 })[0].bienestar === 10)
check('acwr no admite negativos', updateAthlete(list, 'x', { acwr: -5 })[0].acwr === 0)
check('disponibilidad acota a 100', updateAthlete(list, 'x', { disponibilidad: 250 })[0].disponibilidad === 100)
check('edad fuera de rango se acota', updateAthlete(list, 'x', { edad: 5 })[0].edad === 14)

// id inexistente → sin cambios
const r5 = updateAthlete(list, 'zzz', { nombre: 'X' })
check('id inexistente no cambia nada', r5[0].nombre === 'Test Player' && r5[1].nombre === 'Otro')

// Permisos por rol
check('admin puede editar', canEditRole('admin'))
check('entrenador (coach) puede editar', canEditRole('coach'))
check('director técnico puede editar', canEditRole('director_tecnico'))
check('atleta NO puede editar', !canEditRole('athlete'))
check('rol vacío/indefinido NO puede editar', !canEditRole(undefined) && !canEditRole(''))

// Validación: valores fuera de rango
const validDraft = { nombre: 'Ok', edad: 25, altura: 180, peso: 75, acwr: 1.2, bienestar: 7, disponibilidad: 90, radar: { velocidad: 80 } }
check('draft válido → sin errores', Object.keys(validateAthlete(validDraft)).length === 0)
check('nombre vacío → error', !!validateAthlete({ nombre: '   ' }).nombre)
check('radar >100 → error en ese eje', !!validateAthlete({ nombre: 'X', radar: { velocidad: 150 } }).velocidad)
check('radar válido → sin error en ese eje', !validateAthlete({ nombre: 'X', radar: { fuerza: 60 } }).fuerza)
check('edad fuera de rango → error', !!validateAthlete({ nombre: 'X', edad: 5 }).edad)
check('acwr fuera de rango → error', !!validateAthlete({ nombre: 'X', acwr: 4 }).acwr)
check('bienestar en rango → sin error', !validateAthlete({ nombre: 'X', bienestar: 7 }).bienestar)
check('disponibilidad >100 → error', !!validateAthlete({ nombre: 'X', disponibilidad: 250 }).disponibilidad)

// Persistencia (localStorage): la edición sobrevive a una "recarga"
const { loadSquad, saveSquad } = await import('./squadStore.ts')
check('loadSquad sin overrides = base', loadSquad().length === SQUAD.length)
const editado = updateAthlete(loadSquad(), SQUAD[0].id, { nombre: 'Editado', editadoPor: 'Tester', editadoEn: '2026-06-06T00:00:00Z' })
saveSquad(editado)
const recargado = loadSquad()
check('persiste la edición tras recargar', recargado[0].nombre === 'Editado' && recargado[0].editadoPor === 'Tester')
check('no toca atletas no editados al persistir', recargado[1].nombre === SQUAD[1].nombre)

console.log(`\n${fail === 0 ? '✅ TODOS LOS TESTS PASARON' : `❌ ${fail} TEST(S) FALLARON`}`)
process.exitCode = fail === 0 ? 0 : 1
