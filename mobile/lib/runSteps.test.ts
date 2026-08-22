import { expandirPasos, progresoPaso, pasoCompletado, totalesPlanificados } from './runSteps'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures copiados de la salida REAL de
// ai_running.training_science_running.prescribe_run_session (nivel intermedio,
// umbral 300 s/km, FCmáx 190, FCreposo 55). No son inventados: si el backend
// cambia de forma, estos tests deben fallar.
// ─────────────────────────────────────────────────────────────────────────────

const SEG_VO2 = [
  { fase: 'calentamiento', repeticiones: 1, trabajo: { min: 12 }, recuperacion: null,
    pace_objetivo: [342, 387], fc_objetivo: [136, 150], rpe: 4 },
  { fase: 'principal', repeticiones: 5, trabajo: { distancia_km: 1.0 },
    recuperacion: { min: 2, tipo: 'trote suave' },
    pace_objetivo: [270, 297], fc_objetivo: [176, 190], rpe: 9 },
  { fase: 'enfriamiento', repeticiones: 1, trabajo: { min: 10 }, recuperacion: null,
    pace_objetivo: [387, 435], fc_objetivo: [122, 136], rpe: 3 },
]

// Cuestas: la recuperación NO trae duración — es "bajar trotando", que depende
// de la cuesta. Es el caso que obliga a tener pasos manuales.
const SEG_HILLS = [
  { fase: 'calentamiento', repeticiones: 1, trabajo: { min: 12 }, recuperacion: null,
    pace_objetivo: [342, 387], fc_objetivo: [136, 150], rpe: 4 },
  { fase: 'principal', repeticiones: 8, trabajo: { seg: 45 },
    recuperacion: { tipo: 'bajar trotando' },
    pace_objetivo: [297, 318], fc_objetivo: [163, 176], rpe: 8 },
  { fase: 'enfriamiento', repeticiones: 1, trabajo: { min: 10 }, recuperacion: null,
    pace_objetivo: [387, 435], fc_objetivo: [122, 136], rpe: 3 },
]

const SEG_EASY = [
  { fase: 'principal', repeticiones: 1, trabajo: { distancia_km: 6.9 }, recuperacion: null,
    pace_objetivo: [342, 387], fc_objetivo: [136, 150], rpe: 4 },
]

// Strides: DOS segmentos 'principal' — rodaje base (reps 1) + series cortas (reps 6).
const SEG_STRIDES = [
  { fase: 'principal', repeticiones: 1, trabajo: { distancia_km: 3.0 }, recuperacion: null,
    pace_objetivo: [342, 387], fc_objetivo: [136, 150], rpe: 4 },
  { fase: 'principal', repeticiones: 6, trabajo: { seg: 20 },
    recuperacion: { seg: 60, tipo: 'caminar/trote' },
    pace_objetivo: [270, 297], fc_objetivo: [176, 190], rpe: 9 },
]

// Ciclismo (threshold, con FTP) — copiado de la salida REAL de
// ai_cycling.training_science_cycling.prescribe_ride_session (FTHR 165,
// FTP 250, nivel intermedio, fase build). Sin pace_objetivo — ciclismo no
// tiene ritmo, tiene potencia. Sin trabajo por distancia — todo en tiempo.
const SEG_CYCLING_THRESHOLD = [
  { fase: 'calentamiento', repeticiones: 1, trabajo: { min: 15 }, recuperacion: null,
    fc_objetivo: [134, 147], potencia_objetivo: [140, 188], rpe: 4 },
  { fase: 'principal', repeticiones: 4, trabajo: { min: 10 },
    recuperacion: { min: 5, tipo: 'pedaleo suave' },
    fc_objetivo: [162, 170], potencia_objetivo: [238, 262], rpe: 8 },
  { fase: 'enfriamiento', repeticiones: 1, trabajo: { min: 10 }, recuperacion: null,
    fc_objetivo: [0, 134], potencia_objetivo: [0, 138], rpe: 3 },
]

// Mismo threshold, pero SIN FTP (el caso más común: sin potenciómetro) —
// derive_zones deja zonas.power = None y el motor no manda potencia_objetivo.
const SEG_CYCLING_SIN_POTENCIA = [
  { fase: 'calentamiento', repeticiones: 1, trabajo: { min: 15 }, recuperacion: null,
    fc_objetivo: [134, 147], potencia_objetivo: null, rpe: 4 },
  { fase: 'principal', repeticiones: 4, trabajo: { min: 10 },
    recuperacion: { min: 5, tipo: 'pedaleo suave' },
    fc_objetivo: [162, 170], potencia_objetivo: null, rpe: 8 },
]

describe('expandirPasos — intervalos VO2máx (5 × 1 km)', () => {
  const pasos = expandirPasos(SEG_VO2)

  it('despliega calentamiento + 5 trabajos + 4 recuperaciones + enfriamiento', () => {
    expect(pasos).toHaveLength(11)
  })

  it('la recuperación va SOLO entre series, nunca tras la última', () => {
    const trabajos = pasos.filter(p => p.tipo === 'trabajo')
    const recus = pasos.filter(p => p.tipo === 'recuperacion')
    expect(trabajos).toHaveLength(5)
    expect(recus).toHaveLength(4)
    // El último paso antes del enfriamiento es trabajo, no recuperación.
    expect(pasos[pasos.length - 2].tipo).toBe('trabajo')
    expect(pasos[pasos.length - 1].tipo).toBe('enfriamiento')
  })

  it('numera las series de forma legible', () => {
    expect(pasos[1].etiqueta).toBe('Serie 1 de 5')
    expect(pasos[9].etiqueta).toBe('Serie 5 de 5')
    expect(pasos[1].repIndex).toBe(1)
    expect(pasos[1].repTotal).toBe(5)
  })

  it('convierte 1.0 km de trabajo a 1000 m y 2 min de recuperación a 120 s', () => {
    expect(pasos[1].metaDistanciaM).toBe(1000)
    expect(pasos[1].metaDuracionS).toBeNull()
    expect(pasos[2].metaDuracionS).toBe(120)
    expect(pasos[2].metaDistanciaM).toBeNull()
  })

  it('propaga ritmo, FC y RPE al paso de trabajo', () => {
    expect(pasos[1].objetivo.paceRange).toEqual([270, 297])
    expect(pasos[1].objetivo.hrRange).toEqual([176, 190])
    expect(pasos[1].objetivo.rpe).toBe(9)
  })

  it('el calentamiento son 12 min y no es una serie', () => {
    expect(pasos[0].etiqueta).toBe('Calentamiento')
    expect(pasos[0].metaDuracionS).toBe(720)
    expect(pasos[0].repIndex).toBeNull()
  })

  it('todos los ids son únicos (sirven de key de React)', () => {
    expect(new Set(pasos.map(p => p.id)).size).toBe(pasos.length)
  })
})

describe('expandirPasos — cuestas (recuperación sin duración)', () => {
  const pasos = expandirPasos(SEG_HILLS)

  it('marca la recuperación como manual: no hay tiempo que contar', () => {
    const rec = pasos.find(p => p.tipo === 'recuperacion')!
    expect(rec.manual).toBe(true)
    expect(rec.metaDuracionS).toBeNull()
    expect(rec.metaDistanciaM).toBeNull()
    expect(rec.etiqueta).toBe('Recuperación · bajar trotando')
  })

  it('el trabajo por tiempo (45 s) NO es manual', () => {
    const trabajo = pasos.find(p => p.tipo === 'trabajo')!
    expect(trabajo.manual).toBe(false)
    expect(trabajo.metaDuracionS).toBe(45)
  })

  it('8 repeticiones → 8 trabajos y 7 recuperaciones', () => {
    expect(pasos.filter(p => p.tipo === 'trabajo')).toHaveLength(8)
    expect(pasos.filter(p => p.tipo === 'recuperacion')).toHaveLength(7)
  })
})

describe('expandirPasos — sesiones continuas y casos borde', () => {
  it('easy: un solo bloque principal de 6900 m', () => {
    const pasos = expandirPasos(SEG_EASY)
    expect(pasos).toHaveLength(1)
    expect(pasos[0].etiqueta).toBe('Bloque principal')
    expect(pasos[0].metaDistanciaM).toBe(6900)
    expect(pasos[0].repIndex).toBeNull()
  })

  it('strides: rodaje base + 6 series con recuperación de 60 s', () => {
    const pasos = expandirPasos(SEG_STRIDES)
    // 1 rodaje + 6 series + 5 recuperaciones
    expect(pasos).toHaveLength(12)
    expect(pasos[0].etiqueta).toBe('Bloque principal')
    expect(pasos[1].etiqueta).toBe('Serie 1 de 6')
    expect(pasos[2].metaDuracionS).toBe(60)
    expect(pasos[2].etiqueta).toBe('Recuperación · caminar/trote')
  })

  it('sesión de descanso (segmentos vacíos) → sin pasos', () => {
    expect(expandirPasos([])).toEqual([])
  })

  it('estructura ausente o inválida → sin pasos, sin lanzar', () => {
    expect(expandirPasos(undefined)).toEqual([])
    expect(expandirPasos(null)).toEqual([])
    expect(expandirPasos('no soy un array')).toEqual([])
    expect(expandirPasos({ fase: 'principal' })).toEqual([])
  })

  it('cold-start (sin zonas): rpe presente, ritmo y FC en null', () => {
    const pasos = expandirPasos([
      { fase: 'principal', repeticiones: 1, trabajo: { distancia_km: 5 },
        recuperacion: null, pace_objetivo: null, fc_objetivo: null, rpe: 4 },
    ])
    expect(pasos[0].objetivo.paceRange).toBeNull()
    expect(pasos[0].objetivo.hrRange).toBeNull()
    expect(pasos[0].objetivo.rpe).toBe(4)
  })

  it('un segmento sin trabajo utilizable queda manual (no se inventa una meta)', () => {
    const pasos = expandirPasos([
      { fase: 'principal', repeticiones: 1, trabajo: {}, recuperacion: null, rpe: 5 },
    ])
    expect(pasos[0].manual).toBe(true)
  })
})

describe('expandirPasos — ciclismo (mismo módulo, sin cambios propios)', () => {
  it('lee potencia_objetivo, que running nunca manda', () => {
    const pasos = expandirPasos(SEG_CYCLING_THRESHOLD)
    const principal = pasos.find(p => p.tipo === 'trabajo')!
    expect(principal.objetivo.powerRange).toEqual([238, 262])
    expect(principal.objetivo.hrRange).toEqual([162, 170])
    expect(principal.objetivo.paceRange).toBeNull()   // ciclismo no tiene ritmo
  })

  it('todo en tiempo — nunca hay metaDistanciaM en un segmento de ciclismo', () => {
    const pasos = expandirPasos(SEG_CYCLING_THRESHOLD)
    for (const p of pasos) {
      expect(p.metaDistanciaM).toBeNull()
      if (!p.manual) expect(p.metaDuracionS).toBeGreaterThan(0)
    }
  })

  it('4 repeticiones → 4 trabajos y 3 recuperaciones de "pedaleo suave"', () => {
    const pasos = expandirPasos(SEG_CYCLING_THRESHOLD)
    const trabajos = pasos.filter(p => p.tipo === 'trabajo')
    const recus = pasos.filter(p => p.tipo === 'recuperacion')
    expect(trabajos).toHaveLength(4)
    expect(recus).toHaveLength(3)
    expect(recus[0].etiqueta).toBe('Recuperación · pedaleo suave')
  })

  it('sin potenciómetro (el caso más común): powerRange null, hrRange presente', () => {
    // Los pasos de RECUPERACIÓN nunca traen objetivo (rpe=0, todo null) — se
    // filtran acá; lo que importa es que los de TRABAJO tengan FC sin potencia.
    const pasos = expandirPasos(SEG_CYCLING_SIN_POTENCIA).filter(p => p.tipo !== 'recuperacion')
    for (const p of pasos) {
      expect(p.objetivo.powerRange).toBeNull()
      expect(p.objetivo.hrRange).not.toBeNull()
      expect(p.objetivo.rpe).toBeGreaterThan(0)
    }
  })
})

describe('progresoPaso / pasoCompletado', () => {
  const [, serie, recu] = expandirPasos(SEG_VO2)   // serie = 1000 m, recu = 120 s

  it('mide progreso por distancia cuando la meta es distancia', () => {
    expect(progresoPaso(serie, 500, 0)).toBeCloseTo(0.5)
    expect(progresoPaso(serie, 1000, 0)).toBe(1)
  })

  it('mide progreso por tiempo cuando la meta es tiempo', () => {
    expect(progresoPaso(recu, 0, 60)).toBeCloseTo(0.5)
    expect(progresoPaso(recu, 0, 120)).toBe(1)
  })

  it('acota el progreso a [0, 1] aunque se pase de la meta', () => {
    expect(progresoPaso(serie, 5000, 0)).toBe(1)
    expect(progresoPaso(serie, -50, 0)).toBe(0)
  })

  it('completa el paso al alcanzar la meta, no antes', () => {
    expect(pasoCompletado(serie, 999, 0)).toBe(false)
    expect(pasoCompletado(serie, 1000, 0)).toBe(true)
    expect(pasoCompletado(serie, 1200, 0)).toBe(true)
  })

  it('un paso manual NUNCA se autocompleta — lo cierra el usuario', () => {
    const recHills = expandirPasos(SEG_HILLS).find(p => p.manual)!
    expect(pasoCompletado(recHills, 99999, 99999)).toBe(false)
    expect(progresoPaso(recHills, 99999, 99999)).toBe(0)
  })
})

describe('totalesPlanificados', () => {
  it('suma las metas de distancia y tiempo por separado', () => {
    const t = totalesPlanificados(expandirPasos(SEG_VO2))
    expect(t.distanciaM).toBe(5000)                  // 5 × 1000 m
    expect(t.duracionS).toBe(720 + 4 * 120 + 600)    // calent. + 4 recu + enfr.
  })

  it('una sesión sin pasos da totales en cero', () => {
    expect(totalesPlanificados([])).toEqual({ distanciaM: 0, duracionS: 0 })
  })
})
