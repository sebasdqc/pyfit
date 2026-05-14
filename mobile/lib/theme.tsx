import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { DARK_COLORS, LIGHT_COLORS, Colors } from './colors'

interface ThemeContextValue {
  isDark: boolean
  colors: Colors
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    SecureStore.getItemAsync('app_theme')
      .then(val => { if (val === 'light') setIsDark(false) })
      .catch(() => {})
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      SecureStore.setItemAsync('app_theme', next ? 'dark' : 'light').catch(() => {})
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK_COLORS : LIGHT_COLORS, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
