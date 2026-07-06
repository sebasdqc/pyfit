// Raíz de la app: LocaleProvider el idioma (global — también en páginas
// públicas, a diferencia del tema), TenantProvider carga el branding del
// dominio activo antes del login, AuthProvider gestiona la sesión JWT,
// ThemeProvider el claro/oscuro del shell autenticado, RouterProvider la
// navegación.
// (La academia no usa React Query; las pantallas usan axios + useState/useEffect.)

import { RouterProvider } from 'react-router-dom'
import { TenantProvider } from '@/tenant/TenantContext'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeProvider } from '@/theme/ThemeContext'
import { LocaleProvider } from '@/locale/LocaleContext'
import { router } from '@/router'

export function App() {
  return (
    <LocaleProvider>
      <TenantProvider>
        <AuthProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
          </ThemeProvider>
        </AuthProvider>
      </TenantProvider>
    </LocaleProvider>
  )
}
