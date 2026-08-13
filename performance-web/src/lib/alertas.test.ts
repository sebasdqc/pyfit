// Test de las reglas de alerta. `node src/lib/alertas.test.ts`.
//
// Estas reglas estaban embebidas en el dashboard de equipo como una cadena de
// `else if`, y se extrajeron para que el dashboard de atleta individual usara
// EXACTAMENTE los mismos umbrales. La mitad de este archivo existe para
// demostrar que la extracción no cambió el comportamiento: `alertaPrincipal`
// tiene que elegir lo mismo que elegía aquella cadena, en el mismo orden de
// prioridad (ACWR crítico → baja → bienestar bajo → ACWR alto → duda).

import { alertaPrincipal, alertasDeAtleta } from './alertas.ts'
import type { Athlete } from './mockSquad.ts'

let fail = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${name}`)
  if (!cond) fail++
}

const base: Athlete = {
  id: 'x', nombre: 'Test', dorsal: 10, posicion: 'Mediocentro', estado: 'ok',
  edad: 25, nacionalidad: 'España', altura: 180, peso: 75, pie: 'Derecho', grupo: 'Grupo A',
  radar: { velocidad: 50, resistencia: 50, fuerza: 50, potencia: 50, agilidad: 50, recuperacion: 50 },
  acwr: 1.0, bienestar: 8, cargaSemanal: 600, disponibilidad: 90, minutos: 1800, sesiones: 20,
}
const con = (p: Partial<Athlete>): Athlete => ({ ...base, ...p })

// ── Atleta sin nada que reportar ────────────────────────────────────────────

check('un atleta en rango no genera alertas', alertasDeAtleta(base).length === 0)
check('alertaPrincipal devuelve null si no hay alertas', alertaPrincipal(base) === null)

// ── Cada regla por separado ─────────────────────────────────────────────────

check('ACWR ≥1.50 dispara alerta de carga', alertaPrincipal(con({ acwr: 1.6 }))?.mod === 'acwr')
check('ACWR ≥1.30 dispara alerta de carga', alertaPrincipal(con({ acwr: 1.35 }))?.mod === 'acwr')
check('ACWR 1.29 NO dispara alerta', alertasDeAtleta(con({ acwr: 1.29 })).length === 0)
check('estado baja dispara alerta de lesión', alertaPrincipal(con({ estado: 'baja' }))?.mod === 'lesion')
check('estado duda dispara alerta de lesión', alertaPrincipal(con({ estado: 'duda' }))?.mod === 'lesion')
check('bienestar <6 dispara alerta psicológica', alertaPrincipal(con({ bienestar: 5.2 }))?.mod === 'psico')
check('bienestar 6.0 NO dispara alerta', alertasDeAtleta(con({ bienestar: 6 })).length === 0)

// ── Prioridad: debe coincidir con la vieja cadena de else-if ────────────────

check(
  'ACWR crítico gana sobre baja',
  alertaPrincipal(con({ acwr: 1.6, estado: 'baja' }))?.mod === 'acwr',
)
check(
  'baja gana sobre bienestar bajo',
  alertaPrincipal(con({ estado: 'baja', bienestar: 4 }))?.mod === 'lesion',
)
check(
  'bienestar bajo gana sobre ACWR alto (no crítico)',
  alertaPrincipal(con({ acwr: 1.35, bienestar: 5 }))?.mod === 'psico',
)
check(
  'ACWR alto gana sobre duda',
  alertaPrincipal(con({ acwr: 1.35, estado: 'duda' }))?.mod === 'acwr',
)

// ── La diferencia deliberada entre las dos vistas ───────────────────────────
// El equipo se queda con una alerta por persona; al atleta se le muestran
// todas las que le aplican.

const multiple = con({ acwr: 1.6, estado: 'duda', bienestar: 4.5 })
check('un atleta puede acumular varias alertas', alertasDeAtleta(multiple).length === 3)
check(
  'vienen ordenadas de más a menos urgente',
  alertasDeAtleta(multiple).map((a) => a.mod).join(',') === 'acwr,psico,lesion',
)
check(
  'alertaPrincipal se queda solo con la primera',
  alertaPrincipal(multiple)?.mod === alertasDeAtleta(multiple)[0].mod,
)

// ── Los rangos de severidad no se pisan entre reglas ────────────────────────
// Es lo que garantiza el orden de prioridad: si dos reglas solaparan sus
// severidades, el desempate pasaría a depender del orden de inserción.

const sev = (a: Athlete) => alertasDeAtleta(a)[0].sev
check(
  'las severidades respetan la jerarquía de las reglas',
  sev(con({ acwr: 1.6 })) > sev(con({ estado: 'baja' })) &&
    sev(con({ estado: 'baja' })) > sev(con({ bienestar: 5.9 })) &&
    sev(con({ bienestar: 1 })) > sev(con({ acwr: 1.3 })) &&
    sev(con({ acwr: 1.3 })) > sev(con({ estado: 'duda' })),
)

console.log(`\n${fail === 0 ? '✅ TODOS LOS TESTS PASARON' : `❌ ${fail} TEST(S) FALLARON`}`)
process.exitCode = fail === 0 ? 0 : 1
