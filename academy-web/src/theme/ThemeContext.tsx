// Contexto de tema (claro/oscuro) del shell autenticado de Academy. El toggle vive
// en el Topbar; la elección se recuerda en localStorage y gana siempre sobre la
// preferencia del sistema. Sin elección explícita, sigue prefers-color-scheme y se
// mantiene reactivo a cambios en vivo del SO.
//
// A propósito NO se aplica en <html>: el atributo `data-theme` lo estampan
// AppLayout y LessonPlayerPage en su propio nodo raíz, así el modo oscuro queda
// contenido al shell autenticado (páginas públicas — landing/login/registro/
// explorar — comparten algunas clases utilitarias como `.za-card` y deben
// mantenerse siempre claras).

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'za-theme'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme)

  // Mientras el usuario no elija explícitamente, sigue los cambios en vivo del SO.
  useEffect(() => {
    if (readStoredTheme()) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Sin localStorage (privado/bloqueado): el tema sigue funcionando en memoria.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
