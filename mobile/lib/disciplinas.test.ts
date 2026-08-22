import { tieneMotorInteligente, DISCIPLINAS_MOTOR_INTELIGENTE } from './disciplinas'

describe('tieneMotorInteligente (disciplina → puede ofrecer sesión generada)', () => {
  it('running → true (es el motor que existe hoy)', () => {
    expect(tieneMotorInteligente('running')).toBe(true)
  })
  it('trail → true (es carrera: el ritmo en min/km sigue siendo válido)', () => {
    expect(tieneMotorInteligente('trail')).toBe(true)
  })

  // El bug que este módulo cierra: estas 3 disciplinas comparten path 'running'
  // en el check-in y por eso recibían una sesión de CARRERA, con objetivos en
  // min/km derivados de threshold_pace_s_km, que no significan nada fuera de correr.
  it('ciclismo → false (el ritmo en bici depende de viento y pendiente)', () => {
    expect(tieneMotorInteligente('ciclismo')).toBe(false)
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
  it('ciclismo NO está en el catálogo hasta que exista su motor propio', () => {
    // Este test debe fallar (y actualizarse a propósito) el día que se sume el
    // motor de ciclismo con anclaje en FC/potencia — no antes.
    expect(DISCIPLINAS_MOTOR_INTELIGENTE).not.toContain('ciclismo')
  })
})
