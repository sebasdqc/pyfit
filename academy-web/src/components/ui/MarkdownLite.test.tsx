// MarkdownLite renderiza contenido que escriben instructores: lo crítico es que
// ese texto NUNCA pueda inyectar HTML ni enlaces peligrosos, y que el contenido
// viejo sin markdown se siga viendo igual.

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MarkdownLite } from './MarkdownLite'

const html = (text: string) => renderToStaticMarkup(<MarkdownLite text={text} />)

describe('MarkdownLite', () => {
  it('renderiza negrita, cursiva y código inline', () => {
    const out = html('La **carga interna** se mide con `sRPE`. Ver *J Strength Cond Res*.')
    expect(out).toContain('<strong')
    expect(out).toContain('carga interna</strong>')
    expect(out).toContain('<code')
    expect(out).toContain('<em>J Strength Cond Res</em>')
  })

  it('no confunde asteriscos aritméticos con cursiva', () => {
    const out = html('Calcula 5 * 3 * 2 y 2*3*4.')
    expect(out).not.toContain('<em>')
    expect(out).toContain('5 * 3 * 2')
  })

  it('agrupa listas con viñetas y numeradas', () => {
    const ul = html('- uno\n- dos')
    expect(ul).toContain('<ul')
    expect(ul.match(/<li>/g)).toHaveLength(2)
    const ol = html('1. paso a\n2. paso b')
    expect(ol).toContain('<ol')
  })

  it('mezcla un párrafo con una lista del mismo bloque', () => {
    const out = html('Puntos clave:\n- **uno**\n- dos')
    expect(out).toContain('Puntos clave:')
    expect(out).toContain('<ul')
    expect(out).toContain('<strong')
  })

  it('renderiza tablas', () => {
    const out = html('| A | B |\n|---|---|\n| **1** | 2 |')
    expect(out).toContain('<table')
    expect(out).toContain('<th')
    expect(out).toContain('<td')
  })

  it('el contenido plano antiguo se ve igual que antes (saltos de línea conservados)', () => {
    const out = html('Línea uno\nLínea dos\n\nOtro párrafo')
    expect(out.match(/<p/g)).toHaveLength(2)
    expect(out).toContain('whitespace-pre-line')
  })

  describe('seguridad', () => {
    it('escapa HTML inyectado (nunca lo interpreta)', () => {
      const out = html('Hola <script>alert(1)</script> y <img src=x onerror=alert(1)>')
      expect(out).not.toContain('<script')
      expect(out).not.toContain('<img')
      expect(out).toContain('&lt;script&gt;')
    })

    it('descarta enlaces javascript: y data:', () => {
      const out = html('[clic](javascript:alert(1)) y [x](data:text/html;base64,AAA)')
      expect(out).not.toMatch(/href="javascript:/i)
      expect(out).not.toMatch(/href="data:/i)
    })

    it('acepta http(s), mailto y rutas internas; los externos abren sin referrer ni opener', () => {
      const out = html('[a](https://pubmed.ncbi.nlm.nih.gov/1/) [b](mailto:x@y.com) [c](/explorar)')
      expect(out).toContain('href="https://pubmed.ncbi.nlm.nih.gov/1/"')
      expect(out).toContain('rel="noopener noreferrer"')
      expect(out).toContain('href="mailto:x@y.com"')
      expect(out).toContain('href="/explorar"')
    })

    it('rechaza URLs relativas al protocolo (//evil.com)', () => {
      expect(html('[x](//evil.com/p)')).not.toContain('href="//evil.com')
    })
  })
})
