import { tieneMotorInteligente, DISCIPLINAS_MOTOR_INTELIGENTE } from './disciplinas'

describe('tieneMotorInteligente (disciplina → puede ofrecer sesión generada)', () => {
  it('running → true (es el motor que existe hoy)', () => {
    expect(tieneMotorInteligente('running')).toBe(true)
  })
  it('trail → true (es carrera: el ritmo en min/km sigue siendo válido)', () => {
    expect(tieneMotorInteligente('trail')).toBe(true)
  })

  // El bug que este módulo cierra sigue vigente para estas 2: comparten path
  // 'running' en el check-in y por eso recibirían una sesión de CARRERA, con
  // objetivos en min/km derivados de threshold_pace_s_km, que no significan
  // nada fuera de correr — sin motor propio, siguen yendo solo a libre.
  it('ciclismo → true (motor propio desde 2026-08-22: ai_cycling, ancla FC/potencia)', () => {
    expect(tieneMotorInteligente('ciclismo')).toBe(true)
  })
  it('natacion → false (no hay motor de natación)', () => {
    expect(tieneMotorInteligente('natacion')).toBe(false)
  })
  it('caminata → false (no hay motor de caminata)', () => {
    expect(tieneMotorInteligente('caminata')).toBe(false)
  })

  it('null → false (default seguro: solo tracking libre)', () => {
    expect(tieneMotorInteligente(null)).toBe(false)
  })
  it('undefined → false', () => {
    expect(tieneMotorInteligente(undefined)).toBe(false)
  })
  it('cadena vacía → false', () => {
    expect(tieneMotorInteligente('')).toBe(false)
  })
  it('disciplina desconocida → false (allowlist, no denylist)', () => {
    expect(tieneMotorInteligente('remo')).toBe(false)
  })

  it('disciplinas de fuerza/movilidad → false (no pasan por este flujo)', () => {
    for (const d of ['gym', 'casa', 'calistenia', 'hiit', 'yoga', 'stretching']) {
      expect(tieneMotorInteligente(d)).toBe(false)
    }
  })
})

describe('DISCIPLINAS_MOTOR_INTELIGENTE (contrato del catálogo)', () => {
  it('toda entrada del catálogo pasa el predicado', () => {
    for (const d of DISCIPLINAS_MOTOR_INTELIGENTE) {
      expect(tieneMotorInteligente(d)).toBe(true)
    }
  })
  it('ciclismo SÍ está en el catálogo — tiene motor propio (ai_cycling)', () => {
    expect(DISCIPLINAS_MOTOR_INTELIGENTE).toContain('ciclismo')
  })
  it('natacion/caminata NO están — sin motor propio, no inventar uno', () => {
    expect(DISCIPLINAS_MOTOR_INTELIGENTE).not.toContain('natacion')
    expect(DISCIPLINAS_MOTOR_INTELIGENTE).not.toContain('caminata')
  })
})
