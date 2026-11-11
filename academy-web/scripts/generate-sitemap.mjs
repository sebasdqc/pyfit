// Genera dist/sitemap.xml al final del build con las páginas públicas REALES:
// las estáticas + cada curso del catálogo anónimo + cada post publicado del blog.
//
// Es una SPA estática, así que el sitemap solo se refresca en cada deploy (un
// curso o post nuevo aparece tras el siguiente build). Un sitemap tiene que vivir
// en el mismo host que sus URLs, por eso se genera aquí y no en el backend.
//
// Nunca rompe el build: si la API no responde, se conserva el sitemap estático
// de public/ (ya copiado a dist/ por Vite) y se avisa por consola.

import { writeFile } from 'node:fs/promises'

const SITE = (process.env.VITE_SITE_URL || 'https://zyfit-academy-e8r4w.ondigitalocean.app').replace(/\/$/, '')
const API = `${(process.env.VITE_API_URL || 'https://sea-lion-app-a2j4f.ondigitalocean.app').replace(/\/$/, '')}/api`
const OUT = new URL('../dist/sitemap.xml', import.meta.url)

const ESTATICAS = [
  ['/', 'weekly', '1.0'],
  ['/explorar', 'weekly', '0.9'],
  ['/blog', 'weekly', '0.8'],
  ['/login', 'monthly', '0.3'],
  ['/registro', 'monthly', '0.5'],
  ['/terminos', 'yearly', '0.2'],
  ['/privacidad', 'yearly', '0.2'],
]

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const dia = (iso) => (iso ? String(iso).slice(0, 10) : '')

async function getJson(path) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(`${API}${path}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return Array.isArray(data) ? data : (data.results ?? [])
  } finally {
    clearTimeout(t)
  }
}

const urls = ESTATICAS.map(([loc, changefreq, priority]) => ({ loc: `${SITE}${loc}`, changefreq, priority }))
let dinamicas = 0

for (const [nombre, path, armar] of [
  ['cursos', '/academy/anon/catalogo/', (c) => ({ loc: `${SITE}/explorar/cursos/${c.id}`, lastmod: dia(c.updated_at), changefreq: 'monthly', priority: '0.7' })],
  ['blog', '/academy/blog/', (p) => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: dia(p.updated_at || p.publicado_en), changefreq: 'monthly', priority: '0.6' })],
]) {
  try {
    const items = await getJson(path)
    for (const it of items) urls.push(armar(it))
    dinamicas += items.length
    console.log(`sitemap: ${items.length} ${nombre}`)
  } catch (err) {
    console.warn(`sitemap: no se pudieron traer los ${nombre} (${err.message}); se omiten.`)
  }
}

if (dinamicas === 0) {
  console.warn('sitemap: sin datos dinámicos; se conserva el sitemap estático de public/.')
  process.exit(0)
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${esc(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`
await writeFile(OUT, xml, 'utf-8')
console.log(`sitemap: ${urls.length} URLs escritas en dist/sitemap.xml`)
