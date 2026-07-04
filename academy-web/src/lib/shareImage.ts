// Utilidad de "compartir como imagen": rasteriza un nodo del DOM a PNG y lo
// entrega vía el share sheet nativo (Web Share API con archivos) o, si el
// navegador no lo soporta, como descarga directa. La usan el certificado
// (CertificatesPage) y la insignia (ShareBadgeModal) — mismo patrón visual
// que WorkoutShareCard en mobile, adaptado a web sin librerías nativas.

import { toPng } from 'html-to-image'

export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled'

async function captureNodeAsPngFile(
  node: HTMLElement,
  filename: string,
  excludeClass?: string,
): Promise<File> {
  const dataUrl = await toPng(node, {
    // Densidad alta para que la imagen se vea nítida al subirla a una red social.
    pixelRatio: 3,
    cacheBust: true,
    filter: excludeClass
      ? (n) => !(n instanceof HTMLElement && n.classList.contains(excludeClass))
      : undefined,
  })
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], filename, { type: 'image/png' })
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Rasteriza `node` a PNG y lo comparte con el share sheet nativo (si el
 * navegador soporta compartir archivos) o lo descarga.
 *
 * @param excludeClass clase CSS de nodos hijos a excluir de la captura (p. ej.
 *   los propios botones de acción, cuando viven dentro del nodo capturado).
 */
export async function shareOrDownloadCard(
  node: HTMLElement,
  opts: { filename: string; title: string; text?: string; excludeClass?: string },
): Promise<ShareImageResult> {
  const file = await captureNodeAsPngFile(node, opts.filename, opts.excludeClass)
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: opts.title, text: opts.text })
      return 'shared'
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled'
      // Cualquier otro fallo del share sheet cae a la descarga.
    }
  }
  downloadFile(file)
  return 'downloaded'
}
