import { describe, expect, it } from 'vitest'
import { toEmbedUrl } from './videoEmbed'

describe('toEmbedUrl', () => {
  it('convierte YouTube en todas sus formas', () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=abc123')).toBe('https://www.youtube.com/embed/abc123')
    expect(toEmbedUrl('https://youtu.be/abc123')).toBe('https://www.youtube.com/embed/abc123')
    expect(toEmbedUrl('https://www.youtube.com/shorts/abc123')).toBe('https://www.youtube.com/embed/abc123')
  })

  it('convierte Vimeo', () => {
    expect(toEmbedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789')
  })

  it('devuelve null para otros hosts, archivos directos y texto no URL', () => {
    expect(toEmbedUrl('https://cdn.ejemplo.com/video.mp4')).toBeNull()
    expect(toEmbedUrl('https://evil.com/watch?v=abc')).toBeNull()
    expect(toEmbedUrl('no es una url')).toBeNull()
    expect(toEmbedUrl('')).toBeNull()
  })
})
