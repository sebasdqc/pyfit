// Procesa una imagen elegida por el usuario y la convierte en un data URL
// cuadrado y reducido, apto para guardar como avatar en localStorage (esta fase
// aún no tiene almacenamiento de archivos en el backend). Recorta al centro y
// reescala a MAX px en JPEG, de modo que cada foto pesa ~20–40 KB y no agota la
// cuota de localStorage. Cuando exista un endpoint de subida, se reemplaza por
// una llamada a la API que devuelva la URL del archivo.

const MAX = 256 // lado del avatar en px
const QUALITY = 0.82 // calidad JPEG
const MAX_INPUT_BYTES = 12 * 1024 * 1024 // 12 MB de archivo de entrada

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG o PNG).')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('La imagen es demasiado grande (máx. 12 MB).')
  }

  const img = await loadImage(file)
  // Recorte cuadrado centrado.
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = MAX
  canvas.height = MAX
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX, MAX)

  return canvas.toDataURL('image/jpeg', QUALITY)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}
