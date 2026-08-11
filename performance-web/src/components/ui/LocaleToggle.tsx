// Toggle de idioma (es/en) de las páginas públicas — reemplaza el botón de
// globo placeholder que antes no hacía nada en PublicHeader. Mismo criterio
// que el LocaleToggle de academy-web: muestra el destino del clic (si estás
// en español, muestra "EN" y viceversa).
import { useLocale } from '@/locale/useLocale'

export function LocaleToggle({ className = '' }: { className?: string }) {
  const { locale, toggleLocale } = useLocale()
  const target = locale === 'en' ? 'es' : 'en'

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={target === 'en' ? 'Switch to English' : 'Cambiar a español'}
      title={target === 'en' ? 'Switch to English' : 'Cambiar a español'}
      className={
        'flex h-9 min-w-9 items-center justify-center rounded-lg text-[11px] font-semibold uppercase tracking-wide text-white/50 transition-colors hover:text-white ' +
        className
      }
    >
      {target.toUpperCase()}
    </button>
  )
}
