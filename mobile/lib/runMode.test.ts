import { runModeForEntorno, isIndoorFromMode, isTrailFromParam } from './runMode'

describe('runModeForEntorno (check-in → modo de Free Run)', () => {
  it('interiores → interior', () => {
    expect(runModeForEntorno('interiores')).toBe('interior')
  })
  it('exteriores → exterior', () => {
    expect(runModeForEntorno('exteriores')).toBe('exterior')
  })
  it('null → exterior (default seguro)', () => {
    expect(runModeForEntorno(null)).toBe('exterior')
  })
  it('undefined → exterior', () => {
    expect(runModeForEntorno(undefined)).toBe('exterior')
  })
  it('valor desconocido → exterior', () => {
    expect(runModeForEntorno('aguas_abiertas')).toBe('exterior')
  })
})

describe('isIndoorFromMode (parámetro de navegación → isIndoor)', () => {
  it('"interior" → true', () => {
    expect(isIndoorFromMode('interior')).toBe(true)
  })
  it('"exterior" → false', () => {
    expect(isIndoorFromMode('exterior')).toBe(false)
  })
  it('undefined → false (default seguro: exterior con GPS)', () => {
    expect(isIndoorFromMode(undefined)).toBe(false)
  })
  it('null → false', () => {
    expect(isIndoorFromMode(null)).toBe(false)
  })
  it('array de expo-router → toma el primer elemento', () => {
    expect(isIndoorFromMode(['interior'])).toBe(true)
    expect(isIndoorFromMode(['exterior'])).toBe(false)
  })
})

describe('isTrailFromParam (parámetro de navegación → Trail Running)', () => {
  it('"1" → true', () => {
    expect(isTrailFromParam('1')).toBe(true)
  })
  it('"true" → true', () => {
    expect(isTrailFromParam('true')).toBe(true)
  })
  it('undefined → false (default: no trail)', () => {
    expect(isTrailFromParam(undefined)).toBe(false)
  })
  it('null → false', () => {
    expect(isTrailFromParam(null)).toBe(false)
  })
  it('"0" / valor desconocido → false', () => {
    expect(isTrailFromParam('0')).toBe(false)
    expect(isTrailFromParam('nope')).toBe(false)
  })
  it('array de expo-router → toma el primer elemento', () => {
    expect(isTrailFromParam(['1'])).toBe(true)
    expect(isTrailFromParam(['0'])).toBe(false)
  })
})

describe('round-trip entorno → modo → isIndoor (flujo real check-in → run)', () => {
  it('interiores se mantiene como interior de punta a punta', () => {
    expect(isIndoorFromMode(runModeForEntorno('interiores'))).toBe(true)
  })
  it('exteriores se mantiene como exterior de punta a punta', () => {
    expect(isIndoorFromMode(runModeForEntorno('exteriores'))).toBe(false)
  })
  it('sin entorno seleccionado cae a exterior (con GPS)', () => {
    expect(isIndoorFromMode(runModeForEntorno(null))).toBe(false)
  })
})
