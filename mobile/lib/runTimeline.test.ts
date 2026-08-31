import { expandirPasos } from './runSteps'
import {
  estadoPaso, estimarDuracionPasoS, offsetsAcumulados, metaTexto,
} from './runTimeline'

// Mismo fixture real de runSteps.test.ts (prescribe_run_session, nivel
// intermedio, umbral 300 s/km): calentamiento 12min, 5×1km @ [270,297] s/km
// con 2min de recuperación, enfriamiento 10min.
const SEG_VO2 = [
  { fase: 'calentamiento', repeticiones: 1, trabajo: { min: 12 }, recuperacion: null,
    pace_objetivo: [342, 387], fc_objetivo: [136, 150], rpe: 4 },
  { fase: 'principal', repeticiones: 5, trabajo: { distancia_km: 1.0 },
    recuperacion: { min: 2, tipo: 'trote suave' },
    pace_objetivo: [270, 297], fc_objetivo: [176, 190], rpe: 9 },
  { fase: 'enfriamiento', repeticiones: 1, trabajo: { min: 10 }, recuperacion: null,
    pace_objetivo: [387, 435], fc_objetivo: [122, 136], rpe: 3 },
]

describe('estadoPaso', () => {
  it('clasifica done/current/upcoming según pasoIdx', () => {
    expect(estadoPaso(0, 3)).toBe('done')
    expect(estadoPaso(2, 3)).toBe('done')
    expect(estadoPaso(3, 3)).toBe('current')
    expect(estadoPaso(4, 3)).toBe('upcoming')
  })
})

describe('estimarDuracionPasoS', () => {
  const pasos = expandirPasos(SEG_VO2)

  it('usa metaDuracionS directo cuando el paso es por tiempo', () => {
    expect(estimarDuracionPasoS(pasos[0])).toBe(12 * 60)   // calentamiento
  })

  it('convierte distancia a segundos con el punto medio del pace objetivo', () => {
    const serie1 = pasos[1]
    const paceMid = (270 + 297) / 2   // 283.5 s/km
    expect(estimarDuracionPasoS(serie1)).toBeCloseTo(paceMid, 5)
  })

  it('pasos manuales sin meta devuelven 0', () => {
    const manual = { ...pasos[0], metaDuracionS: null, metaDistanciaM: null, manual: true }
    expect(estimarDuracionPasoS(manual)).toBe(0)
  })

  it('sin pace objetivo (cold-start) usa el ritmo nominal 360 s/km', () => {
    const sinPace = { ...pasos[1], objetivo: { ...pasos[1].objetivo, paceRange: null } }
    expect(estimarDuracionPasoS(sinPace)).toBe(360)   // 1.0 km × 360 s/km
  })
})

describe('offsetsAcumulados', () => {
  it('cada offset es la suma de las duraciones de los pasos anteriores', () => {
    const pasos = expandirPasos(SEG_VO2)
    const offsets = offsetsAcumulados(pasos)
    expect(offsets[0]).toBe(0)                                       // calentamiento arranca en 0
    expect(offsets[1]).toBe(12 * 60)                                 // serie 1 arranca al terminar calentamiento
    expect(offsets[2]).toBeCloseTo(12 * 60 + (270 + 297) / 2, 5)      // recuperación 1 arranca tras serie 1
    // El offset del último paso (enfriamiento) es la suma de todo lo anterior.
    expect(offsets[offsets.length - 1]).toBeGreaterThan(offsets[offsets.length - 2])
  })

  it('longitud igual a la cantidad de pasos', () => {
    const pasos = expandirPasos(SEG_VO2)
    expect(offsetsAcumulados(pasos)).toHaveLength(pasos.length)
  })
})

describe('metaTexto', () => {
  it('formatea distancia en km si es >= 1000m', () => {
    const pasos = expandirPasos(SEG_VO2)
    expect(metaTexto(pasos[1])).toBe('1.00 km')
  })

  it('formatea duración en min', () => {
    const pasos = expandirPasos(SEG_VO2)
    expect(metaTexto(pasos[0])).toBe('12 min')
  })

  it('paso manual sin meta devuelve "a tu ritmo"', () => {
    const pasos = expandirPasos(SEG_VO2)
    const manual = { ...pasos[0], metaDuracionS: null, metaDistanciaM: null, manual: true }
    expect(metaTexto(manual)).toBe('a tu ritmo')
  })
})
