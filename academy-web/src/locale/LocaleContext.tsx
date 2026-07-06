// Contexto de idioma (es/en) de TODA la app — a diferencia del tema (que es
// deliberadamente solo del shell autenticado, ver theme/ThemeContext.tsx), el
// idioma tiene que ser global desde la primera página pública que ve un
// visitante extranjero (Landing, Login, Explorar, Legal): por eso no hay
// ningún atributo de DOM que "escapar" aquí, el locale solo decide qué string
// devuelve `t()` y qué campo localizado usa el cliente HTTP (header
// X-Locale, ver api/client.ts).
//
// La elección se recuerda en localStorage y gana siempre sobre el idioma del
// navegador; sin elección explícita, sigue `navigator.language`.

import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'es' | 'en'

export const STORAGE_KEY = 'za-locale'

export interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const LocaleContext = createContext<LocaleContextValue | null>(null)

function browserPrefersEnglish(): boolean {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')
}

function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'es' || stored === 'en' ? stored : null
  } catch {
    return null
  }
}

function resolveInitialLocale(): Locale {
  return readStoredLocale() ?? (browserPrefersEnglish() ? 'en' : 'es')
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Sin localStorage (privado/bloqueado): el idioma sigue funcionando en memoria.
    }
  }, [])

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'es' : 'en')
  }, [locale, setLocale])

  const value = useMemo(() => ({ locale, setLocale, toggleLocale }), [locale, setLocale, toggleLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
