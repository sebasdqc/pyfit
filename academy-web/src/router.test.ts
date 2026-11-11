// El router carga las páginas bajo demanda con `page(() => import('...'), 'Nombre')`.
// TypeScript no detecta un nombre mal escrito (el módulo se tipa como any): en
// producción sería una página en blanco. Este test comprueba que cada par
// módulo/nombre apunta a un componente exportado de verdad.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const fuente = readFileSync(path.join(aqui, 'router.tsx'), 'utf-8')
const pares = [...fuente.matchAll(/page\(\(\) => import\('@\/(pages\/\w+)'\), '(\w+)'\)/g)].map((m) => ({
  modulo: m[1],
  nombre: m[2],
}))

describe('router: páginas con carga bajo demanda', () => {
  it('detecta las páginas (si esto falla, cambió el formato del router)', () => {
    expect(pares.length).toBeGreaterThan(30)
  })

  it.each(pares)('$modulo exporta $nombre como componente', async ({ modulo, nombre }) => {
    const mod = await import(/* @vite-ignore */ path.join(aqui, `${modulo}.tsx`))
    expect(typeof mod[nombre]).toBe('function')
  })
})
