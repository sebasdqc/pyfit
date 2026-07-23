/**
 * i18n.tsx — Contexto global de idioma para Zyfit
 *
 * Patron idéntico a theme.tsx: contexto React + SecureStore para persistencia.
 * Proveedor: I18nProvider (envuelve el árbol en _layout.tsx)
 * Consumidor: useTranslation() hook → { lang, setLang, toggleLang, t, ta }
 *
 * t('key')  → string traducida al idioma activo
 * ta('key') → string[] para claves de array (meses, días)
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { getLocales } from 'expo-localization'
import {
  Lang,
  TranslationKey,
  getTranslation,
  getTranslationArray,
} from './translations'

const SUPPORTED_LANGS: Lang[] = ['es', 'en', 'pt', 'fr']

// Idioma del dispositivo si es uno de los soportados; 'es' si no (default histórico).
function detectDeviceLang(): Lang {
  const code = getLocales()[0]?.languageCode
  return (SUPPORTED_LANGS as string[]).includes(code ?? '') ? (code as Lang) : 'es'
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ArrayKey = 'historial_months' | 'historial_days_abbr' | 'stats_months' | 'coach_dias_abbr'
  | 'onboarding_deportes_labels' | 'onboarding_ejercicios_labels' | 'onboarding_condiciones_labels'
  | 'dashboard_frases'
export type ScalarKey = Exclude<TranslationKey, ArrayKey>

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  toggleLang: () => void
  t: (key: ScalarKey) => string
  ta: (key: ArrayKey) => string[]
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue>({
  lang: 'es',
  setLang: () => {},
  toggleLang: () => {},
  t: (k) => k as string,
  ta: () => [],
})

// ─── Proveedor ────────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Antes de leer la preferencia guardada, usamos el idioma del dispositivo
  // (si es uno soportado) en vez de asumir español a secas.
  const [lang, setLangState] = useState<Lang>(detectDeviceLang)

  // Carga el idioma guardado al arrancar la app (una preferencia explícita del
  // usuario siempre gana sobre el idioma del dispositivo).
  useEffect(() => {
    SecureStore.getItemAsync('app_lang')
      .then(val => {
        if (val === 'es' || val === 'en' || val === 'pt' || val === 'fr') {
          setLangState(val as Lang)
        }
      })
      .catch(() => {})
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    SecureStore.setItemAsync('app_lang', l).catch(() => {})
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'es' ? 'en' : lang === 'en' ? 'pt' : lang === 'pt' ? 'fr' : 'es')
  }, [lang, setLang])

  const t = useCallback(
    (key: ScalarKey): string => getTranslation(key, lang),
    [lang],
  )

  const ta = useCallback(
    (key: ArrayKey): string[] => getTranslationArray(key, lang),
    [lang],
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, ta }}>
      {children}
    </I18nContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext)
}
