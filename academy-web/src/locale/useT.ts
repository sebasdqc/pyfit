// Hook de traducción de la UI. `t('namespace.clave')` busca la ruta con
// puntos en el diccionario del idioma activo; si falta (en.ts tiene huecos a
// propósito, ver dictionaries/en.ts), cae al español, y si tampoco existe
// ahí, devuelve la clave cruda (ayuda a detectar claves mal escritas en dev).
// Soporta interpolación simple `{{var}}` para casos como "Hola, {{nombre}}".
import { useCallback } from 'react'
import { useLocale } from './useLocale'
import es from './dictionaries/es'
import en from './dictionaries/en'

type Vars = Record<string, string | number>

function lookup(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, dict)
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key]
    return value === undefined ? match : String(value)
  })
}

export function useT() {
  const { locale } = useLocale()

  return useCallback(
    (path: string, vars?: Vars): string => {
      const dict = locale === 'en' ? en : es
      const value = lookup(dict, path) ?? lookup(es, path) ?? path
      return typeof value === 'string' ? interpolate(value, vars) : path
    },
    [locale],
  )
}
