// ─── Fotos de sesión (gym + running) ───────────────────────────────────────────
// Sube la foto como dataURI base64 (mismo transporte que el avatar; api.ts es JSON).
// El backend la decodifica y la guarda en DO Spaces (o disco local si no hay Spaces).

import { apiPost, apiDelete } from './api'

export interface SessionPhoto {
  id: number
  url: string | null     // URL (firmada/temporal con Spaces)
  created_at: string
}

export async function uploadSessionPhoto(
  kind: 'gym' | 'run',
  sessionId: number,
  dataUri: string,
): Promise<SessionPhoto> {
  const path = kind === 'run'
    ? `/api/runs/${sessionId}/photos/`
    : `/api/sessions/${sessionId}/photos/`
  return apiPost(path, { image: dataUri })
}

export async function deleteSessionPhoto(id: number): Promise<void> {
  await apiDelete(`/api/session-photos/${id}/`)
}
