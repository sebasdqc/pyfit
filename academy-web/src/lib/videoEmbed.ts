// Convierte una URL de video (YouTube / Vimeo) en su URL embebible (iframe).
// Devuelve null si no se reconoce el proveedor → la UI muestra un enlace directo.

export function toEmbedUrl(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const m = u.pathname.match(/\/(embed|shorts)\/([\w-]+)/)
      if (m) return `https://www.youtube.com/embed/${m[2]}`
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
    if (host === 'player.vimeo.com') return url
  } catch {
    // no es una URL válida
  }
  return null
}
