// Raíz de la app: provider de autenticación + router. (La academia no usa
// React Query; las pantallas piden datos con el cliente axios y useState/useEffect.)

import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { router } from '@/router'

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
