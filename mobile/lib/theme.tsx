import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { DARK_COLORS, LIGHT_COLORS, PINK_COLORS, MIDNIGHT_COLORS, SAND_COLORS, FOREST_COLORS, NEON_COLORS, Colors } from './colors'

export type Palette = 'dark' | 'light' | 'rosado' | 'midnight' | 'sand' | 'forest' | 'neon'

const PALETTE_COLORS: Record<Palette, Colors> = {
  dark:     DARK_COLORS,
  light:    LIGHT_COLORS,
  rosado:   PINK_COLORS,
  midnight: MIDNIGHT_COLORS,
  sand:     SAND_COLORS,
  forest:   FOREST_COLORS,
  neon:     NEON_COLORS,
}

interface ThemeContextValue {
  palette: Palette
  isDark: boolean
  colors: Colors
  setPalette: (p: Palette) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  palette: 'dark',
  isDark: true,
  colors: DARK_COLORS,
  setPalette: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>('dark')

  useEffect(() => {
    SecureStore.getItemAsync('app_palette')
      .then(val => {
        if (val === 'light' || val === 'rosado' || val === 'dark' || val === 'midnight' || val === 'sand' || val === 'forest' || val === 'neon') {
          setPaletteState(val)
        } else if (val === null) {
          // legacy key
          SecureStore.getItemAsync('app_theme').then(old => {
            if (old === 'light') setPaletteState('light')
          }).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const setPalette = useCallback((p: Palette) => {
    setPaletteState(p)
    SecureStore.setItemAsync('app_palette', p).catch(() => {})
  }, [])

  const toggleTheme = useCallback(() => {
    setPalette(palette === 'light' ? 'dark' : 'light')
  }, [palette, setPalette])

  return (
    <ThemeContext.Provider value={{
      palette,
      // dark, midnight, sand, forest y neon son oscuros; light y rosado son claros.
      isDark: palette === 'dark' || palette === 'midnight' || palette === 'sand' || palette === 'forest' || palette === 'neon',
      colors: PALETTE_COLORS[palette],
      setPalette,
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
