// Selector de país del onboarding.
//
// Un <select> nativo con ~190 opciones obliga a scrollear a ciegas, y una
// grilla de tarjetas no escala a esa cantidad. Un combobox con búsqueda
// resuelve las dos cosas: se escribe y se filtra, o se navega con flechas.
// Sigue el patrón ARIA de combobox con listbox (aria-expanded / aria-controls /
// aria-activedescendant), así que funciona con teclado y con lector de pantalla.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/locale/useLocale'
import {
  PAISES_PRIORITARIOS,
  listarPaisesConPrioridad,
  nombreDePais,
  normalizar,
  type Pais,
} from '@/lib/countries'

export function CountryCombobox({
  valor,
  onChange,
  label,
  placeholder,
  sinResultados,
  etiquetaSugeridos,
  etiquetaTodos,
}: {
  valor: string
  onChange: (code: string) => void
  label: string
  placeholder: string
  sinResultados: string
  etiquetaSugeridos: string
  etiquetaTodos: string
}) {
  const { locale } = useLocale()
  const idBase = useId()
  const idInput = `${idBase}-input`
  const idLista = `${idBase}-lista`

  const [consulta, setConsulta] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  const todos = useMemo(() => listarPaisesConPrioridad(locale), [locale])

  const resultados = useMemo(() => {
    const q = normalizar(consulta)
    if (!q) return todos
    return todos.filter((p) => normalizar(p.nombre).includes(q))
  }, [todos, consulta])

  // Clic fuera: cierra y descarta lo tipeado (el valor elegido no se toca).
  useEffect(() => {
    if (!abierto) return
    function alClicFuera(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setAbierto(false)
        setConsulta('')
      }
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [abierto])

  // Mantiene la opción activa a la vista al navegar con flechas.
  useEffect(() => {
    if (!abierto) return
    const el = listaRef.current?.querySelector<HTMLElement>('[data-activo="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [activo, abierto])

  const nombreElegido = valor ? nombreDePais(valor, locale) : ''

  function elegir(p: Pais) {
    onChange(p.code)
    setConsulta('')
    setAbierto(false)
  }

  function alTeclear(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!abierto) {
        setAbierto(true)
        return
      }
      if (resultados.length === 0) return
      const paso = e.key === 'ArrowDown' ? 1 : -1
      setActivo((i) => (i + paso + resultados.length) % resultados.length)
      return
    }
    if (e.key === 'Home' && abierto) {
      e.preventDefault()
      setActivo(0)
      return
    }
    if (e.key === 'End' && abierto) {
      e.preventDefault()
      setActivo(Math.max(0, resultados.length - 1))
      return
    }
    if (e.key === 'Enter') {
      if (abierto && resultados[activo]) {
        e.preventDefault()
        elegir(resultados[activo])
      }
      return
    }
    if (e.key === 'Escape') {
      if (abierto) {
        // Solo cierra la lista: Escape no debe borrar el país ya elegido.
        e.stopPropagation()
        setAbierto(false)
        setConsulta('')
      }
    }
  }

  // Con el buscador vacío la lista arranca por los países del mercado real;
  // apenas se escribe algo, ese agrupamiento pierde sentido y desaparece.
  const mostrarGrupos = !consulta
  const corteSugeridos = PAISES_PRIORITARIOS.length

  return (
    <div ref={contenedorRef} className="relative">
      <label htmlFor={idInput} className="block text-xs font-medium text-white/60">
        {label}
      </label>
      <input
        id={idInput}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={
          abierto && resultados[activo] ? `${idBase}-op-${resultados[activo].code}` : undefined
        }
        autoComplete="off"
        value={abierto ? consulta : nombreElegido}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          setConsulta(e.target.value)
          setAbierto(true)
          // La lista filtrada cambia: el índice activo vuelve al principio o
          // quedaría apuntando a una opción que ya no está.
          setActivo(0)
        }}
        onKeyDown={alTeclear}
        className="mt-1.5 w-full rounded-xl border border-perf-border bg-perf-bg px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent"
      />

      {abierto && (
        <ul
          ref={listaRef}
          id={idLista}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-xl border border-perf-border bg-perf-surface py-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
        >
          {resultados.length === 0 && (
            <li className="px-4 py-3 text-sm text-white/55">{sinResultados}</li>
          )}

          {resultados.map((p, i) => {
            const esActivo = i === activo
            const elegido = p.code === valor
            // Encabezados de grupo, solo con el buscador vacío.
            const encabezado =
              mostrarGrupos && i === 0
                ? etiquetaSugeridos
                : mostrarGrupos && i === corteSugeridos
                  ? etiquetaTodos
                  : null

            return (
              <li key={p.code}>
                {encabezado && (
                  <p
                    aria-hidden
                    className="px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                  >
                    {encabezado}
                  </p>
                )}
                <div
                  id={`${idBase}-op-${p.code}`}
                  role="option"
                  aria-selected={elegido}
                  data-activo={esActivo}
                  onMouseEnter={() => setActivo(i)}
                  onMouseDown={(e) => {
                    // mousedown, no click: evita que el blur del input cierre la
                    // lista antes de que se registre la elección.
                    e.preventDefault()
                    elegir(p)
                  }}
                  className={[
                    'flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition-colors',
                    esActivo ? 'bg-accent/[0.12] text-white' : 'text-white/80',
                  ].join(' ')}
                >
                  <span>{p.nombre}</span>
                  {elegido && (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-accent" fill="none" aria-hidden>
                      <path
                        d="M2.5 6.2 4.8 8.5 9.5 3.8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
