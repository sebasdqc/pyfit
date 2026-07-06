// Toggle de idioma (es/en). Mismo tratamiento visual que el toggle de tema en
// Topbar.tsx: un botón que, como el de sol/luna, muestra el destino del clic
// (si estás en español, muestra "EN" — un clic te lleva a inglés — y viceversa).
// A diferencia del tema, este toggle se usa TANTO en el shell autenticado
// (Topbar) como en cada página pública (Landing/Login/Explorar/Legal…), ya
// que el idioma debe estar disponible desde la primera pantalla que ve un
// visitante extranjero.
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
        'flex h-10 min-w-10 items-center justify-center rounded-lg border border-surface-border ' +
        'bg-surface px-2 text-xs font-semibold tracking-wide text-ink-soft transition-colors ' +
        'hover:bg-surface-soft hover:text-ink ' + className
      }
    >
      {target.toUpperCase()}
    </button>
  )
}
