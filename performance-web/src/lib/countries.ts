// Catálogo de países del onboarding.
//
// Guardamos el código ISO 3166-1 alfa-2 y resolvemos el nombre visible con
// `Intl.DisplayNames` en el idioma activo: así no hay que mantener (ni
// traducir) una tabla de ~200 nombres en el repo ni en el backend, y el
// listado sale siempre en el idioma del panel.

// Países de habla hispana + Brasil: son el mercado real de Zyfit Performance,
// así que encabezan la lista cuando el buscador está vacío. No es un juicio
// sobre el resto — es que la primera pantalla debe resolver el caso del 90%
// sin obligar a escribir.
export const PAISES_PRIORITARIOS = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV',
  'ES', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'UY', 'VE',
] as const

// Resto del mundo (ISO 3166-1 alfa-2). El orden acá es indistinto: se ordena
// alfabéticamente ya traducido, en tiempo de render.
const PAISES_RESTANTES = [
  'AD', 'AE', 'AF', 'AG', 'AL', 'AM', 'AO', 'AT', 'AU', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BN',
  'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF', 'CG', 'CH',
  'CI', 'CM', 'CN', 'CV', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DZ',
  'EE', 'EG', 'ER', 'ET', 'FI', 'FJ', 'FR', 'GA', 'GB', 'GD',
  'GE', 'GH', 'GM', 'GN', 'GQ', 'GR', 'GW', 'GY', 'HK', 'HR',
  'HT', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ', 'IR', 'IS', 'IT',
  'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KM', 'KN', 'KP', 'KR',
  'KW', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT',
  'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MR', 'MT', 'MU', 'MV', 'MW', 'MY', 'MZ',
  'NA', 'NE', 'NG', 'NL', 'NO', 'NP', 'NZ', 'OM', 'PG', 'PH',
  'PK', 'PL', 'PS', 'PT', 'QA', 'RO', 'RS', 'RU', 'RW', 'SA',
  'SB', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SM', 'SN',
  'SO', 'SR', 'SS', 'ST', 'SY', 'SZ', 'TD', 'TG', 'TH', 'TJ',
  'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TW', 'TZ', 'UA', 'UG',
  'US', 'UZ', 'VC', 'VN', 'VU', 'WS', 'XK', 'YE', 'ZA', 'ZM', 'ZW',
]

export const TODOS_LOS_PAISES: string[] = [...PAISES_PRIORITARIOS, ...PAISES_RESTANTES]

export interface Pais {
  code: string
  nombre: string
}

// `Intl.DisplayNames` existe en todos los navegadores actuales; si faltara,
// caemos al código para no romper el paso (mejor "AR" que una lista vacía).
function crearResolver(locale: string): (code: string) => string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' })
    return (code) => dn.of(code) ?? code
  } catch {
    return (code) => code
  }
}

// Normaliza para buscar: minúsculas y sin acentos, para que "peru" encuentre
// "Perú" y "turquia" encuentre "Turquía".
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

// Lista completa, traducida y ordenada alfabéticamente en el idioma activo.
export function listarPaises(locale: string): Pais[] {
  const nombreDe = crearResolver(locale)
  return TODOS_LOS_PAISES
    .map((code) => ({ code, nombre: nombreDe(code) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, locale))
}

// Los prioritarios primero (en su propio orden alfabético), luego el resto:
// es lo que se muestra cuando el buscador está vacío.
export function listarPaisesConPrioridad(locale: string): Pais[] {
  const nombreDe = crearResolver(locale)
  const prioritarios = new Set<string>(PAISES_PRIORITARIOS)
  const mapear = (code: string) => ({ code, nombre: nombreDe(code) })
  const ordenar = (a: Pais, b: Pais) => a.nombre.localeCompare(b.nombre, locale)
  return [
    ...PAISES_PRIORITARIOS.map(mapear).sort(ordenar),
    ...TODOS_LOS_PAISES.filter((c) => !prioritarios.has(c)).map(mapear).sort(ordenar),
  ]
}

export function nombreDePais(code: string, locale: string): string {
  if (!code) return ''
  return crearResolver(locale)(code)
}
