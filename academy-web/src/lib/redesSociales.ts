// Metadata de las redes soportadas en "Datos personales" — compartida entre
// ProfilePage y el onboarding. Debe reflejar _REDES_SOCIALES_KEYS del backend
// (backend/academy/views.py) o el PATCH descarta silenciosamente la clave.
export const REDES_SOCIALES = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@usuario' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/…' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: '@usuario' },
  { key: 'sitio_web', label: 'Sitio web', placeholder: 'https://…' },
] as const
