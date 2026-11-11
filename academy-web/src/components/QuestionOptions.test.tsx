import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { QuestionOptions } from './QuestionOptions'

const OPCIONES = [{ id: 'a', texto: 'Uno' }, { id: 'b', texto: 'Dos' }]
const base = { name: 'q', legend: '¿Cuál?', opciones: OPCIONES, value: [] as string[], onChange: () => {} }

describe('QuestionOptions', () => {
  it('opción única y verdadero/falso usan radios; múltiple usa casillas', () => {
    expect(renderToStaticMarkup(<QuestionOptions {...base} tipo="opcion_unica" />)).toContain('type="radio"')
    expect(renderToStaticMarkup(<QuestionOptions {...base} tipo="verdadero_falso" />)).toContain('type="radio"')
    expect(renderToStaticMarkup(<QuestionOptions {...base} tipo="opcion_multiple" />)).toContain('type="checkbox"')
  })

  it('usa fieldset y leyenda con la pregunta (accesibilidad)', () => {
    const out = renderToStaticMarkup(<QuestionOptions {...base} tipo="opcion_unica" />)
    expect(out).toContain('<fieldset')
    expect(out).toContain('<legend')
    expect(out).toContain('¿Cuál?')
  })

  it('marca la selección del alumno', () => {
    const out = renderToStaticMarkup(<QuestionOptions {...base} tipo="opcion_unica" value={['b']} />)
    expect(out.match(/checked=""/g)).toHaveLength(1)
  })

  it('sin `correctas` NO revela cuál es la correcta (la clave solo llega tras responder)', () => {
    const out = renderToStaticMarkup(<QuestionOptions {...base} tipo="opcion_unica" value={['a']} />)
    expect(out).not.toContain('✓')
    expect(out).not.toContain('border-ok')
  })

  it('con `correctas` (ya respondida) resalta la correcta y el error del alumno', () => {
    const out = renderToStaticMarkup(
      <QuestionOptions {...base} tipo="opcion_unica" value={['a']} correctas={['b']} disabled />,
    )
    expect(out).toContain('✓')
    expect(out).toContain('border-ok')
    expect(out).toContain('border-danger')
  })
})
