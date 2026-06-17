/**
 * Config de jest para tests de lógica pura (sin React Native).
 *
 * Usamos entorno `node` + babel-jest con el babel del proyecto (babel-preset-expo,
 * que ya transpila TypeScript). No cargamos el preset `jest-expo` porque los tests
 * actuales prueban helpers puros (p. ej. lib/runMode.ts) y no montan componentes;
 * así el suite arranca rápido y sin depender del entorno nativo. `jest-expo` queda
 * instalado por si más adelante se añaden tests de componentes.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/lib/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
}
